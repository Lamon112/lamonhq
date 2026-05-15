"use server";

/**
 * Quiz Leads — admin-side query helpers.
 *
 * Surfaces /quiz funnel data into Lamon HQ Vault → Scholar room →
 * SkoolOps panel → "Quiz Funnel" tab. Leonardo can scan incoming leads,
 * see scores, copy DM templates, mark conversions.
 *
 * Status pipeline (mirror migration 0030):
 *   new → dm_sent → replied → skool_invited → converted (or → cold)
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface QuizLead {
  id: string;
  responses: Record<string, unknown>;
  score: number | null;
  weaknesses: Array<{ label: string; percent: number; color: string; diagnosis?: string }> | null;
  matched_case_study: string | null;
  ai_output_md: string | null;
  lead_email: string | null;
  lead_name: string | null;
  lead_telegram: string | null;
  lead_phone: string | null;
  source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  status: "new" | "dm_sent" | "replied" | "skool_invited" | "converted" | "cold";
  generated_at: string | null;
  generation_cost_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuizFunnelStats {
  total: number;
  new_count: number;
  dm_sent: number;
  replied: number;
  skool_invited: number;
  converted: number;
  cold: number;
  // Conversion rates
  dm_to_reply_rate: number;
  reply_to_invite_rate: number;
  invite_to_conversion_rate: number;
  overall_conversion_rate: number;
  // Score distribution
  avg_score: number | null;
  // Last 7 days
  leads_7d: number;
  conversions_7d: number;
  // Cost
  total_cost_usd: number;
}

export async function listQuizLeads(limit = 100): Promise<QuizLead[]> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("quiz_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[quizLeads] list error:", error);
    return [];
  }
  return (data ?? []) as QuizLead[];
}

export async function getQuizFunnelStats(): Promise<QuizFunnelStats> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("quiz_leads")
    .select("status, score, generation_cost_usd, created_at");
  if (error) {
    console.error("[quizLeads] stats error:", error);
    return emptyStats();
  }

  const rows = data ?? [];
  const total = rows.length;
  const counts: Record<QuizLead["status"], number> = {
    new: 0,
    dm_sent: 0,
    replied: 0,
    skool_invited: 0,
    converted: 0,
    cold: 0,
  };
  let scoreSum = 0;
  let scoreCount = 0;
  let costSum = 0;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let leads_7d = 0;
  let conversions_7d = 0;

  for (const r of rows) {
    counts[r.status as QuizLead["status"]] += 1;
    if (typeof r.score === "number") {
      scoreSum += r.score;
      scoreCount += 1;
    }
    costSum += Number(r.generation_cost_usd ?? 0);
    const ts = new Date(r.created_at).getTime();
    if (ts >= sevenDaysAgo) {
      leads_7d += 1;
      if (r.status === "converted") conversions_7d += 1;
    }
  }

  // dm_sent represents leads that have moved past 'new'. Anyone DM'd or
  // further along counts toward the dm_sent funnel.
  const dmSentOrLater =
    counts.dm_sent + counts.replied + counts.skool_invited + counts.converted;
  const repliedOrLater =
    counts.replied + counts.skool_invited + counts.converted;
  const inviteOrLater = counts.skool_invited + counts.converted;

  const dm_to_reply_rate =
    dmSentOrLater > 0 ? repliedOrLater / dmSentOrLater : 0;
  const reply_to_invite_rate =
    repliedOrLater > 0 ? inviteOrLater / repliedOrLater : 0;
  const invite_to_conversion_rate =
    inviteOrLater > 0 ? counts.converted / inviteOrLater : 0;
  const overall_conversion_rate = total > 0 ? counts.converted / total : 0;

  return {
    total,
    new_count: counts.new,
    dm_sent: counts.dm_sent,
    replied: counts.replied,
    skool_invited: counts.skool_invited,
    converted: counts.converted,
    cold: counts.cold,
    dm_to_reply_rate,
    reply_to_invite_rate,
    invite_to_conversion_rate,
    overall_conversion_rate,
    avg_score: scoreCount > 0 ? scoreSum / scoreCount : null,
    leads_7d,
    conversions_7d,
    total_cost_usd: costSum,
  };
}

function emptyStats(): QuizFunnelStats {
  return {
    total: 0,
    new_count: 0,
    dm_sent: 0,
    replied: 0,
    skool_invited: 0,
    converted: 0,
    cold: 0,
    dm_to_reply_rate: 0,
    reply_to_invite_rate: 0,
    invite_to_conversion_rate: 0,
    overall_conversion_rate: 0,
    avg_score: null,
    leads_7d: 0,
    conversions_7d: 0,
    total_cost_usd: 0,
  };
}

export async function updateQuizLeadStatus(
  id: string,
  status: QuizLead["status"],
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from("quiz_leads")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/**
 * Generate the personalized DM message Leonardo will send to a quiz lead.
 * Uses warm-DM style (kratko + curiosity gap + meka CTA) per the
 * feedback_leonardo_warm_dm_style memory rule.
 */
export async function generateQuizDM(
  id: string,
): Promise<{ ok: boolean; dm?: string; error?: string }> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("quiz_leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return { ok: false, error: "lead not found" };

  const lead = data as QuizLead;
  const name = lead.lead_name?.trim() || "ej";
  const score = lead.score ?? "?";
  const matched = lead.matched_case_study;

  let caseRef = "Tom je u 3 mj napravio 17K€";
  if (matched === "matija_3k") caseRef = "Matija je u 2 mj napravio 3K€ s ASMR";
  else if (matched === "vuk_5k") caseRef = "Vuk vrti 5K€/mj na YouTubeu";
  else if (matched === "filmovi_30k")
    caseRef = "Filmovi Ukratko 30K followera u 6 mj";
  else if (matched === "borna_doc") caseRef = "Borna 0→12K za 4 mj";

  const dm = `Ej ${name}! 👋

Vidio sam tvoj quiz score: ${score}/100. Imam jednu ideju za tebe — direktno se mapira na ${caseRef}, samo prilagođeno tvojim odgovorima.

Imaš minutu da ti pošaljem što sam našao?`;

  return { ok: true, dm };
}
