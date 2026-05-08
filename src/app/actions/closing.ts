"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface UpdateProbabilityInput {
  id: string;
  probability: number | null;
  estimatedValue?: number | null;
}

export async function updateDealProbability(
  input: UpdateProbabilityInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { probability: input.probability };
  if (input.estimatedValue !== undefined)
    patch.estimated_value = input.estimatedValue;
  const { error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export interface CloseWonInput {
  leadId: string;
  monthlyRevenue: number;
  startDate?: string;
  type?: "b2b_clinic" | "coach_mentor" | "affiliate";
  notes?: string;
}

export async function closeDealWon(
  input: CloseWonInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  // 1. Mark lead as closed_won
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .update({ stage: "closed_won", probability: 1 })
    .eq("id", input.leadId)
    .select("name, niche, notes")
    .single();
  if (leadErr) return { ok: false, error: leadErr.message };

  // 2. Create client from lead
  const inferredType: "b2b_clinic" | "coach_mentor" | "affiliate" =
    input.type ??
    (lead.niche === "coach" ? "coach_mentor" : "b2b_clinic");

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      user_id: userData.user.id,
      name: lead.name,
      type: inferredType,
      status: "onboarding",
      monthly_revenue: input.monthlyRevenue,
      start_date: input.startDate ?? new Date().toISOString().slice(0, 10),
      notes: input.notes
        ? `${input.notes}\n\nFrom lead: ${lead.notes ?? ""}`
        : (lead.notes ?? null),
      last_touchpoint_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (clientErr) return { ok: false, error: clientErr.message };

  revalidatePath("/");
  return { ok: true, id: client.id };
}

export async function closeDealLost(leadId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ stage: "closed_lost", probability: 0 })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
