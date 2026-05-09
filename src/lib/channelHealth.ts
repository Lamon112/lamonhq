/**
 * Channel health checker — verifies social profiles & websites for a lead.
 *
 * Two layers:
 *   1. cheap HTTP probe (HEAD/GET) — does the URL even exist?
 *   2. profile parse — followers, post count, last activity for IG/LI
 *
 * No third-party APIs, no auth, no cost. TikTok blocking is rare (proven
 * by lib/tiktok.ts), Instagram and LinkedIn are tougher but their public
 * profile HTML still leaks the meta tags we need.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type HealthStatus =
  | "alive"
  | "recently_active"
  | "dormant"
  | "dead"
  | "blocked"
  | "unknown";

export interface ChannelHealth {
  url: string;
  status: HealthStatus;
  followers?: number;
  postCount?: number;
  lastActivityDays?: number; // age of most recent post in days
  reason?: string; // human-readable note ("0 posts", "404", "<10 followers")
}

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hr;q=0.8",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/** Lightweight existence check — works for any URL. Treats 4xx as dead, 5xx as unknown. */
async function probeUrl(url: string): Promise<{
  ok: boolean;
  status: number;
  finalUrl: string;
}> {
  try {
    const res = await fetchWithTimeout(url, { method: "GET", redirect: "follow" });
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch {
    return { ok: false, status: 0, finalUrl: url };
  }
}

/* --------------------------------------------------------------------- */
/* Instagram                                                             */
/* --------------------------------------------------------------------- */

export async function checkInstagramProfile(url: string): Promise<ChannelHealth> {
  const out: ChannelHealth = { url, status: "unknown" };
  let html: string;
  try {
    const res = await fetchWithTimeout(url);
    if (res.status === 404) {
      out.status = "dead";
      out.reason = "404 — handle ne postoji";
      return out;
    }
    if (!res.ok) {
      out.status = res.status >= 500 ? "unknown" : "blocked";
      out.reason = `HTTP ${res.status}`;
      return out;
    }
    html = await res.text();
  } catch (e) {
    out.status = "unknown";
    out.reason = e instanceof Error ? e.message : "fetch failed";
    return out;
  }

  // IG sometimes serves a meta description like:
  //   "<og:description content='1,234 Followers, 567 Following, 89 Posts ...'>"
  const desc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];

  if (desc) {
    const fol = parseSocialCount(desc.match(/([\d.,KMk]+)\s+Followers/)?.[1]);
    const posts = parseSocialCount(desc.match(/([\d.,KMk]+)\s+Posts/)?.[1]);
    if (fol != null) out.followers = fol;
    if (posts != null) out.postCount = posts;
  }

  // If IG redirected to login wall, mark blocked
  if (/accounts\/login/i.test(html) && !desc) {
    out.status = "blocked";
    out.reason = "IG vraća login wall (datacenter IP)";
    return out;
  }

  // Heuristic decisions
  if (out.postCount === 0) {
    out.status = "dead";
    out.reason = "0 postova";
  } else if ((out.followers ?? 0) < 10 && (out.postCount ?? 0) < 3) {
    out.status = "dead";
    out.reason = `${out.followers ?? 0} followers · ${out.postCount ?? 0} postova`;
  } else if ((out.followers ?? 0) < 100) {
    out.status = "dormant";
    out.reason = `samo ${out.followers} followers`;
  } else {
    out.status = "alive";
  }
  return out;
}

/* --------------------------------------------------------------------- */
/* LinkedIn                                                              */
/* --------------------------------------------------------------------- */

