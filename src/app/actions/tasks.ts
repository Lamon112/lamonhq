"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface AddTaskInput {
  title: string;
  room?: string;
  dueDate?: string | null;
  notes?: string;
  clientId?: string | null;
  leadId?: string | null;
}

export async function addTask(input: AddTaskInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title je obavezan" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userData.user.id,
      title,
      room: input.room || null,
      status: "todo",
      due_date: input.dueDate || null,
      notes: input.notes?.trim() || null,
      client_id: input.clientId || null,
      lead_id: input.leadId || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function setTaskStatus(
  id: string,
  status: "todo" | "in_progress" | "done",
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "done") patch.completed_at = new Date().toISOString();
  else patch.completed_at = null;
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
