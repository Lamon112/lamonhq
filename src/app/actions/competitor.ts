"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function addCompetitor(
  name: string,
  url?: string,
  notes?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ime je obavezno" };
  const { data, error } = await supabase
    .from("competitors")
    .insert({
      user_id: userData.user.id,
      name: trimmed,
      url: url?.trim() || null,
      notes: notes?.trim() || null,
      last_check_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function deleteCompetitor(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function logCompetitorUpdate(
  competitorId: string,
  observation: string,
  url?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const trimmed = observation.trim();
  if (!trimmed) return { ok: false, error: "Observation je obavezan" };

  const { data, error } = await supabase
    .from("competitor_updates")
    .insert({
      user_id: userData.user.id,
      competitor_id: competitorId,
      observation: trimmed,
      url: url?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Bump last_check_at
  await supabase
    .from("competitors")
    .update({ last_check_at: new Date().toISOString() })
    .eq("id", competitorId);

  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function deleteCompetitorUpdate(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("competitor_updates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
