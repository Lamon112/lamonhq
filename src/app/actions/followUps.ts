"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "./activityLog";

export interface PendingDraft {
  id: string;
  lead_id: string | null;
  draft_type: string;
  draft_text: string;
  reasoning: string | null;
  context_payload: {
    leadName?: string;
    stage?: string;
    daysSilent?: number;
    score?: number;
    niche?: string | null;
    platform?: string;
    lastTouchAt?: string | null;
  } | null;
  status: "pending" | "sent" | "dismissed" | "edited";
  generated_at: string;
}

const FOLLOW_UP_SYSTEM_PROMPT = `Ti si Leonardo Lamon, founder Lamon Agency. Pišeš FOLLOW-UP poruku za lead-a koji je tih X dana nakon prethodnog touchpointa.

# Pravila

1. **NIKAD ne počinji s "Just checking in"** ili "Wanted to follow up". To je smrt razgovora.
2. **Daj im razlog** zašto se javljaš upravo sad — novi insight, primjer iz drugog klijenta, kratki pivot u ponudi, link na korisnu stvar. Reason mora biti vrijedan njima.
3. **Postavi low-effort pitanje** — yes/no ili dva slota za poziv. Ne ostavljaj na "javi mi se".
4. **Maksimum 4 retka.** Tihi lead = ne želi poklon poemu.
5. **Reference na prethodni stage** — ako su bili u "pricing", spomeni odgovor na value/ROI; ako su u "financing", spomeni opciju koja smanjuje barijeru; ako su u "booking", predloži 2 specifična slota.
6. **Hrvatski jezik**, peer-to-peer, premium tone.
7. **Potpis:** — Leonardo

# Stages context (referenca):
- discovery: zakazali su / spomenuli call ali nije bio
- pricing: čuli su cijenu, čekaju razmišljanje
- financing: tražili su rate / ROI break-even
- booking: dogovaramo termin početka

# Format izlaza — STRIKT JSON, ništa drugo:
{
  "draft": "Tekst poruke (vrh = pitanje/insight, dno = signature)",
  "reasoning": "1 rečenica zašto si izabrao baš ovaj angle za baš ovog lead-a"
}

NE dodaj markdown, NE objašnjenja, samo JSON.`;

interface SilentLead {
  id: string;
  name: string;
  niche: string | null;
  stage: string;
  icp_score: number | null;
  notes: string | null;
  last_touchpoint_at: string;
  created_at: string;
}

interface ParsedDraft {
  draft: string;
  reasoning: string;
}

