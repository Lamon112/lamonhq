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

import { YoutubeTranscript } from "youtube-transcript";

export interface VideoTranscript {
  videoId: string;
  text: string;        // joined transcript
  language: string;
  word_count: number;
  segments: Array<{ start: number; duration: number; text: string }>;
}

const PREFERRED_LANGS = ["en", "hr", "sr", "bs", "de", "ru", "ro"];

export async function fetchTranscript(
  videoId: string,
): Promise<VideoTranscript | null> {
  // Try the preferred langs in order; the lib throws on missing track.
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
      // language not available — try next
      continue;
    }
  }
  // Last resort: try without lang param (lets the lib pick auto-default)
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

/**
 * Batch-fetch with safe concurrency + per-video timeout to avoid one
 * stuck video blocking the whole run.
 */
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
