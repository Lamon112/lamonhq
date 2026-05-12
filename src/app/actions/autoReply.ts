"use server";

/**
 * Auto-reply poller — runs from Inngest cron every 5 min.
 *
 * What it does:
 *   1. Reads gmail OAuth tokens from `integrations` (provider=gmail).
 *   2. Lists inbox messages from last 24h, excluding self-sent.
 *   3. For each candidate, fetches full message + parses sender email.
 *   4. Matches sender to an outreach row's recipient (via outreach.message
 *      JSON body containing the email, or via leads.email join).
 *   5. Dedups by checking inbound_messages.external_message_id (Gmail ID).
 *   6. Calls Anthropic to triage + draft 2 replies (via triageInbound logic).
 *   7. Inserts inbound_messages row with status='new', drafts ready.
 *   8. Fires Jarvis push.
 *
 * The cron sweeps all users with active Gmail integration.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSbAdminClient } from "@supabase/supabase-js";
import {
  listInboxMessages,
  getMessage,
  parseEmailAddress,
  refreshAccessToken,
} from "@/lib/gmail";
import { pushTelegramNotification } from "./telegram";
import Anthropic from "@anthropic-ai/sdk";

interface GmailConfig {
  email: string;
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface PollResult {
  ok: boolean;
  userId?: string;
  processed: number;
  triaged: number;
  skipped: number;
  error?: string;
}

// Same triage prompt as inbound.ts — kept inline so the auto-poller
// doesn't import a "use server" function that wants user-auth context.
const TRIAGE_SYSTEM_PROMPT = `Ti si AI Inbox Triage za Leonardo Lamon (Lamon Agency).

Prima ti incoming email od klinike/coacha kao odgovor na cold outreach.
Tvoj zadatak: KLASIFICIRAJ + GENERIRAJ 2 reply drafte (hrvatski, premium tone).

# Kategorije (odaberi JEDNU):
- interested · objection · scheduling · question · not_now · unsubscribe · out_of_office · unclear

# Pravila za drafte:
1. **2 varijante** s različitim angle-om (concise vs value reinforcement)
2. **Maksimum 4 retka** po draftu
3. **Hrvatski jezik**, peer-to-peer, premium tone
4. CTA mora eksplicitno predložiti zakazivanje 15-min poziva (NIKAD implicitno)
5. Potpis: — Leonardo
6. NIKAD ne pokušavaj rescue na unsubscribe
7. NE koristi engleske termine ako postoji hrvatski ekvivalent

# Format izlaza — STRIKT JSON, bez markdown:
{
  "category": "...",
  "summary": "...",
  "suggested_stage": "...",
  "reply_drafts": [
    {"angle": "...", "text": "..."},
    {"angle": "...", "text": "..."}
  ],
  "reasoning": "..."
}`;

interface ParsedTriage {
  category: string;
  summary: string;
  suggested_stage: string | null;
  reply_drafts: { angle: string; text: string }[];
  reasoning: string;
}

function parseTriage(raw: string): ParsedTriage | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ParsedTriage;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as ParsedTriage;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Build an admin Supabase client that bypasses RLS — needed for the
 * cron path where there's no user session. Cron runs server-to-server.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not set — cannot run auto-reply poller",
    );
  }
  return createSbAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Ensure access token is fresh; refresh if expired. Returns the
 * up-to-date config so callers can use it directly.
 */
async function ensureFreshToken(
  cfg: GmailConfig,
  userId: string,
): Promise<{ ok: boolean; cfg?: GmailConfig; error?: string }> {
  const now = Date.now();
  const expired = !cfg.expiry_date || cfg.expiry_date <= now + 60_000;
  if (!expired && cfg.access_token) return { ok: true, cfg };

  if (!cfg.refresh_token) {
    return { ok: false, error: "no refresh token — user must reconnect" };
  }
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Google OAuth env vars missing" };
  }
  const refreshed = await refreshAccessToken({
    refreshToken: cfg.refresh_token,
    clientId,
    clientSecret,
  });
  if (!refreshed.ok || !refreshed.tokens) {
    return { ok: false, error: refreshed.error ?? "token refresh failed" };
  }
  const updated: GmailConfig = {
    ...cfg,
    access_token: refreshed.tokens.access_token,
    expiry_date: refreshed.tokens.expiry_date,
  };
  // Persist refreshed tokens
  const supa = adminClient();
  await supa
    .from("integrations")
    .update({ config: updated })
    .eq("provider", "gmail")
    .eq("user_id", userId);
  return { ok: true, cfg: updated };
}

