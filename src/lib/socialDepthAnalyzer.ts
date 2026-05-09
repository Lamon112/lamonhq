/**
 * Social Depth Analyzer.
 *
 * Goes beyond "does the profile exist" to "how DEEP is their content
 * game?". Distinguishes a clinic that has IG with 50 followers from one
 * with viral 5.8M-view TikToks.
 *
 * The pitch tier flowing out of this drives Holmes synthesis:
 *
 *   starter      — empty/dead profiles. Pitch: content strategy + foundation.
 *   intermediate — regular posting, modest reach. Pitch: distribution +
 *                  automation backend (chatbot, nurture, retargeting).
 *   veteran      — 10K+ followers OR a viral hit. Pitch: AI gatekeeper
 *                  + premium filter + conversion optimization.
 *   dead         — every channel dead. Pitch: foundational web/automation
 *                  only — or skip.
 */

import { fetchTikTokProfileStats, TikTokError } from "@/lib/tiktok";
import { fetchYouTubeChannelStats, YouTubeError } from "@/lib/youtube";
import {
  checkInstagramProfile,
  checkLinkedInProfile,
} from "@/lib/channelHealth";

export type SocialPitchTier =
  | "starter"
  | "intermediate"
  | "veteran"
  | "dead";

export interface ChannelDepth {
  url?: string;
  followers?: number;
  postsCount?: number;
  totalViews?: number;
  topViewCount?: number; // most-viewed video / item we observed
  status: "alive" | "dormant" | "dead" | "blocked" | "unknown";
  reason?: string;
}

export interface SocialDepth {
  tiktok?: ChannelDepth;
  instagram?: ChannelDepth;
  youtube?: ChannelDepth;
  linkedin?: ChannelDepth;
  tier: SocialPitchTier;
  tier_reason: string;
  /** 0-100 composite score blending all channels */
  score: number;
}

/* --------------------------- Per-channel ---------------------------- */

async function analyzeTikTok(url: string): Promise<ChannelDepth> {
  try {
    const handle = extractHandle(url);
    const stats = await fetchTikTokProfileStats(handle);
    // The profile JSON we get from /lib/tiktok contains the itemList for
    // the most-recent posts. Pull the highest playCount we can see.
    const raw = stats.raw as
      | { user?: Record<string, unknown>; stats?: Record<string, unknown>; itemList?: Array<{ stats?: { playCount?: number } }> }
      | undefined;
    const items = (raw?.itemList ?? []) as Array<{ stats?: { playCount?: number } }>;
    const topView = items.reduce(
      (max, it) => Math.max(max, Number(it.stats?.playCount ?? 0)),
      0,
    );
    const status: ChannelDepth["status"] =
      stats.videoCount === 0
        ? "dead"
        : stats.followers < 100
          ? "dormant"
          : "alive";
    return {
      url,
      followers: stats.followers,
      postsCount: stats.videoCount,
      totalViews: stats.hearts,
      topViewCount: topView || undefined,
      status,
    };
  } catch (e) {
    return {
      url,
      status: "unknown",
      reason: e instanceof TikTokError ? e.message : "fetch failed",
    };
  }
}

async function analyzeYouTube(handleOrUrl: string): Promise<ChannelDepth> {
  try {
    const handle = extractHandle(handleOrUrl);
    const stats = await fetchYouTubeChannelStats(
      handle.startsWith("@") ? handle : `@${handle}`,
    );
    const status: ChannelDepth["status"] =
      stats.videoCount === 0
        ? "dead"
        : stats.subscribers < 100
          ? "dormant"
          : "alive";
    return {
      url: handleOrUrl,
      followers: stats.subscribers,
      postsCount: stats.videoCount,
      totalViews: stats.totalViews,
      status,
    };
  } catch (e) {
    return {
      url: handleOrUrl,
      status: "unknown",
      reason: e instanceof YouTubeError ? e.message : "fetch failed",
    };
  }
}

async function analyzeInstagram(url: string): Promise<ChannelDepth> {
  const h = await checkInstagramProfile(url);
  return {
    url,
    followers: h.followers,
    postsCount: h.postCount,
    status:
      h.status === "recently_active"
        ? "alive"
        : (h.status as ChannelDepth["status"]),
    reason: h.reason,
  };
}

async function analyzeLinkedIn(url: string): Promise<ChannelDepth> {
  const h = await checkLinkedInProfile(url);
  return {
    url,
    followers: h.followers,
    status:
      h.status === "recently_active"
        ? "alive"
        : (h.status as ChannelDepth["status"]),
    reason: h.reason,
  };
}

/* --------------------------- Tier logic ----------------------------- */

