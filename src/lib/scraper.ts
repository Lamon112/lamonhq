/**
 * Lightweight HTML scraper used for clinic-website enrichment.
 *
 * Approach:
 *   1. Fetch homepage and a handful of common "team / about / contact" sub-paths.
 *   2. Strip <script> + <style> + tags + collapse whitespace → readable text.
 *   3. Cap total content size so the AI prompt stays cheap (~6K chars).
 *
 * Failures are silent — partial content is fine; the AI can still extract
 * what it sees and skip the rest.
 */

const COMMON_PATHS = [
  "",
  "/o-nama",
  "/onama",
  "/about",
  "/about-us",
  "/team",
  "/our-team",
  "/tim",
  "/nas-tim",
  "/tim-doktora",
  "/lijecnici",
  "/doktori",
  "/doctors",
  "/kontakt",
  "/contact",
];

const MAX_CHARS_PER_PAGE = 4000;
const MAX_TOTAL_CHARS = 9000;

function stripHtml(html: string): string {
  // Remove scripts/styles entirely
  let txt = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Replace block-level closings with newlines so structure survives
  txt = txt.replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|nav)>/gi, "\n");
  // Strip remaining tags
  txt = txt.replace(/<[^>]+>/g, " ");
  // Decode common entities
  txt = txt
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse whitespace
  txt = txt.replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return txt;
}

async function safeFetch(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LamonHQBot/1.0; +https://lamon-hq.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html") && !ctype.includes("xml")) return null;
    const html = await res.text();
    return html;
  } catch {
    return null;
  }
}

export interface ScrapedSite {
  baseUrl: string;
  combinedText: string;
  pages: Array<{ url: string; chars: number }>;
}

export async function scrapeSite(websiteUrl: string): Promise<ScrapedSite | null> {
  let base: URL;
  try {
    base = new URL(websiteUrl);
  } catch {
    return null;
  }
  const baseUrl = `${base.protocol}//${base.hostname}`;

  // De-dup paths once base is known
  const targets = Array.from(new Set(COMMON_PATHS.map((p) => baseUrl + p)));

  const fetched = await Promise.all(
    targets.map(async (url) => {
      const html = await safeFetch(url);
      if (!html) return null;
      const txt = stripHtml(html);
      if (!txt) return null;
      return { url, text: txt.slice(0, MAX_CHARS_PER_PAGE) };
    }),
  );

  const valid = fetched.filter((x): x is { url: string; text: string } => !!x);
  if (valid.length === 0) return null;

  // Dedupe by exact text (some sites serve the same homepage on every path)
  const seen = new Set<string>();
  const uniques = valid.filter((p) => {
    const key = p.text.slice(0, 500);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let combined = "";
  const pages: Array<{ url: string; chars: number }> = [];
  for (const p of uniques) {
    if (combined.length + p.text.length > MAX_TOTAL_CHARS) {
      const room = Math.max(0, MAX_TOTAL_CHARS - combined.length);
      if (room > 200) {
        combined += `\n\n=== ${p.url} ===\n${p.text.slice(0, room)}`;
        pages.push({ url: p.url, chars: room });
      }
      break;
    }
    combined += `\n\n=== ${p.url} ===\n${p.text}`;
    pages.push({ url: p.url, chars: p.text.length });
  }

  return { baseUrl, combinedText: combined.trim(), pages };
}