/**
 * Poll a single user's Gmail inbox and auto-triage any reply we haven't
 * seen yet. Returns counts for monitoring.
 */
export async function pollUserInbox(userId: string): Promise<PollResult> {
  const supa = adminClient();

  // 1. Fetch Gmail integration config for this user
  const { data: integ } = await supa
    .from("integrations")
    .select("config")
    .eq("provider", "gmail")
    .eq("user_id", userId)
    .maybeSingle();
  if (!integ?.config) {
    return { ok: false, userId, processed: 0, triaged: 0, skipped: 0, error: "no gmail integration" };
  }
  const cfgRaw = integ.config as GmailConfig;
  const fresh = await ensureFreshToken(cfgRaw, userId);
  if (!fresh.ok || !fresh.cfg) {
    return { ok: false, userId, processed: 0, triaged: 0, skipped: 0, error: fresh.error };
  }
  const cfg = fresh.cfg;

  // 2. List candidate inbox messages (last 24h, not self-sent)
  const listed = await listInboxMessages({
    accessToken: cfg.access_token,
    query: "in:inbox newer_than:1d -from:me",
    maxResults: 30,
  });
  if (!listed.ok || !listed.messages) {
    return {
      ok: false,
      userId,
      processed: 0,
      triaged: 0,
      skipped: 0,
      error: listed.error ?? "list failed",
    };
  }

  if (listed.messages.length === 0) {
    return { ok: true, userId, processed: 0, triaged: 0, skipped: 0 };
  }

  // 3. Load all outreach.lead_id with their recipient emails for this
  // user — we need a sender → lead mapping. We use leads.email since
  // outreach.message stores the body, not the recipient header.
  const { data: outreachLeadRows } = await supa
    .from("outreach")
    .select("lead_id, lead_name, leads(email, name)")
    .eq("user_id", userId)
    .not("lead_id", "is", null);
  type ORow = {
    lead_id: string;
    lead_name: string | null;
    leads?: { email?: string | null; name?: string | null } | { email?: string | null; name?: string | null }[] | null;
  };
  const emailToLead = new Map<
    string,
    { leadId: string; leadName: string | null }
  >();
  for (const r of (outreachLeadRows ?? []) as ORow[]) {
    const lead = Array.isArray(r.leads) ? r.leads[0] : r.leads;
    const email = (lead?.email ?? "").trim().toLowerCase();
    if (email) {
      emailToLead.set(email, {
        leadId: r.lead_id,
        leadName: r.lead_name ?? lead?.name ?? null,
      });
    }
  }
  if (emailToLead.size === 0) {
    return { ok: true, userId, processed: 0, triaged: 0, skipped: 0 };
  }

  // 4. Load already-processed external IDs for dedup
  const { data: existingRows } = await supa
    .from("inbound_messages")
    .select("external_message_id")
    .eq("user_id", userId)
    .not("external_message_id", "is", null);
  const seenIds = new Set<string>(
    (existingRows ?? [])
      .map((r) => r.external_message_id as string | null)
      .filter(Boolean) as string[],
  );

  let processed = 0;
  let triaged = 0;
  let skipped = 0;

  for (const item of listed.messages) {
    processed++;
    if (seenIds.has(item.id)) {
      skipped++;
      continue;
    }
    const fetched = await getMessage({
      accessToken: cfg.access_token,
      messageId: item.id,
    });
    if (!fetched.ok || !fetched.message) {
      skipped++;
      continue;
    }
    const msg = fetched.message;
    const sender = parseEmailAddress(msg.from);
    const match = emailToLead.get(sender);
    if (!match) {
      skipped++;
      continue;
    }

    // 5. Triage via Anthropic
    const triaged1 = await runTriage({
      rawText: msg.body || msg.subject || "",
      senderName: msg.from,
      leadId: match.leadId,
      userId,
    });
    if (!triaged1.ok || !triaged1.parsed) {
      skipped++;
      continue;
    }

    // 6. Insert inbound_messages row
    const { error: insErr } = await supa.from("inbound_messages").insert({
      user_id: userId,
      lead_id: match.leadId,
      channel: "email",
      sender_name: msg.from,
      external_message_id: msg.id,
      raw_text: (msg.body || "").slice(0, 8000),
      category: triaged1.parsed.category,
      summary: triaged1.parsed.summary,
      suggested_stage: triaged1.parsed.suggested_stage,
      reply_drafts: triaged1.parsed.reply_drafts,
      reasoning: triaged1.parsed.reasoning,
      status: "new",
      received_at: new Date(
        Number(msg.internalDate) || Date.now(),
      ).toISOString(),
    });
    if (insErr) {
      skipped++;
      continue;
    }
    triaged++;

    // 7. Jarvis push
    const senderLabel = match.leadName ?? sender;
    const subjectShort = msg.subject.slice(0, 60);
    void pushTelegramNotification(
      "inbound",
      `🤵 *Nova poruka, Leonardo.*\n\n*Od:* ${senderLabel}\n*Subject:* ${subjectShort}\n*Kategorija:* ${triaged1.parsed.category.toUpperCase()}\n\n2 draft replyja čekaju review u Smart Inboxu. _— Jarvis_`,
      userId,
    );
  }

  return { ok: true, userId, processed, triaged, skipped };
}

