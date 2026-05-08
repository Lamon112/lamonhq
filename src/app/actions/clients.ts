"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";

export interface AddClientInput {
  name: string;
  type: "b2b_clinic" | "coach_mentor" | "affiliate";
  status: "active" | "onboarding" | "paused" | "churned";
  monthlyRevenue: number;
  startDate?: string | null;
  notes?: string;
  nextAction?: string | null;
  nextActionDate?: string | null;
  churnRisk?: "low" | "medium" | "high" | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function addClient(input: AddClientInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ime klijenta je obavezno" };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: userData.user.id,
      name,
      type: input.type,
      status: input.status,
      monthly_revenue: input.monthlyRevenue,
      start_date: input.startDate || null,
      notes: input.notes?.trim() || null,
      next_action: input.nextAction?.trim() || null,
      next_action_date: input.nextActionDate || null,
      churn_risk: input.churnRisk || null,
      last_touchpoint_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "client_added",
    title: `Klijent dodan: ${name}`,
    summary: `${input.type} · ${input.status} · €${input.monthlyRevenue}/mj`,
    hqRoom: "clients",
    hqRowId: data.id,
    amountEur: input.monthlyRevenue,
    tags: [input.type, input.status],
  });

  revalidatePath("/");
  return { ok: true, id: data.id };
}

export interface UpdateClientInput {
  id: string;
  name?: string;
  status?: "active" | "onboarding" | "paused" | "churned";
  monthlyRevenue?: number;
  notes?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  churnRisk?: "low" | "medium" | "high" | null;
  bumpTouchpoint?: boolean;
}

export async function updateClient(
  input: UpdateClientInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.status !== undefined) patch.status = input.status;
  if (input.monthlyRevenue !== undefined)
    patch.monthly_revenue = input.monthlyRevenue;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.nextAction !== undefined)
    patch.next_action = input.nextAction?.trim() || null;
  if (input.nextActionDate !== undefined)
    patch.next_action_date = input.nextActionDate || null;
  if (input.churnRisk !== undefined) patch.churn_risk = input.churnRisk;
  if (input.bumpTouchpoint) patch.last_touchpoint_at = new Date().toISOString();

  const { error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