function parseDraft(raw: string): ParsedDraft | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ParsedDraft;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as ParsedDraft;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function fetchSilentLeads(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<SilentLead[]> {
  const cutoffDays = 4;
  const cutoff = new Date(
    Date.now() - cutoffDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, name, niche, stage, icp_score, notes, last_touchpoint_at, created_at",
    )
    .eq("user_id", userId)
    .in("stage", ["discovery", "pricing", "financing", "booking"])
    .not("last_touchpoint_at", "is", null)
    .lt("last_touchpoint_at", cutoff)
    .order("icp_score", { ascending: false })
    .limit(8);
  return (data ?? []) as SilentLead[];
}

async function leadsAlreadyDrafted(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  leadIds: string[],
): Promise<Set<string>> {
  if (leadIds.length === 0) return new Set();
  const { data } = await supabase
    .from("pending_drafts")
    .select("lead_id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .in("lead_id", leadIds);
  return new Set((data ?? []).map((r: { lead_id: string }) => r.lead_id));
}

async function draftForLead(
  anthropic: Anthropic,
  lead: SilentLead,
): Promise<ParsedDraft | null> {
  const lastTouch = new Date(lead.last_touchpoint_at).getTime();
  const daysSilent = Math.round((Date.now() - lastTouch) / (24 * 3600 * 1000));
  const userMessage = `# Lead context
**Ime:** ${lead.name}
**Niche:** ${lead.niche ?? "?"}
**Stage:** ${lead.stage}
**ICP score:** ${lead.icp_score ?? "?"}/20
**Days silent:** ${daysSilent}
**Notes:** ${lead.notes ?? "(nema notesa)"}

Napiši kratki follow-up nudge po pravilima. STRIKT JSON.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: FOLLOW_UP_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw =
      textBlock && textBlock.type === "text" ? textBlock.text : "";
    return parseDraft(raw);
  } catch {
    return null;
  }
}

export async function generateFollowUps(): Promise<{
  ok: boolean;
  generated: number;
  skipped: number;
  error?: string;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      generated: 0,
      skipped: 0,
      error: "ANTHROPIC_API_KEY nije postavljen",
    };
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return { ok: false, generated: 0, skipped: 0, error: "Niste prijavljeni" };

  return generateFollowUpsForUser(userData.user.id, supabase);
}

async function generateFollowUpsForUser(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{
  ok: boolean;
  generated: number;
  skipped: number;
  error?: string;
}> {
  try {
    const silent = await fetchSilentLeads(supabase, userId);
    if (silent.length === 0)
      return { ok: true, generated: 0, skipped: 0 };

    const existing = await leadsAlreadyDrafted(
      supabase,
      userId,
      silent.map((l) => l.id),
    );

    const todo = silent.filter((l) => !existing.has(l.id));
    if (todo.length === 0)
      return { ok: true, generated: 0, skipped: silent.length };

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    let generated = 0;
    for (const lead of todo) {
      const drafted = await draftForLead(anthropic, lead);
      if (!drafted) continue;
      const lastTouch = new Date(lead.last_touchpoint_at).getTime();
      const daysSilent = Math.round(
        (Date.now() - lastTouch) / (24 * 3600 * 1000),
      );
      const { error } = await supabase.from("pending_drafts").insert({
        user_id: userId,
        lead_id: lead.id,
        draft_type: "follow_up",
        draft_text: drafted.draft,
        reasoning: drafted.reasoning,
        context_payload: {
          leadName: lead.name,
          stage: lead.stage,
          daysSilent,
          score: lead.icp_score,
          niche: lead.niche,
          platform: "linkedin",
          lastTouchAt: lead.last_touchpoint_at,
        },
        status: "pending",
      });
      if (!error) generated++;
    }

    revalidatePath("/");
    return { ok: true, generated, skipped: silent.length - todo.length };
  } catch (e) {
    return {
      ok: false,
      generated: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : "Nepoznata greška",
    };
  }
}

export async function getPendingFollowUps(): Promise<PendingDraft[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data } = await supabase
    .from("pending_drafts")
    .select(
      "id, lead_id, draft_type, draft_text, reasoning, context_payload, status, generated_at",
    )
    .eq("status", "pending")
    .order("generated_at", { ascending: false })
    .limit(20);
  return (data as PendingDraft[]) ?? [];
}

export async function sendFollowUp(
  draftId: string,
  finalText?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const userId = userData.user.id;

  const { data: draft } = await supabase
    .from("pending_drafts")
    .select(
      "id, lead_id, draft_text, context_payload",
    )
    .eq("id", draftId)
    .maybeSingle();
  if (!draft) return { ok: false, error: "Draft nije pronađen" };

  const text = (finalText ?? draft.draft_text).trim();
  const ctx = (draft.context_payload ?? {}) as PendingDraft["context_payload"];
  const leadName = ctx?.leadName ?? "lead";
  const platform = (ctx?.platform ?? "linkedin") as
    | "linkedin"
    | "instagram"
    | "tiktok"
    | "email"
    | "other";

  const { data: outreach, error: outErr } = await supabase
    .from("outreach")
    .insert({
      user_id: userId,
      lead_name: leadName,
      platform,
      message: text,
      status: "sent",
    })
    .select("id")
    .single();
  if (outErr) return { ok: false, error: outErr.message };

  if (draft.lead_id) {
    await supabase
      .from("leads")
      .update({ last_touchpoint_at: new Date().toISOString() })
      .eq("id", draft.lead_id);
  }

  await supabase
    .from("pending_drafts")
    .update({
      status: "sent",
      acted_on_at: new Date().toISOString(),
      draft_text: text,
    })
    .eq("id", draftId);

  void logActivity(userId, {
    type: "outreach_sent",
    title: `Follow-up → ${leadName}`,
    summary: `${platform.toUpperCase()}: ${text.slice(0, 200)}`,
    hqRoom: "outreach",
    hqRowId: outreach.id,
    tags: [platform, "follow_up"],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function dismissFollowUp(
  draftId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_drafts")
    .update({
      status: "dismissed",
      acted_on_at: new Date().toISOString(),
    })
    .eq("id", draftId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/**
 * Cron entry — runs for every active user with silent leads.
 */
export async function generateFollowUpsForAllUsers(): Promise<{
  ok: boolean;
  totalGenerated: number;
  errors: string[];
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      ok: false,
      totalGenerated: 0,
      errors: ["SUPABASE_SERVICE_ROLE_KEY nije postavljen"],
    };
  }
  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: rows } = await admin
    .from("activity_log")
    .select("user_id")
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .limit(1000);

  const userIds = Array.from(
    new Set((rows ?? []).map((r) => r.user_id as string)),
  );

  let total = 0;
  const errors: string[] = [];
  for (const userId of userIds) {
    const result = await generateFollowUpsForUser(userId, admin);
    if (!result.ok)
      errors.push(`user ${userId}: ${result.error ?? "unknown"}`);
    else total += result.generated;
  }
  return { ok: errors.length === 0, totalGenerated: total, errors };
}
