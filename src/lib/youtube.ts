/**
 * Thin wrapper around YouTube Data API v3 for channel-level stats.
 * Uses a server-only API key (YOUTUBE_API_KEY env). The handle is taken
 * from YOUTUBE_CHANNEL_HANDLE env (defaults to "@lamon.leonardo").
 */

const API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeChannelStats {
  channelId: string;
  handle: string | null;
  title: string | null;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  raw: unknown;
}

export class YouTubeError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "YouTubeError";
  }
}

function requireKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("YOUTUBE_API_KEY missing");
  return key;
}

export function defaultHandle(): string {
  return process.env.YOUTUBE_CHANNEL_HANDLE ?? "@LeonardoLamonOfficial";
}

/**
 * Resolve a @handle to YouTube channel stats.
 * The Data API v3 "channels" endpoint accepts forHandle (e.g. "@lamon.leonardo").
 * Strips a leading "@" if present, but the API also accepts it with "@".
 */
export async function fetchYouTubeChannelStats(
  handle: string = defaultHandle(),
): Promise<YouTubeChannelStats> {
  const key = requireKey();
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const url =
    `${API_BASE}/channels?part=snippet,statistics` +
    `&forHandle=${encodeURIComponent(cleanHandle)}` +
    `&key=${encodeURIComponent(key)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new YouTubeError(
      `YouTube API ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; customUrl?: string };
      statistics?: {
        subscriberCount?: string;
        viewCount?: string;
        videoCount?: string;
      };
    }>;
  };

  const item = json.items?.[0];
  if (!item)
    throw new YouTubeError(`No channel found for handle "${cleanHandle}"`);

  return {
    channelId: item.id,
    handle: item.snippet?.customUrl ?? cleanHandle,
    title: item.snippet?.title ?? null,
    subscribers: Number(item.statistics?.subscriberCount ?? 0),
    totalViews: Number(item.statistics?.viewCount ?? 0),
    videoCount: Number(item.statistics?.videoCount ?? 0),
    raw: item,
  };
}

/* ─────────────────────────────────────────────────────────────────────
 * Niche Hunter helpers — fetch recent uploads for a curated guru list.
 *
 * Used by the bi-weekly cron (src/lib/inngest/functions/nicheHunterCron.ts)
 * to gather the last 5 videos per channel + their view counts. Then a
 * Claude pass over titles+descriptions extracts emerging niches.
 *
 * Quota: ~3 units per channel (channels.list + playlistItems.list +
 * videos.list batch). 6 gurus × 3 = 18 units / cycle. Free tier is
 * 10K/day. Effectively zero cost.
 * ───────────────────────────────────────────────────────────────────── */

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number | null;
  url: string;
}

export interface YouTubeChannelResolved {
  channelId: string;
  channelTitle: string;
  uploadsPlaylistId: string;
  subscriberCount: number | null;
}

/**
 * Resolve a channel by ID (UC...), handle (@xxx), or username. Returns
 * the uploads playlist ID we'll use to fetch recent videos.
 *
 * Lighter version of fetchYouTubeChannelStats — keeps both because the
 * existing one is used by the YouTube Lab room and changing its shape
 * would ripple into UI code.
 */
export async function resolveChannel(
  identifier: string,
): Promise<YouTubeChannelResolved | null> {
  const key = requireKey();
  const url = new URL(`${API_BASE}/channels`);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  if (identifier.startsWith("UC") && identifier.length > 20) {
    url.searchParams.set("id", identifier);
  } else if (identifier.startsWith("@")) {
    url.searchParams.set("forHandle", identifier);
  } else {
    url.searchParams.set("forUsername", identifier);
  }
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
      statistics?: { subscriberCount?: string };
    }>;
  };
  const item = data.items?.[0];
  if (!item) return null;
  const uploads = item.contentDetails?.relatedPlaylists?.uploads ?? "";
  if (!uploads) return null;
  return {
    channelId: item.id,
    channelTitle: item.snippet?.title ?? identifier,
    uploadsPlaylistId: uploads,
    subscriberCount: item.statistics?.subscriberCount
      ? parseInt(item.statistics.subscriberCount, 10)
      : null,
  };
}

/**
 * Fetch the N most recent uploads from a channel's uploads playlist,
 * enriched with statistics + duration.
 */
export async function fetchRecentVideos(
  channel: YouTubeChannelResolved,
  maxResults = 5,
): Promise<YouTubeVideo[]> {
  if (!channel.uploadsPlaylistId) return [];
  const key = requireKey();

  const listUrl = new URL(`${API_BASE}/playlistItems`);
  listUrl.searchParams.set("part", "snippet,contentDetails");
  listUrl.searchParams.set("playlistId", channel.uploadsPlaylistId);
  listUrl.searchParams.set("maxResults", String(Math.min(50, maxResults)));
  listUrl.searchParams.set("key", key);

  const listRes = await fetch(listUrl, { cache: "no-store" });
  if (!listRes.ok) return [];
  const listData = (await listRes.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        channelId?: string;
        channelTitle?: string;
        resourceId?: { videoId?: string };
      };
      contentDetails?: { videoId?: string };
    }>;
  };
  const items = listData.items ?? [];
  const videoIds = items
    .map((i) => i.contentDetails?.videoId ?? i.snippet?.resourceId?.videoId)
    .filter((id): id is string => Boolean(id));
  if (videoIds.length === 0) return [];

  const statsUrl = new URL(`${API_BASE}/videos`);
  statsUrl.searchParams.set("part", "statistics,contentDetails");
  statsUrl.searchParams.set("id", videoIds.join(","));
  statsUrl.searchParams.set("key", key);
  const statsRes = await fetch(statsUrl, { cache: "no-store" });
  const statsMap = new Map<
    string,
    {
      viewCount: number | null;
      likeCount: number | null;
      commentCount: number | null;
      durationSeconds: number | null;
    }
  >();
  if (statsRes.ok) {
    const statsData = (await statsRes.json()) as {
      items?: Array<{
        id: string;
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
        contentDetails?: { duration?: string };
      }>;
    };
    for (const v of statsData.items ?? []) {
      statsMap.set(v.id, {
        viewCount: v.statistics?.viewCount
          ? parseInt(v.statistics.viewCount, 10)
          : null,
        likeCount: v.statistics?.likeCount
          ? parseInt(v.statistics.likeCount, 10)
          : null,
        commentCount: v.statistics?.commentCount
          ? parseInt(v.statistics.commentCount, 10)
          : null,
        durationSeconds: v.contentDetails?.duration
          ? parseISO8601Duration(v.contentDetails.duration)
          : null,
      });
    }
  }

  return items
    .map((item) => {
      const videoId =
        item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      if (!videoId) return null;
      const s = statsMap.get(videoId);
      return {
        videoId,
        title: item.snippet?.title ?? "",
        description: item.snippet?.description ?? "",
        publishedAt: item.snippet?.publishedAt ?? "",
        channelId: item.snippet?.channelId ?? channel.channelId,
        channelTitle: item.snippet?.channelTitle ?? channel.channelTitle,
        viewCount: s?.viewCount ?? null,
        likeCount: s?.likeCount ?? null,
        commentCount: s?.commentCount ?? null,
        durationSeconds: s?.durationSeconds ?? null,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      } as YouTubeVideo;
    })
    .filter((v): v is YouTubeVideo => v !== null);
}

/** Parse ISO 8601 duration ("PT4M13S") into seconds. */
function parseISO8601Duration(d: string): number {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  return h * 3600 + min * 60 + s;
}
