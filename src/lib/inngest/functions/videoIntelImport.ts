/**
 * Video Intel Import — nightly cron that pulls Leonardov own-channel
 * performance data from YouTube + TikTok + Instagram and computes viral
 * multipliers per account.
 *
 * Source accounts (Leonardo, 2026-05-14 directive):
 *   - YouTube  @lamon.leonardo   (B2B / Plima brand)
 *   - YouTube  @sidequestshr     (B2C / SideHustle brand)
 *   - TikTok   @sidehustlebalkan
 *   - IG       @sidequestshr
 *
 * What "10x viral" means: views >= 10 × median for that account.
 *
 * v1 (this file): YouTube only via Data API v3. TikTok + IG need
 * scrape paths (no official public APIs); v1.1 adds those via a
 * separate worker.
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { resolveChannel, fetchRecentVideos } from "@/lib/youtube";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const LEO_YT_CHANNELS = [
  { handle: "@lamon.leonardo", brand: "lamon" },
  { handle: "@sidequestshr", brand: "sidehustle" },
];

interface IntelRow {
  platform: "youtube";
  account_handle: string;
  external_video_id: string;
  url: string;
  title: string;
  description: string;
  duration_seconds: number | null;
  published_at: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
}

function median(arr: number[]): number {
  const filtered = arr.filter((n) => Number.isFinite(n) && n > 0);
  if (filtered.length === 0) return 0;
  const sorted = [...filtered].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const videoIntelImport = inngest.createFunction(
  {
    id: "video-intel-nightly-import",
    name: "Video intel — nightly Leonardo account ingest",
    retries: 1,
    triggers: [{ cron: "0 1 * * *" }], // 01:00 UTC = 02-03 Zagreb
  },
  async () => {
    const supabase = getServiceSupabase();
    const errors: string[] = [];
    let imported = 0;
    let top10xMarked = 0;

    for (const ch of LEO_YT_CHANNELS) {
      try {
        const channel = await resolveChannel(ch.handle);
        if (!channel) {
          errors.push(`${ch.handle}: channel resolve failed`);
          continue;
        }
        // Pull last 50 — recent + enough history for median calc
        const videos = await fetchRecentVideos(channel, 50);
        if (videos.length === 0) continue;

        const viewCounts = videos
          .map((v) => v.viewCount ?? 0)
          .filter((n) => n > 0);
        const med = median(viewCounts);

        const rows: IntelRow[] = videos.map((v) => ({
          platform: "youtube",
          account_handle: ch.handle,
          external_video_id: v.videoId,
          url: v.url,
          title: v.title,
          description: v.description,
          duration_seconds: v.durationSeconds,
          published_at: v.publishedAt,
          view_count: v.viewCount,
          like_count: v.likeCount,
          comment_count: v.commentCount,
        }));

        // Upsert each with derived viral_multiplier + is_top_10x
        for (const r of rows) {
          const views = r.view_count ?? 0;
          const viralMult = med > 0 ? views / med : 0;
          const engagement =
            views > 0
              ? ((r.like_count ?? 0) + (r.comment_count ?? 0)) / views
              : 0;
          const isTop10x = viralMult >= 10;

          const { error } = await supabase.from("video_intel").upsert(
            {
              ...r,
              viral_multiplier: Number(viralMult.toFixed(2)),
              engagement_rate: Number(engagement.toFixed(4)),
              is_top_10x: isTop10x,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "platform,external_video_id" },
          );
          if (error) {
            errors.push(`${r.external_video_id}: ${error.message}`);
            continue;
          }
          imported++;
          if (isTop10x) top10xMarked++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${ch.handle}: ${msg}`);
      }
    }

    return {
      ok: true,
      imported,
      top10xMarked,
      errors: errors.length,
      sampleErrors: errors.slice(0, 3),
    };
  },
);
