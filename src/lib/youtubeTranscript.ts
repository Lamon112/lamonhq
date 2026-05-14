/**
 * YouTube transcript fetcher — wraps youtube-transcript npm package
 * (no API key needed, scrapes auto-captions).
 *
 * Used by Niche Hunter to pull verbatim text from guru videos so Claude
 * can analyze what concepts they're teaching (not just titles).
 *
 * Multi-language fallback: en → hr → ru → de (Tim Danilov posts in
 * DE/RU, Razvan in EN/RO).
 */

/**
 * Multi-tier transcript fetch.
 *
 * Tier 1 (PRIMARY on Vercel): Supadata.ai paid API
 *   - Set SUPADATA_API_KEY env var
 *   - 100 free requests/mo (well above our Niche Hunter cycle of ~40)
 *   - Reliable — they handle IP rotation server-side
 *
 * Tier 2 (FALLBACK): youtube-transcript-api npm — relays through
 *   youtube-transcript.io, no key needed but Firebase scrape can fail
 *   on Vercel data-center IPs.
 *
 * Tier 3 (LAST): youtube-transcript scrape — works only on residential
 *   IP (local dev).
 *
 * Same VideoTranscript shape returned from all tiers.
 */

import { YoutubeTranscript } from "youtube-transcript";

export interface VideoTranscript {
  videoId: string;
  text: string;
  language: string;
  word_count: number;
  segments: Array<{ start: number; duration: number; text: string }>;
}

const PREFERRED_LANGS = ["en", "hr", "sr", "bs", "de", "ru", "ro"];

// Tier 1: Supadata.ai paid API. Set SUPADATA_API_KEY in env.
async function fetchViaSupadata(videoId: string): Promise<VideoTranscript | null> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.supadata.ai/v1/transcript?url=https://youtu.be/${videoId}`;
    const res = await fetch(url, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lang?: string;
      content?: Array<{ text: string; offset: number; duration: number }>;
    };
    const segs = data.content ?? [];
    if (segs.length === 0) return null;
    const text = segs
      .map((s) => (s.text ?? "").trim())
      .filter(Boolean)
      .join(" ");
    if (!text) return null;
    return {
      videoId,
      text,
      language: data.lang ?? "auto",
      word_count: text.split(/\s+/).filter(Boolean).length,
      segments: segs.map((s) => ({
        start: (s.offset ?? 0) / 1000,
        duration: (s.duration ?? 0) / 1000,
        text: s.text,
      })),
    };
  } catch {
    return null;
  }
}

// Tier 2: Lazy-init the youtube-transcript-api relay client
let _relayClient: unknown | null = null;
async function getRelayClient() {
  if (_relayClient) return _relayClient;
  // @ts-expect-error — youtube-transcript-api ships no .d.ts
  const mod = (await import("youtube-transcript-api")) as unknown as {
    default: new () => { ready: Promise<void>; getTranscript: (id: string) => Promise<unknown> };
  };
  const Client = mod.default;
  const c = new Client();
  await c.ready;
  _relayClient = c;
  return c;
}

interface RelaySegment {
  text?: string;
  duration?: number;
  offset?: number;
}

interface RelayResult {
  tracks?: Array<{
    transcript?: RelaySegment[];
    language?: string;
    languageCode?: string;
  }>;
  // Fallback shape — sometimes returned as direct array
  transcript?: RelaySegment[];
}

