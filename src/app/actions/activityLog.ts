"use server";

import { createClient } from "@/lib/supabase/server";
import { type ActivityPayload, type ActivityType } from "@/lib/notion";
import { notionSync } from "./notionSync";

export interface ActivityRow {
  id: string;
  room: string | null;
  action: ActivityType | string;
  metadata: {
    title?: string;
    summary?: string;
    hqRowId?: string;
    amountEur?: number;
    tags?: string[];
  } | null;
  created_at: string;
}

/**
 * Single entry point for HQ events. Writes locally + fires Notion sync.
 * Fire-and-forget — never throws.
 */
export async function logActivity(
  userId: string,
  payload: ActivityPayload,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("activity_log").insert({
      user_id: userId,
      room: payload.hqRoom ?? null,
      action: payload.type,
      metadata: {
        title: payload.title,
        summary: payload.summary,
        hqRowId: payload.hqRowId,
        amountEur: payload.amountEur,
        tags: payload.tags,
      },
    });
  } catch {
    // never throw
  }
  void notionSync(payload);
}

export async function getRecentActivity(
  limit = 30,
): Promise<ActivityRow[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("activity_log")
    .select("id, room, action, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ActivityRow[];
}