async function runTriage(opts: {
  rawText: string;
  senderName: string;
  leadId: string;
  userId: string;
}): Promise<{ ok: boolean; parsed?: ParsedTriage; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY missing" };
  }
  const supa = adminClient();
  // Fetch lead context for richer triage
  const { data: lead } = await supa
    .from("leads")
    .select("name, niche, stage, icp_score, notes")
    .eq("id", opts.leadId)
    .eq("user_id", opts.userId)
    .maybeSingle();
  const leadContext = lead
    ? `\n# Lead context:\n**Ime:** ${lead.name}\n**Niche:** ${lead.niche ?? "?"}\n**Stage:** ${lead.stage}\n**ICP:** ${lead.icp_score ?? "?"}/20\n`
    : "";
  const userMessage = `# Channel: email\n# Pošiljatelj: ${opts.senderName}${leadContext}\n# Inbound poruka:\n"""\n${opts.rawText.slice(0, 4000)}\n"""\n\nKlasificiraj + 2 reply drafta. STRIKT JSON.`;
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: TRIAGE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = parseTriage(raw);
    if (!parsed) return { ok: false, error: "AI nevalidan JSON" };
    return { ok: true, parsed };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "triage failed",
    };
  }
}

/**
 * Sweep ALL users with active Gmail integration. Called from Inngest cron.
 */
export async function pollAllUsers(): Promise<{
  ok: boolean;
  userCount: number;
  totalTriaged: number;
  perUser: PollResult[];
}> {
  const supa = adminClient();
  const { data: integrations } = await supa
    .from("integrations")
    .select("user_id")
    .eq("provider", "gmail");
  const userIds = Array.from(
    new Set(
      (integrations ?? [])
        .map((r) => r.user_id as string | null)
        .filter(Boolean) as string[],
    ),
  );
  const perUser: PollResult[] = [];
  let totalTriaged = 0;
  for (const userId of userIds) {
    const res = await pollUserInbox(userId);
    perUser.push(res);
    totalTriaged += res.triaged;
  }
  return {
    ok: true,
    userCount: userIds.length,
    totalTriaged,
    perUser,
  };
}

/**
 * Manual one-shot trigger from UI (e.g. "Sync now" button in Strateg
 * room). Auth'd via Supabase session, so we know which user to poll.
 */
export async function manualPollMyInbox(): Promise<PollResult> {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, processed: 0, triaged: 0, skipped: 0, error: "Niste prijavljeni" };
  }
  return pollUserInbox(userData.user.id);
}