async function fetchViaRelay(videoId: string): Promise<VideoTranscript | null> {
  try {
    const c = (await getRelayClient()) as { getTranscript: (id: string) => Promise<RelayResult> };
    const result = await c.getTranscript(videoId);
    // Try several shapes — the lib's response format varies
    const track = result?.tracks?.[0];
    const segs: RelaySegment[] = track?.transcript ?? result?.transcript ?? [];
    if (!segs || segs.length === 0) return null;
    const text = segs
      .map((s) => (s.text ?? "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim())
      .filter(Boolean)
      .join(" ");
    if (!text) return null;
    return {
      videoId,
      text,
      language: track?.languageCode ?? track?.language ?? "auto",
      word_count: text.split(/\s+/).filter(Boolean).length,
      segments: segs.map((s) => ({
        start: s.offset ?? 0,
        duration: s.duration ?? 0,
        text: s.text ?? "",
      })),
    };
  } catch {
    return null;
  }
}

// Lazy-init the Innertube client so module load doesn't slow cold start
let _innertube: unknown | null = null;
async function getInnertube() {
  if (_innertube) return _innertube;
  // youtubei.js exports default `Innertube` class
  const ytModule = (await import("youtubei.js")) as unknown as {
    Innertube: { create: (opts?: Record<string, unknown>) => Promise<unknown> };
  };
  _innertube = await ytModule.Innertube.create({
    cache: undefined,
    generate_session_locally: true,
  });
  return _innertube;
}

interface InnertubeInfo {
  getTranscript: () => Promise<{
    transcript: {
      content: {
        body: {
          initial_segments: Array<{ snippet: { text: string }; start_ms: number; end_ms: number }>;
        };
      };
    };
  }>;
}

async function fetchViaInnertube(videoId: string): Promise<VideoTranscript | null> {
  try {
    const yt = (await getInnertube()) as { getInfo: (id: string) => Promise<InnertubeInfo> };
    const info = await yt.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    const segments = transcriptData?.transcript?.content?.body?.initial_segments ?? [];
    if (segments.length === 0) return null;
    const text = segments
      .map((s) => s.snippet?.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    if (!text) return null;
    return {
      videoId,
      text,
      language: "auto",
      word_count: text.split(/\s+/).filter(Boolean).length,
      segments: segments.map((s) => ({
        start: (s.start_ms ?? 0) / 1000,
        duration: ((s.end_ms ?? 0) - (s.start_ms ?? 0)) / 1000,
        text: s.snippet?.text ?? "",
      })),
    };
  } catch {
    return null;
  }
}

async function fetchViaScrape(videoId: string): Promise<VideoTranscript | null> {
  for (const lang of PREFERRED_LANGS) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (!items || items.length === 0) continue;
      const text = items
        .map((i) => i.text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim())
        .filter(Boolean)
        .join(" ");
      return {
        videoId,
        text,
        language: lang,
        word_count: text.split(/\s+/).filter(Boolean).length,
        segments: items.map((i) => ({
          start: i.offset / 1000,
          duration: i.duration / 1000,
          text: i.text,
        })),
      };
    } catch {
      continue;
    }
  }
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      const text = items.map((i) => i.text.trim()).join(" ");
      return {
        videoId,
        text,
        language: "auto",
        word_count: text.split(/\s+/).filter(Boolean).length,
        segments: items.map((i) => ({
          start: i.offset / 1000,
          duration: i.duration / 1000,
          text: i.text,
        })),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function fetchTranscript(
  videoId: string,
): Promise<VideoTranscript | null> {
  // Tier 1: Supadata paid API (primary on Vercel)
  const fromSupadata = await fetchViaSupadata(videoId);
  if (fromSupadata) return fromSupadata;
  // Tier 2: youtube-transcript.io relay (no key, but Firebase scrape can fail)
  const fromRelay = await fetchViaRelay(videoId);
  if (fromRelay) return fromRelay;
  // Tier 3: Innertube
  const fromInner = await fetchViaInnertube(videoId);
  if (fromInner) return fromInner;
  // Tier 4: direct scrape (residential only)
  return fetchViaScrape(videoId);
}

// (export retained even though primary path is single-fetch via Inngest steps)
export async function fetchTranscriptsBatch(
  videoIds: string[],
  options: { concurrency?: number; perVideoTimeoutMs?: number } = {},
): Promise<Array<VideoTranscript | null>> {
  const conc = options.concurrency ?? 3;
  const timeout = options.perVideoTimeoutMs ?? 25_000;

  const results: Array<VideoTranscript | null> = new Array(videoIds.length).fill(null);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= videoIds.length) return;
      const id = videoIds[idx];
      try {
        results[idx] = await Promise.race([
          fetchTranscript(id),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
        ]);
      } catch {
        results[idx] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: conc }, () => worker()));
  return results;
}
