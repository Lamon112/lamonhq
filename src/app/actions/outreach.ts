"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";
import { draftOutreach } from "./ai";
import { sendViaGmail } from "./gmail";
import { pushTelegramNotification } from "./telegram";

export interface AddOutreachInput {
  leadName: string;
  platform: "linkedin" | "instagram" | "tiktok" | "email" | "other";
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
      lead_name: leadName,
      platform: input.platform,
      message: input.message?.trim() || null,
      status: input.status ?? "sent",
    })
    .select("id")
    .single();

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
    .select("id, name, email, niche, notes, icp_score")
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
    const platform = pickPlatformFromNotes(lead.notes, !!lead.email);
    const hook = extractHook(lead.notes);
    const res = await draftOutreach({
      leadName: lead.name,
      platform,
      niche: lead.niche ?? undefined,
      hook,
    });
    if (!res.ok || !res.draft) continue;

    const { error } = await supabase.from("pending_drafts").insert({
      user_id: userId,
      lead_id: lead.id,
      draft_type: "cold_outreach",
      draft_text: res.draft,
      reasoning: hook ?? null,
      context_payload: {
        leadName: lead.name,
        score: lead.icp_score,
        niche: lead.niche,
        platform,
        email: lead.email,
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
  return (data as PendingColdDraft[]) ?? [];
}
