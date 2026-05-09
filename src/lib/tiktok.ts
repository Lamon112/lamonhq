/**
 * Public TikTok profile scraper. Parses __UNIVERSAL_DATA_FOR_REHYDRATION__
 * JSON injected by tiktok.com to extract follower/like/video counts.
 *
 * No API key, no OAuth. TikTok actively blocks datacenter IPs with 403/CAPTCHA;
 * if that happens we surface the error so the caller can fall back to manual
 * entry.
 */

export interface TikTokProfileStats {
  handle: string;
  uniqueId: string;
  nickname: string | null;
  followers: number;
  following: number;
  hearts: number;
  videoCount: number;
  raw: unknown;
}

export class TikTokError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "TikTokError";
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function clean(handle: string): string {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

export async function fetchTikTokProfileStats(
  handle: string,
): Promise<TikTokProfileStats> {
  const uniqueId = clean(handle);
  const url = `https://www.tiktok.com/@${encodeURIComponent(uniqueId)}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,hr;q=0.8",
    },
  });
  if (!res.ok) {
    throw new TikTokError(
      `TikTok HTTP ${res.status} for @${uniqueId}`,
      res.status,
    );
  }
  const html = await res.text();

  const m = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) {
    if (/captcha|verify|robots/i.test(html)) {
      throw new TikTokError(
        `TikTok serving CAPTCHA/verification for @${uniqueId} (likely datacenter IP block)`,
      );
    }
    throw new TikTokError(
      `Could not find rehydration JSON for @${uniqueId}`,
    );
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    throw new TikTokError(`Malformed JSON for @${uniqueId}`);
  }

  const scope = (parsed.__DEFAULT_SCOPE__ ?? {}) as Record<string, unknown>;
  const userDetail = scope["webapp.user-detail"] as
    | { userInfo?: { user?: Record<string, unknown>; stats?: Record<string, unknown> } }
    | undefined;
  const userInfo = userDetail?.userInfo;
  const user = userInfo?.user;
  const stats = userInfo?.stats;
  if (!user || !stats) {
    throw new TikTokError(
      `Profile @${uniqueId} missing userInfo (private/banned/typo?)`,
    );
  }

  // Sweep the entire parsed JSON for playCount values — catches pinned
  // / featured video view counts that aren't surfaced in the canonical
  // userInfo.stats block (e.g. Štimac's 5.8M-view pinned video isn't
  // in stats.heart but lives in the rehydration scope under itemList).
  const allPlayCounts = collectPlayCounts(parsed);
  const topPlayCount = allPlayCounts.length > 0 ? Math.max(...allPlayCounts) : 0;

  return {
    handle: `@${uniqueId}`,
    uniqueId: String(user.uniqueId ?? uniqueId),
    nickname: (user.nickname as string | undefined) ?? null,
    followers: Number(stats.followerCount ?? 0),
    following: Number(stats.followingCount ?? 0),
    hearts: Number(stats.heart ?? stats.heartCount ?? 0),
    videoCount: Number(stats.videoCount ?? 0),
    raw: { user, stats, topPlayCount, allPlayCountsCount: allPlayCounts.length },
  };
}

function collectPlayCounts(obj: unknown, out: number[] = []): number[] {
  if (out.length > 200) return out; // safety cap
  if (typeof obj !== "object" || obj === null) return out;
  if (Array.isArray(obj)) {
    for (const item of obj) collectPlayCounts(item, out);
    return out;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (
      (key === "playCount" || key === "play_count") &&
      typeof value === "number" &&
      value > 0
    ) {
      out.push(value);
    } else if (typeof value === "object" && value !== null) {
      collectPlayCounts(value, out);
    }
  }
  return out;
}

export function defaultTikTokHandles(): string[] {
  const env = process.env.TIKTOK_HANDLES;
  if (env) {
    return env
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
  }
  return ["@lamon.leonardo", "@sidehustlebalkan"];
}
