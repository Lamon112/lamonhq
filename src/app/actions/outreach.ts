"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";

export interface AddOutreachInput {
  leadName: string;
  platform: "linkedin" | "instagram" | "tiktok" | "email" | "other";
  message: string;
  status?: "sent" | "replied" | "no_reply" | "bounced";
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function addOutreach(
  input: AddOutreachInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const leadName = input.leadName.trim();
  if (!leadName) return { ok: false, error: "Lead name je obavezan" };

  const { data, error } = await supabase
    .from("outreach")
    .insert({
      user_id: userData.user.id,
      lead_name: leadName,
      platform: input.platform,
      message: input.message?.trim() || null,
      status: input.status ?? "sent",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "outreach_sent",
    title: `Outreach → ${leadName}`,
    summary: `${input.platform.toUpperCase()}: ${input.message?.slice(0, 200) ?? "(no message)"}`,
    hqRoom: "outreach",
    hqRowId: data.id,
    tags: [input.platform],
  });

  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateOutreachStatus(
  id: string,
  status: "sent" | "replied" | "no_reply" | "bounced",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("outreach")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteOutreach(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("outreach").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}
