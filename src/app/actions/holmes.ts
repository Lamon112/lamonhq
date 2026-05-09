"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runAgentHolmes, type HolmesReport } from "@/lib/agentHolmes";
import { logActivity } from "./activityLog";

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
    .select("id, holmes_report")
    .gte("icp_score", 15)
    .in("stage", ["discovery", "pricing", "financing", "booking"]);

  const all = (hotLeads ?? []) as Array<{
    id: string;
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

  let investigated = 0;
  const errors: string[] = [];
  for (const l of todo) {
    const res = await runHolmesForLead(l.id);
    if (!res.ok) errors.push(`${l.id}: ${res.error ?? "unknown"}`);
    else investigated++;
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    ok: true,
    investigated,
    skipped: all.length - todo.length,
    errors,
  };
}
