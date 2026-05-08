"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";

export type Niche =
  | "stomatologija"
  | "estetska"
  | "fizio"
  | "ortopedija"
  | "coach"
  | "other";

export type Source =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "referral"
  | "other";

export type Stage =
  | "discovery"
  | "pricing"
  | "financing"
  | "booking"
  | "closed_won"
  | "closed_lost";

export interface AddLeadInput {
  name: string;
  source?: Source | null;
  niche?: Niche | null;
  icpBreakdown?: Record<string, number>;
  estimatedValue?: number | null;
  notes?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function totalScore(breakdown?: Record<string, number>): number {
  if (!breakdown) return 0;
  return Object.values(breakdown).reduce((s, v) => s + (Number(v) || 0), 0);
}

export async function addLead(input: AddLeadInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ime lead-a je obavezno" };

  const score = totalScore(input.icpBreakdown);

  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: userData.user.id,
      name,
      source: input.source ?? null,
      niche: input.niche ?? null,
      icp_score: score,
      icp_breakdown: input.icpBreakdown ?? {},
      stage: "discovery",
      estimated_value: input.estimatedValue ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "lead_scored",
    title: `Lead score: ${name} · ${score}/20`,
    summary: `${input.niche ?? "?"} · ${input.source ?? "?"} · estimated €${input.estimatedValue ?? 0}`,
    hqRoom: "lead_scorer",
    hqRowId: data.id,
    amountEur: input.estimatedValue ?? undefined,
    tags: [input.niche, input.source].filter(Boolean) as string[],
  });

  revalidatePath("/");
  return { ok: true, id: data.id };
}

export interface UpdateLeadInput {
  id: string;
  name?: string;
  source?: Source | null;
  niche?: Niche | null;
  icpBreakdown?: Record<string, number>;
  stage?: Stage;
  estimatedValue?: number | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  notes?: string | null;
  discoveryAt?: string | null;
  discoveryOutcome?: string | null;
  discoveryNotes?: string | null;
}

export async function updateLead(
  input: UpdateLeadInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.source !== undefined) patch.source = input.source;
  if (input.niche !== undefined) patch.niche = input.niche;
  if (input.icpBreakdown !== undefined) {
    patch.icp_breakdown = input.icpBreakdown;
    patch.icp_score = totalScore(input.icpBreakdown);
  }
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.estimatedValue !== undefined)
    patch.estimated_value = input.estimatedValue;
  if (input.nextAction !== undefined)
    patch.next_action = input.nextAction?.trim() || null;
  if (input.nextActionDate !== undefined)
    patch.next_action_date = input.nextActionDate || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.discoveryAt !== undefined) patch.discovery_at = input.discoveryAt;
  if (input.discoveryOutcome !== undefined)
    patch.discovery_outcome = input.discoveryOutcome;
  if (input.discoveryNotes !== undefined)
    patch.discovery_notes = input.discoveryNotes?.trim() || null;

  const { error } = await supabase.from("leads").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
