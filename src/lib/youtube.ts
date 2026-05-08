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
