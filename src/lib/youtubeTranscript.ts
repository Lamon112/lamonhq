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
 * Two-tier transcript fetch:
 *   1. youtubei.js (InnerTube — YouTube's internal mobile API, less
 *      aggressively IP-blocked than the public scrape route used by
 *      youtube-transcript)
 *   2. Fallback to youtube-transcript scrape if InnerTube returns nothing
 *
 * On Vercel (data-center IP), tier 1 is the primary path — YouTube
 * blocks the watch-page scrape but allows InnerTube auth flows.
 * On residential IPs (local dev, Render with proxy), both work.
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
  // Tier 1: Innertube (works on Vercel)
  const fromInner = await fetchViaInnertube(videoId);
  if (fromInner) return fromInner;
  // Tier 2: scrape fallback (works on residential IP)
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
