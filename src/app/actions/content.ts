"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface AddContentPostInput {
  platform: "tiktok" | "instagram" | "youtube" | "linkedin";
  postUrl?: string;
  title?: string;
  postedAt?: string;
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  linkClicks?: number;
}

export async function addContentPost(
  input: AddContentPostInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data, error } = await supabase
    .from("content_posts")
    .insert({
      user_id: userData.user.id,
      platform: input.platform,
      post_url: input.postUrl?.trim() || null,
      title: input.title?.trim() || null,
      posted_at: input.postedAt
        ? new Date(input.postedAt).toISOString()
        : new Date().toISOString(),
      views: input.views ?? 0,
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      saves: input.saves ?? 0,
      link_clicks: input.linkClicks ?? 0,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export interface UpdateContentStatsInput {
  id: string;
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  linkClicks?: number;
}

export async function updateContentStats(
  input: UpdateContentStatsInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.views !== undefined) patch.views = input.views;
  if (input.likes !== undefined) patch.likes = input.likes;
  if (input.comments !== undefined) patch.comments = input.comments;
  if (input.saves !== undefined) patch.saves = input.saves;
  if (input.linkClicks !== undefined) patch.link_clicks = input.linkClicks;
  const { error } = await supabase
    .from("content_posts")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteContentPost(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