function classifyTier(d: Omit<SocialDepth, "tier" | "tier_reason" | "score">): {
  tier: SocialPitchTier;
  reason: string;
} {
  const channels = [d.tiktok, d.instagram, d.youtube, d.linkedin].filter(
    (c): c is ChannelDepth => !!c,
  );
  // No social channels found in scrape — but the clinic still has a
  // website (Holmes wouldn't run depth at all otherwise), so default
  // to STARTER ("they exist, just don't have a content game we can
  // detect") rather than "dead". Avoids wrongly nuking obviously-real
  // clinics whose social URLs we just couldn't scrape.
  if (channels.length === 0)
    return {
      tier: "starter",
      reason: "Nismo pronašli social kanale u scrape-u — vjerojatno content beginner ili JS-rendered footer",
    };

  // Veteran: any single viral hit OR any 10K+ followers
  for (const c of channels) {
    if ((c.topViewCount ?? 0) >= 1_000_000) {
      return {
        tier: "veteran",
        reason: `Viralni hit ${formatBig(c.topViewCount!)} views — content veteran`,
      };
    }
    if ((c.followers ?? 0) >= 10_000) {
      return {
        tier: "veteran",
        reason: `${formatBig(c.followers!)} followers na ${labelFor(c)} — established creator`,
      };
    }
  }

  // Intermediate: 1K-10K followers OR consistent posting
  for (const c of channels) {
    if ((c.followers ?? 0) >= 1_000 && c.status === "alive") {
      return {
        tier: "intermediate",
        reason: `${formatBig(c.followers!)} followers + aktivan profil`,
      };
    }
    if ((c.postsCount ?? 0) >= 30 && c.status === "alive") {
      return {
        tier: "intermediate",
        reason: `${c.postsCount} postova — postoji content engine`,
      };
    }
  }

  // Filter out channels we couldn't actually inspect (blocked / unknown)
  // — they should NOT count toward "dead" classification because the
  // underlying profile is probably fine, we just can't see it from a
  // datacenter IP.
  const inspectable = channels.filter(
    (c) => c.status !== "blocked" && c.status !== "unknown",
  );

  if (inspectable.length === 0) {
    // Profiles exist + we have URLs, but every health check was blocked.
    // Default to starter so the synthesis pitches general content angles
    // rather than premium / dead.
    return {
      tier: "starter",
      reason: "Profili postoje ali health check blokiran (datacenter IP) — pretpostavi starter",
    };
  }

  // Dead: every inspectable channel is dead/dormant with <50 followers
  const allWeak = inspectable.every(
    (c) =>
      c.status === "dead" ||
      (c.status === "dormant" && (c.followers ?? 0) < 50),
  );
  if (allWeak)
    return {
      tier: "dead",
      reason: "Svi inspectable profili mrtvi ili <50 followers",
    };

  return {
    tier: "starter",
    reason: "Profili postoje ali content game je rani",
  };
}

function compositeScore(d: Omit<SocialDepth, "tier" | "tier_reason" | "score">): number {
  const channels = [d.tiktok, d.instagram, d.youtube, d.linkedin].filter(
    (c): c is ChannelDepth => !!c,
  );
  if (channels.length === 0) return 0;
  let s = 0;
  for (const c of channels) {
    if ((c.topViewCount ?? 0) >= 1_000_000) s += 35;
    else if ((c.followers ?? 0) >= 10_000) s += 25;
    else if ((c.followers ?? 0) >= 1_000) s += 10;
    else if ((c.followers ?? 0) >= 100) s += 4;
    else if (c.status === "alive") s += 2;
  }
  return Math.min(100, s);
}

function labelFor(c: ChannelDepth): string {
  if (c === undefined) return "channel";
  return c.url?.includes("instagram") ? "IG" :
    c.url?.includes("tiktok") ? "TikTok" :
      c.url?.includes("youtube") ? "YouTube" :
        c.url?.includes("linkedin") ? "LinkedIn" : "channel";
}

function formatBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function extractHandle(url: string): string {
  if (url.startsWith("@")) return url;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    return path.split("/")[0] ?? url;
  } catch {
    return url;
  }
}

/* --------------------------- Bulk dispatcher ------------------------ */

export interface SocialChannelInput {
  tiktok?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
}

export async function analyzeSocialDepth(
  channels: SocialChannelInput,
): Promise<SocialDepth> {
  const tasks: Array<Promise<unknown>> = [];
  let tt: ChannelDepth | undefined;
  let ig: ChannelDepth | undefined;
  let yt: ChannelDepth | undefined;
  let li: ChannelDepth | undefined;

  if (channels.tiktok)
    tasks.push(analyzeTikTok(channels.tiktok).then((r) => (tt = r)));
  if (channels.instagram)
    tasks.push(analyzeInstagram(channels.instagram).then((r) => (ig = r)));
  if (channels.youtube)
    tasks.push(analyzeYouTube(channels.youtube).then((r) => (yt = r)));
  if (channels.linkedin)
    tasks.push(analyzeLinkedIn(channels.linkedin).then((r) => (li = r)));
  await Promise.all(tasks);

  const partial = { tiktok: tt, instagram: ig, youtube: yt, linkedin: li };
  const { tier, reason } = classifyTier(partial);
  const score = compositeScore(partial);
  return { ...partial, tier, tier_reason: reason, score };
}
