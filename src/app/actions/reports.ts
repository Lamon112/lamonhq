"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";

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
  const { data: userData } = await supabase.auth.getUser();
  const { data: report } = await supabase
    .from("weekly_reports")
    .select("client_id, week_start, content")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("weekly_reports")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (report && userData.user) {
    let clientName = "?";
    const { data: c } = await supabase
      .from("clients")
      .select("name")
      .eq("id", report.client_id)
      .maybeSingle();
    if (c?.name) clientName = c.name;
    void logActivity(userData.user.id, {
      type: "report_sent",
      title: `Weekly report sent: ${clientName} · ${report.week_start}`,
      summary: report.content?.slice(0, 500) ?? undefined,
      hqRoom: "reports",
      hqRowId: id,
      tags: ["weekly_report"],
    });
  }

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
