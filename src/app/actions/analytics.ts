"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  defaultHandle,
  fetchYouTubeChannelStats,
  YouTubeError,
  type YouTubeChannelStats,
} from "@/lib/youtube";

export interface RefreshResult {
  ok: boolean;
  error?: string;
  stats?: YouTubeChannelStats;
  fetchedAt?: string;
}

const STALE_MS = 10 * 60 * 1000; // 10 minutes — YouTube quota is 10K/day

export async function refreshYouTubeStats(
  opts: { force?: boolean } = {},
): Promise<RefreshResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  if (!opts.force) {
    const { data: latest } = await supabase
      .from("social_channel_stats")
      .select("fetched_at")
      .eq("user_id", userData.user.id)
      .eq("platform", "youtube")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      latest?.fetched_at &&
      Date.now() - new Date(latest.fetched_at).getTime() < STALE_MS
    ) {
      return { ok: true, fetchedAt: latest.fetched_at };
    }
  }

  let stats: YouTubeChannelStats;
  try {
    stats = await fetchYouTubeChannelStats(defaultHandle());
  } catch (err) {
    const msg = err instanceof YouTubeError ? err.message : "YouTube fetch failed";
    return { ok: false, error: msg };
  }

  const fetchedAt = new Date().toISOString();
  const { error } = await supabase.from("social_channel_stats").insert({
    user_id: userData.user.id,
    platform: "youtube",
    handle: stats.handle,
    channel_id: stats.channelId,
    subscribers: stats.subscribers,
    total_views: stats.totalViews,
    video_count: stats.videoCount,
    fetched_at: fetchedAt,
    raw: stats.raw as object,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true, stats, fetchedAt };
}
