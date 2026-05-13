"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";
import { draftOutreach, shortenForChannel } from "./ai";
import {
  checkAllChannels,
  type ChannelHealthMap,
} from "@/lib/channelHealth";
import { sendViaGmail } from "./gmail";
import { pushTelegramNotification } from "./telegram";
import { beginAgentAction } from "@/lib/agentActionProgress";
import { cleanPremiumLanguage } from "@/lib/premiumLanguage";

// NB: server-action timeout is configured in vercel.json (functions
// config) — `export const maxDuration` is not allowed in a "use server"
// module (only async functions may be exported). If the bulk refresh
// gets killed by Vercel's 60s default, switch to an Inngest job instead.

export interface AddOutreachInput {
  leadName: string;
  /**
   * When provided, persists the FK in outreach.lead_id AND advances the
   * lead's stage from "discovery" → "pricing" so the lead is marked as
   * "touched" and disappears from the Outreach Lab default queue (which
   * filters for discovery-stage leads with holmes_report).
   */
  leadId?: string;
  /**
   * "whatsapp" and "phone" are stored verbatim so the Sent Archive's
   * channel filter pills count them under the right column. The earlier
   * restriction to {linkedin, instagram, tiktok, email, other} forced
   * those touchpoints into "Ostalo", which hid multi-touch follow-ups
   * (email → WhatsApp the same day) from the natural channel view.
   */
  platform:
    | "linkedin"
    | "instagram"
    | "tiktok"
    | "email"
    | "whatsapp"
    | "phone"
    | "other";
  message: string;
  status?: "sent" | "replied" | "no_reply" | "bounced";
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function addOutreach(
  input: AddOutreachInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const leadName = input.leadName.trim();
  if (!leadName) return { ok: false, error: "Lead name je obavezan" };

  const { data, error } = await supabase
    .from("outreach")
    .insert({
      user_id: userData.user.id,
      lead_id: input.leadId ?? null,
      lead_name: leadName,
      platform: input.platform,
      message: input.message?.trim() || null,
      status: input.status ?? "sent",
    })
    .select("id")
    .single();

  // When the outreach is tied to a specific lead, advance the stage to
  // "pricing" (best-effort — Outreach Lab no longer depends on this; the
  // sentLeadIds set drives the queue filter). We only bump if the lead is
  // still in an early stage so we don't regress a closed/booking deal
  // back to pricing.
  if (input.leadId && !error) {
    await supabase
      .from("leads")
      .update({
        stage: "pricing",
        last_touchpoint_at: new Date().toISOString(),
      })
      .eq("id", input.leadId)
      .eq("user_id", userData.user.id)
      .in("stage", ["discovery", "pricing"]); // never regress later stages
  }

  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "outreach_sent",
    title: `Outreach → ${leadName}`,
    summary: `${input.platform.toUpperCase()}: ${input.message?.slice(0, 200) ?? "(no message)"}`,
    hqRoom: "outreach",
    hqRowId: data.id,
    tags: [input.platform],
  });

  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateOutreachStatus(
  id: string,
  status: "sent" | "replied" | "no_reply" | "bounced",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("outreach")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteOutreach(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("outreach").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────
// AUTO-DRAFT + APPROVAL QUEUE
// Generates cold-outreach drafts for Hot leads (≥15 ICP) and queues them
// in the existing pending_drafts table with draft_type='cold_outreach'.
// ────────────────────────────────────────────────────────────────────

interface HotLeadCandidate {
  id: string;
  name: string;
  email: string | null;
  niche: string | null;
  notes: string | null;
  icp_score: number | null;
  person_enrichment: {
    owner: {
      name: string;
      title: string | null;
      linkedin_url: string | null;
      email: string | null;
      channels?: { email?: string; linkedin?: string; instagram?: string };
      channelHealth?: {
        linkedin?: { status: string };
        instagram?: { status: string };
      };
    } | null;
  } | null;
}

function pickPlatformFromNotes(
  notes: string | null,
  hasEmail: boolean,
): "linkedin" | "instagram" | "email" | "other" {
  if (hasEmail) return "email";
  if (!notes) return "linkedin";
  if (/instagram:\s*https?:\/\//i.test(notes)) return "instagram";
  if (/linkedin:\s*https?:\/\//i.test(notes)) return "linkedin";
  if (/Org LinkedIn:/i.test(notes)) return "linkedin";
  return "linkedin";
}

/**
 * Picks the optimal platform for outreach given person-first enrichment.
 *
 * Priority (best → fallback):
 *   1. Owner email (Apollo verified)
 *   2. Owner LinkedIn (alive)
 *   3. Owner Instagram (alive)
 *   4. Company email
 *   5. Company LinkedIn / Instagram
 *   6. linkedin (legacy fallback)
 */
function pickBestPlatformForLead(
  lead: HotLeadCandidate,
  orgChannels: LeadChannels,
): "linkedin" | "instagram" | "email" | "other" {
  const owner = lead.person_enrichment?.owner;
  if (owner?.email) return "email";

  const liStatus = owner?.channelHealth?.linkedin?.status;
  if (owner?.linkedin_url && liStatus !== "dead" && liStatus !== "blocked") {
    return "linkedin";
  }

  const igStatus = owner?.channelHealth?.instagram?.status;
  if (
    owner?.channels?.instagram &&
    igStatus !== "dead" &&
    igStatus !== "blocked"
  ) {
    return "instagram";
  }

  // Fall back to company channels
  if (orgChannels.email) return "email";
  if (orgChannels.linkedin) return "linkedin";
  if (orgChannels.instagram) return "instagram";
  return "linkedin";
}

interface LeadChannels {
  email?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  phone?: string;
}

function extractChannels(
  notes: string | null,
  email: string | null,
): LeadChannels {
  const ch: LeadChannels = {};
  if (email) ch.email = email;
  if (!notes) return ch;

  // Apollo / enrichment notes typically embed lines like:
  //   Owner phone: +385...
  //   Org LinkedIn: http://...
  //   Instagram: https://www.instagram.com/...
  //   Website: https://...
  const grab = (re: RegExp) => notes.match(re)?.[1]?.trim();

  ch.linkedin =
    grab(/(?:Org\s+LinkedIn|LinkedIn):\s*(https?:\/\/\S+)/i) ?? ch.linkedin;
  ch.instagram =
    grab(/Instagram:\s*(https?:\/\/\S+)/i) ?? ch.instagram;
  ch.facebook = grab(/Facebook:\s*(https?:\/\/\S+)/i);
  ch.tiktok = grab(/TikTok:\s*(https?:\/\/\S+)/i);
  ch.website =
    grab(/(?:Website|Web|Site):\s*(https?:\/\/\S+)/i) ?? ch.website;
  ch.phone = grab(/(?:Owner phone|Phone|Tel):\s*([+\d\s()/-]+)/i);

  // Strip trailing punctuation
  for (const k of Object.keys(ch) as (keyof LeadChannels)[]) {
    if (ch[k]) ch[k] = ch[k]!.replace(/[.,;)\]]+$/, "");
  }
  return ch;
}

function extractHook(notes: string | null): string | undefined {
  if (!notes) return undefined;
  const reasoning = notes.match(/^🤖 ([^\n]+)/m)?.[1];
  const primaryFit = notes.match(/^🎯 Primary fit:\s*([^\n]+)/m)?.[1];
  const premium = notes.match(/^✨ Premium signals:\s*([^\n]+)/m)?.[1];
  const financial = notes.match(/^📈 Financial intel:\s*([^\n]+)/m)?.[1];
  const parts: string[] = [];
  if (primaryFit) parts.push(`PRIMARY SERVICE FIT: ${primaryFit}`);
  if (reasoning) parts.push(`Reasoning: ${reasoning}`);
  if (premium) parts.push(`Premium signals: ${premium}`);
  if (financial)
    parts.push(`Financial: ${financial.replace(/\s*·\s*https?:\/\/\S+/, "")}`);
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

export interface ColdDraftBatchResult {
  ok: boolean;
  generated: number;
  skipped: number;
  error?: string;
}

export async function generateColdDrafts(): Promise<ColdDraftBatchResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return { ok: false, generated: 0, skipped: 0, error: "Niste prijavljeni" };
  const userId = userData.user.id;

  // 1. Hot leads (≥15) in active stages
  const { data: hotLeads } = await supabase
    .from("leads")
    .select("id, name, email, niche, notes, icp_score, person_enrichment")
    .gte("icp_score", 15)
    .in("stage", ["discovery", "pricing", "financing", "booking"])
    .order("icp_score", { ascending: false })
    .limit(20);

  const candidates = (hotLeads ?? []) as HotLeadCandidate[];
  if (candidates.length === 0)
    return { ok: true, generated: 0, skipped: 0 };

  // 2. Skip leads that already have any sent outreach OR a pending cold draft
  const ids = candidates.map((l) => l.id);
  const [{ data: existingOutreach }, { data: existingDrafts }] =
    await Promise.all([
      supabase
        .from("outreach")
        .select("lead_id")
        .eq("user_id", userId)
        .in("lead_id", ids),
      supabase
        .from("pending_drafts")
        .select("lead_id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .eq("draft_type", "cold_outreach")
        .in("lead_id", ids),
    ]);

  const skipSet = new Set<string>();
  for (const r of existingOutreach ?? []) {
    if (r.lead_id) skipSet.add(r.lead_id as string);
  }
  for (const r of existingDrafts ?? []) {
    if (r.lead_id) skipSet.add(r.lead_id as string);
  }

  const todo = candidates.filter((l) => !skipSet.has(l.id));
  if (todo.length === 0)
    return { ok: true, generated: 0, skipped: candidates.length };

  // 3. Generate drafts (sequential to respect rate limits)
  let generated = 0;
  for (const lead of todo) {
    const orgChannels = extractChannels(lead.notes, lead.email);
    const owner = lead.person_enrichment?.owner ?? null;

    // Pick best platform: prefer owner's alive channels > company channels
    const platform = pickBestPlatformForLead(lead, orgChannels);
    const hook = extractHook(lead.notes);
    const ownerCtx = owner
      ? {
          name: owner.name,
          firstName: owner.name.split(/\s+/)[0],
          title: owner.title ?? null,
        }
      : undefined;

    const res = await draftOutreach({
      leadName: lead.name,
      platform,
      niche: lead.niche ?? undefined,
      hook,
      owner: ownerCtx,
    });
    if (!res.ok || !res.draft) continue;

    // Auto-shorten for channels with hard char limits so the draft that
    // lands in the queue is already paste-ready (LinkedIn 750 hard cap,
    // Instagram 1000). Email + other have no limit.
    let finalDraft = res.draft;
    if (platform === "linkedin" || platform === "instagram") {
      const shortened = await shortenForChannel(
        res.draft,
        platform,
        owner?.name ?? lead.name,
      );
      if (shortened.ok && shortened.draft) {
        finalDraft = shortened.draft;
      }
    }

    // Build a "merged" channel set with owner's personal links overriding
    // org-level ones where present (so UI surfaces vlasnik prvo).
    const ownerChannels = owner?.channels ?? {};
    const mergedChannels: LeadChannels = {
      ...orgChannels,
      ...(ownerChannels.email ? { email: ownerChannels.email } : {}),
      ...(ownerChannels.linkedin
        ? { linkedin: ownerChannels.linkedin }
        : {}),
      ...(ownerChannels.instagram
        ? { instagram: ownerChannels.instagram }
        : {}),
    };

    const { error } = await supabase.from("pending_drafts").insert({
      user_id: userId,
      lead_id: lead.id,
      draft_type: "cold_outreach",
      draft_text: finalDraft,
      reasoning: hook ?? null,
      context_payload: {
        leadName: lead.name,
        score: lead.icp_score,
        niche: lead.niche,
        platform,
        email: ownerChannels.email ?? lead.email,
        channels: mergedChannels,
        owner: owner
          ? {
              name: owner.name,
              title: owner.title,
              email: owner.email,
              linkedin_url: owner.linkedin_url,
              channels: ownerChannels,
              channelHealth: owner.channelHealth,
            }
          : null,
        orgChannels,
      },
      status: "pending",
    });
    if (!error) generated++;
  }

  revalidatePath("/");

  // Jarvis push: "X novih draftova spremno za review"
  if (generated > 0) {
    void pushTelegramNotification(
      "followups",
      `✨ Leonardo, ${generated} novi${generated === 1 ? "" : "h"} cold-outreach draft${generated === 1 ? "" : "ova"} čeka tvoj review u Approval queue.\n\nOtvori Outreach Lab → Approval queue → Approve & Send (email auto-šalje, IG/LI ti šalješ ručno).\n\n— Jarvis`,
      userId,
    );
  }

  return {
    ok: true,
    generated,
    skipped: candidates.length - todo.length,
  };
}

/**
 * Re-generate a single pending draft using the lead's latest
 * person_enrichment (owner context). Useful after Deep Enrich finds an
 * owner for a lead whose draft was generated against the clinic name.
 */
export async function regenerateDraftWithOwner(
  draftId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data: draft } = await supabase
    .from("pending_drafts")
    .select("id, lead_id, context_payload")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || !draft.lead_id)
    return { ok: false, error: "Draft nije pronađen" };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, email, niche, notes, icp_score, person_enrichment")
    .eq("id", draft.lead_id)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead nije pronađen" };

  const candidate = lead as HotLeadCandidate;
  const orgChannels = extractChannels(candidate.notes, candidate.email);
  const owner = candidate.person_enrichment?.owner ?? null;
  if (!owner)
    return {
      ok: false,
      error: "Lead nema enrichment vlasnika — pokreni Deep Enrich prvo",
    };

  const platform = pickBestPlatformForLead(candidate, orgChannels);
  const hook = extractHook(candidate.notes);
  const ownerCtx = {
    name: owner.name,
    firstName: owner.name.split(/\s+/)[0],
    title: owner.title ?? null,
  };

  const res = await draftOutreach({
    leadName: candidate.name,
    platform,
    niche: candidate.niche ?? undefined,
    hook,
    owner: ownerCtx,
  });
  if (!res.ok || !res.draft)
    return { ok: false, error: res.error ?? "AI greška" };

  let finalDraft = res.draft;
  if (platform === "linkedin" || platform === "instagram") {
    const shortened = await shortenForChannel(
      res.draft,
      platform,
      owner.name,
    );
    if (shortened.ok && shortened.draft) finalDraft = shortened.draft;
  }

  const ownerChannels = owner.channels ?? {};
  const mergedChannels: LeadChannels = {
    ...orgChannels,
    ...(ownerChannels.email ? { email: ownerChannels.email } : {}),
    ...(ownerChannels.linkedin ? { linkedin: ownerChannels.linkedin } : {}),
    ...(ownerChannels.instagram
      ? { instagram: ownerChannels.instagram }
      : {}),
  };

  const { error } = await supabase
    .from("pending_drafts")
    .update({
      draft_text: finalDraft,
      status: "pending",
      reasoning: hook ?? null,
      generated_at: new Date().toISOString(),
      context_payload: {
        leadName: candidate.name,
        score: candidate.icp_score,
        niche: candidate.niche,
        platform,
        email: ownerChannels.email ?? candidate.email,
        channels: mergedChannels,
        owner: {
          name: owner.name,
          title: owner.title,
          email: owner.email,
          linkedin_url: owner.linkedin_url,
          channels: ownerChannels,
          channelHealth: owner.channelHealth,
        },
        orgChannels,
      },
    })
    .eq("id", draftId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

/**
 * Refresh outreach drafts for ALL active leads in Outreach Lab using the
 * current SYSTEM_PROMPT_V2 (which embeds the 9 Premium Positioning Swaps
 * per Brend · 09). Targets leads with a `holmes_report` whose stage is
 * not closed, and overwrites `holmes_report.outreach_draft` +
 * `holmes_report.channel_drafts.email` (or per-channel if primary set).
 *
 * Why this exists: when the brand voice / outreach rules evolve, we want
 * a one-click way to bring all existing drafts up to spec without having
 * to re-run a full Holmes investigation per lead.
 *
 * Returns { ok, refreshed, skipped, error? } so the UI can show a toast.
 */
export interface RefreshOutreachDraftsResult {
  ok: boolean;
  refreshed: number;
  skipped: number;
  error?: string;
}

export async function refreshOutreachDraftsWithCurrentRules(): Promise<RefreshOutreachDraftsResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, refreshed: 0, skipped: 0, error: "Niste prijavljeni" };
  }
  const userId = userData.user.id;

  // Pull all active-stage leads that have a holmes_report (these are the
  // leads visible in Outreach Lab tabs).
  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select(
      "id, name, niche, notes, email, icp_score, holmes_report, person_enrichment, stage",
    )
    .eq("user_id", userId)
    .not("holmes_report", "is", null)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("icp_score", { ascending: false });

  if (leadsErr)
    return {
      ok: false,
      refreshed: 0,
      skipped: 0,
      error: leadsErr.message,
    };

  const list = leads ?? [];
  if (list.length === 0) return { ok: true, refreshed: 0, skipped: 0 };

  // Wire to agent_actions so Vault's Comms room shows "AI working" overlay
  // for the whole duration. Progress text streams to the UI via Realtime.
  const tracker = await beginAgentAction({
    supabase,
    room: "comms",
    actionType: "comms.refresh_outreach_drafts",
    title: "Osvježavam outreach drafts (Brend · 09)",
    initialProgress: `0 / ${list.length} · pripremam…`,
  });

  let refreshed = 0;
  let skipped = 0;

  for (let i = 0; i < list.length; i++) {
    const lead = list[i];
    await tracker.progress(
      `${i + 1} / ${list.length} · ${(lead.name as string).slice(0, 60)}`,
    );
    const report = lead.holmes_report as Record<string, unknown> | null;
    if (!report) {
      skipped++;
      continue;
    }

    const enrichment = lead.person_enrichment as
      | { owner?: { name?: string; title?: string | null } | null }
      | null;
    const owner = enrichment?.owner ?? null;

    const orgChannels = extractChannels(
      lead.notes as string | null,
      lead.email as string | null,
    );
    const platform = pickBestPlatformForLead(
      lead as HotLeadCandidate,
      orgChannels,
    );
    // Clean the hook BEFORE passing to AI so English words from Holmes
    // (e.g. "content engine") don't leak into the draft.
    const rawHook = extractHook(lead.notes as string | null);
    const hook = rawHook ? cleanPremiumLanguage(rawHook).cleaned : rawHook;

    const ownerCtx = owner?.name
      ? {
          name: owner.name,
          firstName: owner.name.split(/\s+/)[0],
          title: owner.title ?? null,
        }
      : undefined;

    const res = await draftOutreach({
      leadName: lead.name as string,
      platform,
      niche: (lead.niche as string | null) ?? undefined,
      hook,
      owner: ownerCtx,
    });
    if (!res.ok || !res.draft) {
      skipped++;
      continue;
    }

    let finalDraft = res.draft;
    if (platform === "linkedin" || platform === "instagram") {
      const shortened = await shortenForChannel(
        res.draft,
        platform,
        owner?.name ?? (lead.name as string),
      );
      if (shortened.ok && shortened.draft) finalDraft = shortened.draft;
    }
    // Post-AI cleanup — catches any English leak that survived the prompt.
    finalDraft = cleanPremiumLanguage(finalDraft).cleaned;

    // Also clean the best_angle.summary + opening_hook in-place so the
    // UI panels (Best angle / Opening hook 30s) render Croatian-only
    // copy too, not just the draft body.
    const existingBestAngle = report.best_angle as
      | { summary?: string; opening_hook?: string; avoid?: string[] }
      | undefined;
    const cleanedBestAngle = existingBestAngle
      ? {
          ...existingBestAngle,
          summary: existingBestAngle.summary
            ? cleanPremiumLanguage(existingBestAngle.summary).cleaned
            : existingBestAngle.summary,
          opening_hook: existingBestAngle.opening_hook
            ? cleanPremiumLanguage(existingBestAngle.opening_hook).cleaned
            : existingBestAngle.opening_hook,
        }
      : existingBestAngle;

    // Update the holmes_report blob in-place: keep all other fields,
    // overwrite outreach_draft + channel_drafts.<platform>.
    const channelDrafts =
      (report.channel_drafts as Record<string, string | null> | undefined) ??
      {};
    const updatedReport = {
      ...report,
      best_angle: cleanedBestAngle,
      outreach_draft: finalDraft,
      channel_drafts: {
        ...channelDrafts,
        [platform === "other" ? "email" : platform]: finalDraft,
      },
      // mark when last refreshed so we can show "refreshed 2 min ago" in UI
      last_refreshed_at: new Date().toISOString(),
      last_refreshed_prompt_version: "v11",
    };

    const { error: updErr } = await supabase
      .from("leads")
      .update({ holmes_report: updatedReport })
      .eq("id", lead.id);

    if (updErr) {
      skipped++;
      continue;
    }
    refreshed++;
  }

  await tracker.complete({ refreshed, skipped, total: list.length });

  void logActivity(userId, {
    type: "outreach_sent",
    title: `Refreshed ${refreshed} outreach drafts (Brend · 09)`,
    summary: `Re-generated drafts s 9 premium swap pravila. Skipped: ${skipped}.`,
    hqRoom: "outreach",
    tags: ["refresh", "brend-09"],
  });

  void pushTelegramNotification(
    "followups",
    `✨ Leonardo, osvježeno ${refreshed}/${list.length} outreach draftova po Brend · 09 pravilima${skipped ? ` · ${skipped} preskočeno` : ""}. Otvori Outreach Lab za review.\n\n— Jarvis`,
    userId,
  );

  revalidatePath("/");
  return { ok: true, refreshed, skipped };
}

