"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}

export async function upsertReport(
  clientId: string,
  content: string,
  weekStart?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const ws = weekStart ?? currentWeekStart();

  const { data, error } = await supabase
    .from("weekly_reports")
    .upsert(
      {
        user_id: userData.user.id,
        client_id: clientId,
        week_start: ws,
        content,
        status: "draft",
      },
      { onConflict: "client_id,week_start" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function markReportSent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_reports")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteReport(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_reports")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