export async function checkLinkedInProfile(url: string): Promise<ChannelHealth> {
  const out: ChannelHealth = { url, status: "unknown" };
  let html: string;
  try {
    const res = await fetchWithTimeout(url);
    if (res.status === 404 || res.status === 410) {
      out.status = "dead";
      out.reason = `HTTP ${res.status}`;
      return out;
    }
    if (res.status === 999 || res.status === 403) {
      out.status = "blocked";
      out.reason = "LinkedIn blokira datacenter IP (HTTP " + res.status + ")";
      return out;
    }
    if (!res.ok) {
      out.status = "unknown";
      out.reason = `HTTP ${res.status}`;
      return out;
    }
    html = await res.text();
  } catch (e) {
    out.status = "unknown";
    out.reason = e instanceof Error ? e.message : "fetch failed";
    return out;
  }

  // Public LI company / profile pages embed follower counts in JSON-LD
  // and og:description. Examples we've seen:
  //   "ZDC | Zara Dental Centar | 25 followers on LinkedIn ..."
  //   "Tiberio Zaverski - Orto Nova - 1,234 followers, 500+ connections"
  const desc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    "";

  const folRaw =
    desc.match(/([\d.,KMk]+)\s+followers/i)?.[1] ??
    html.match(/"followerCount":\s*(\d+)/)?.[1] ??
    html.match(/"followers_count":\s*(\d+)/)?.[1];
  const fol = parseSocialCount(folRaw);
  if (fol != null) out.followers = fol;

  if ((out.followers ?? 0) < 50) {
    out.status = "dead";
    out.reason = `samo ${out.followers ?? 0} followers — mrtav profil`;
  } else if ((out.followers ?? 0) < 200) {
    out.status = "dormant";
    out.reason = `${out.followers} followers — slabo aktivan`;
  } else {
    out.status = "alive";
  }
  return out;
}

/* --------------------------------------------------------------------- */
/* Generic web (just probes existence)                                   */
/* --------------------------------------------------------------------- */

export async function checkGenericUrl(url: string): Promise<ChannelHealth> {
  const r = await probeUrl(url);
  if (r.ok)
    return {
      url: r.finalUrl,
      status: "alive",
      reason: r.finalUrl !== url ? `redirected → ${r.finalUrl}` : undefined,
    };
  if (r.status === 0)
    return { url, status: "unknown", reason: "fetch failed / timeout" };
  if (r.status >= 400 && r.status < 500)
    return { url, status: "dead", reason: `HTTP ${r.status}` };
  return { url, status: "unknown", reason: `HTTP ${r.status}` };
}

/* --------------------------------------------------------------------- */
/* Helpers                                                               */
/* --------------------------------------------------------------------- */

function parseSocialCount(s: string | undefined | null): number | undefined {
  if (!s) return undefined;
  const trimmed = s.replace(/,/g, "").trim();
  const m = trimmed.match(/^([\d.]+)\s*([KMk])?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const mult = m[2] ? (m[2].toUpperCase() === "M" ? 1_000_000 : 1_000) : 1;
  return Math.round(n * mult);
}

/* --------------------------------------------------------------------- */
/* Bulk dispatcher                                                       */
/* --------------------------------------------------------------------- */

export interface ChannelSet {
  email?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  phone?: string;
}

export interface ChannelHealthMap {
  instagram?: ChannelHealth;
  linkedin?: ChannelHealth;
  facebook?: ChannelHealth;
  tiktok?: ChannelHealth;
  website?: ChannelHealth;
}

/** Runs every applicable health check in parallel. ~6-10s worst case. */
export async function checkAllChannels(
  channels: ChannelSet,
): Promise<ChannelHealthMap> {
  const tasks: Array<Promise<[keyof ChannelHealthMap, ChannelHealth]>> = [];
  if (channels.instagram)
    tasks.push(
      checkInstagramProfile(channels.instagram).then(
        (h) => ["instagram", h] as const,
      ),
    );
  if (channels.linkedin)
    tasks.push(
      checkLinkedInProfile(channels.linkedin).then(
        (h) => ["linkedin", h] as const,
      ),
    );
  if (channels.facebook)
    tasks.push(
      checkGenericUrl(channels.facebook).then(
        (h) => ["facebook", h] as const,
      ),
    );
  if (channels.tiktok)
    tasks.push(
      checkGenericUrl(channels.tiktok).then((h) => ["tiktok", h] as const),
    );
  if (channels.website)
    tasks.push(
      checkGenericUrl(channels.website).then(
        (h) => ["website", h] as const,
      ),
    );

  const results = await Promise.all(tasks);
  const map: ChannelHealthMap = {};
  for (const [key, h] of results) {
    map[key] = h;
  }
  return map;
}
