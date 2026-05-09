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
    .select("id, name, niche, notes")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead nije pronađen" };

  const result = await runAgentHolmes({
    leadName: lead.name as string,
    niche: (lead.niche as string | null) ?? null,
    notesExcerpt: (lead.notes as string | null) ?? null,
  });

  if (!result.ok || !result.report) {
    return {
      ok: false,
      error: result.error ?? "Holmes failed",
    };
  }

  const { error } = await supabase
    .from("leads")
    .update({ holmes_report: result.report })
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
