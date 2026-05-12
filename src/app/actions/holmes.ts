"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runAgentHolmes, type HolmesReport } from "@/lib/agentHolmes";
import { logActivity } from "./activityLog";
import { beginAgentAction } from "@/lib/agentActionProgress";
import { pushTelegramNotification } from "./telegram";

// NB: Vercel function timeout for server actions is set globally via
// vercel.json (functions config) — `export const maxDuration` is not
// allowed in a "use server" module (only async functions may be
// exported from a server action file in Next.js).

export interface HolmesActionResult {
  ok: boolean;
  report?: HolmesReport;
  error?: string;
}

export async function runHolmesForLead(
  leadId: string,
): Promise<HolmesActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, niche, notes, website_url")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead nije pronađen" };

  const result = await runAgentHolmes({
    leadName: lead.name as string,
    niche: (lead.niche as string | null) ?? null,
    notesExcerpt: (lead.notes as string | null) ?? null,
    websiteUrl: (lead.website_url as string | null) ?? null,
  });

  if (!result.ok || !result.report) {
    return {
      ok: false,
      error: result.error ?? "Holmes failed",
    };
  }

  // Persist any newly-discovered website URL back to lead.website_url so
  // subsequent runs (and outreach drafts) skip the discovery step.
  const discoveredWebsite = result.report.evidence?.clinic_website;
  const updatePayload: Record<string, unknown> = {
    holmes_report: result.report,
  };
  if (discoveredWebsite && !lead.website_url) {
    updatePayload.website_url = discoveredWebsite;
  }
  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "lead_scored",
    title: `Holmes: ${lead.name}`,
    summary: result.report.owner.name
      ? `${result.report.owner.name}${result.report.owner.title ? ` (${result.report.owner.title})` : ""} — ${result.report.best_angle.summary.slice(0, 140)}`
      : `Bez owner identifikacije · best angle: ${result.report.best_angle.summary.slice(0, 140)}`,
    hqRoom: "lead_scorer",
    hqRowId: leadId,
  });

  revalidatePath("/");
  return { ok: true, report: result.report };
}

export interface BulkHolmesResult {
  ok: boolean;
  investigated: number;
  skipped: number;
  errors: string[];
}

/**
 * Bulk version: runs Holmes for every Hot lead (≥15 ICP, active stage)
 * that doesn't yet have a holmes_report. Sequential with a 500ms gap
 * between leads to be polite to DDG / scrape targets.
 */
export async function bulkRunHolmesHot(
  opts: { force?: boolean } = {},
): Promise<BulkHolmesResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return {
      ok: false,
      investigated: 0,
      skipped: 0,
      errors: ["Niste prijavljeni"],
    };

  const { data: hotLeads } = await supabase
    .from("leads")
    .select("id, name, holmes_report")
    .gte("icp_score", 15)
    .in("stage", ["discovery", "pricing", "financing", "booking"]);

  const all = (hotLeads ?? []) as Array<{
    id: string;
    name: string;
    holmes_report: unknown;
  }>;
  const todo = opts.force ? all : all.filter((l) => !l.holmes_report);
  if (todo.length === 0)
    return {
      ok: true,
      investigated: 0,
      skipped: all.length,
      errors: [],
    };

  // Wire to agent_actions so Vault's Detective Bureau room shows
  // "AI working" overlay for the whole duration.
  const tracker = await beginAgentAction({
    supabase,
    room: "holmes",
    actionType: "holmes.bulk_investigate_hot",
    title: `Holmes istražuje ${todo.length} hot leadova`,
    initialProgress: `0 / ${todo.length} · pripremam…`,
  });

  let investigated = 0;
  const errors: string[] = [];
  for (let i = 0; i < todo.length; i++) {
    const l = todo[i];
    await tracker.progress(
      `${i + 1} / ${todo.length} · ${l.name.slice(0, 60)}`,
    );
    const res = await runHolmesForLead(l.id);
    if (!res.ok) errors.push(`${l.id}: ${res.error ?? "unknown"}`);
    else investigated++;
    await new Promise((r) => setTimeout(r, 500));
  }

  await tracker.complete({
    investigated,
    skipped: all.length - todo.length,
    errors: errors.length,
  });

  void pushTelegramNotification(
    "followups",
    `🕵️ Leonardo, Holmes istražio ${investigated}/${todo.length} hot leadova${errors.length ? ` · ${errors.length} grešaka` : ""}. Otvori Detective Bureau za review.\n\n— Jarvis`,
    userData.user.id,
  );

  return {
    ok: true,
    investigated,
    skipped: all.length - todo.length,
    errors,
  };
}