export async function editPendingDraft(
  draftId: string,
  newText: string,
): Promise<ActionResult> {
  if (!newText.trim()) return { ok: false, error: "Tekst je prazan" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_drafts")
    .update({ draft_text: newText.trim(), status: "edited" })
    .eq("id", draftId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function dismissPendingDraft(
  draftId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_drafts")
    .update({ status: "dismissed", acted_on_at: new Date().toISOString() })
    .eq("id", draftId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export interface ApprovedDraftResult extends ActionResult {
  emailSent?: boolean;
  fromEmail?: string;
  outreachId?: string;
}

/**
 * Approves a pending draft. If the lead has an email and platform is "email",
 * sends via Gmail and inserts an outreach row marked sent. Otherwise marks the
 * draft as ready-for-manual-send (status='edited') and inserts an outreach row
 * marked sent — Leonardo copies + sends in IG/LinkedIn manually, then we treat
 * the lifecycle the same way as any other sent message.
 */
export async function approveAndSendDraft(
  draftId: string,
  finalText?: string,
  subjectOverride?: string,
): Promise<ApprovedDraftResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const userId = userData.user.id;

  const { data: draft, error: dErr } = await supabase
    .from("pending_drafts")
    .select("id, lead_id, draft_text, context_payload")
    .eq("id", draftId)
    .single();
  if (dErr || !draft) return { ok: false, error: "Draft nije pronađen" };

  const text = (finalText ?? (draft.draft_text as string)).trim();
  if (!text) return { ok: false, error: "Draft tekst je prazan" };

  const ctx = (draft.context_payload ?? {}) as {
    leadName?: string;
    platform?: string;
    email?: string | null;
    niche?: string | null;
  };
  const leadName = ctx.leadName ?? "lead";
  const platform = (ctx.platform ?? "linkedin") as
    | "linkedin"
    | "instagram"
    | "tiktok"
    | "email"
    | "other";

  let emailSent = false;
  let fromEmail: string | undefined;

  if (platform === "email" && ctx.email) {
    const subject =
      subjectOverride?.trim() || `Lamon Agency · ${leadName}`;
    const sendRes = await sendViaGmail({
      to: ctx.email,
      subject,
      body: text,
    });
    if (!sendRes.ok)
      return {
        ok: false,
        error: `Gmail send neuspješan: ${sendRes.error}`,
      };
    emailSent = true;
    fromEmail = sendRes.fromEmail;
  }

  // Insert as sent outreach row
  const { data: outreach, error: outErr } = await supabase
    .from("outreach")
    .insert({
      user_id: userId,
      lead_id: draft.lead_id,
      lead_name: leadName,
      platform,
      message: text,
      status: "sent",
    })
    .select("id")
    .single();
  if (outErr) return { ok: false, error: outErr.message };

  // Mark the draft as sent
  await supabase
    .from("pending_drafts")
    .update({ status: "sent", acted_on_at: new Date().toISOString() })
    .eq("id", draftId);

  // Bump lead.last_touchpoint_at if linked
  if (draft.lead_id) {
    await supabase
      .from("leads")
      .update({ last_touchpoint_at: new Date().toISOString() })
      .eq("id", draft.lead_id);
  }

  void logActivity(userId, {
    type: "outreach_sent",
    title: `${emailSent ? "📤 Email" : "✉️ Outreach"} → ${leadName}`,
    summary: text.slice(0, 200),
    hqRoom: "outreach",
    hqRowId: outreach.id,
    tags: [platform, ...(emailSent ? ["auto_sent"] : ["manual"])],
  });

  revalidatePath("/");
  return {
    ok: true,
    emailSent,
    fromEmail,
    outreachId: outreach.id,
  };
}

export interface PendingColdDraft {
  id: string;
  lead_id: string | null;
  draft_text: string;
  reasoning: string | null;
  status: "pending" | "edited" | "sent" | "dismissed";
  generated_at: string;
  context_payload: {
    leadName?: string;
    score?: number;
    niche?: string | null;
    platform?: string;
    email?: string | null;
    channels?: LeadChannels;
    channelHealth?: ChannelHealthMap;
    owner?: {
      name: string;
      title: string | null;
      email: string | null;
      linkedin_url: string | null;
      channels?: { email?: string; linkedin?: string; instagram?: string };
      channelHealth?: {
        linkedin?: { status: string; followers?: number; reason?: string };
        instagram?: { status: string; followers?: number; reason?: string };
      };
    } | null;
    orgChannels?: LeadChannels;
  } | null;
}

export async function getPendingColdDrafts(): Promise<PendingColdDraft[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data } = await supabase
    .from("pending_drafts")
    .select(
      "id, lead_id, draft_text, reasoning, status, generated_at, context_payload",
    )
    .eq("user_id", userData.user.id)
    .eq("draft_type", "cold_outreach")
    .in("status", ["pending", "edited"])
    .order("generated_at", { ascending: false })
    .limit(30);

  const drafts = (data as PendingColdDraft[]) ?? [];
  if (drafts.length === 0) return drafts;

  // Backfill channels for legacy drafts that were generated before
  // extractChannels existed: look up notes/email per lead and merge in.
  const leadIds = Array.from(
    new Set(drafts.map((d) => d.lead_id).filter(Boolean) as string[]),
  );
  if (leadIds.length === 0) return drafts;
  const { data: leadRows } = await supabase
    .from("leads")
    .select("id, notes, email")
    .in("id", leadIds);
  const byId = new Map<string, { notes: string | null; email: string | null }>();
  for (const r of leadRows ?? []) {
    byId.set(r.id as string, {
      notes: (r.notes as string | null) ?? null,
      email: (r.email as string | null) ?? null,
    });
  }

  for (const d of drafts) {
    if (!d.context_payload) d.context_payload = {};
    const existing = d.context_payload.channels;
    const hasAny =
      existing &&
      Object.values(existing).some((v) => typeof v === "string" && v.length);
    if (hasAny) continue;
    const lead = d.lead_id ? byId.get(d.lead_id) : null;
    if (!lead) continue;
    d.context_payload.channels = extractChannels(
      lead.notes,
      lead.email ?? d.context_payload.email ?? null,
    );
  }

  // Run channel health checks in parallel for drafts that don't yet have
  // a channelHealth result. Each lead's checks run concurrently across
  // platforms; drafts without any URL-based channel are skipped.
  const healthTasks = drafts.map(async (d) => {
    if (!d.context_payload) return;
    if (d.context_payload.channelHealth) return;
    const ch = d.context_payload.channels;
    if (!ch) return;
    const hasUrl =
      ch.instagram || ch.linkedin || ch.facebook || ch.tiktok || ch.website;
    if (!hasUrl) return;
    try {
      d.context_payload.channelHealth = await checkAllChannels(ch);
    } catch {
      /* never throw for health check */
    }
  });
  await Promise.all(healthTasks);

  return drafts;
}
