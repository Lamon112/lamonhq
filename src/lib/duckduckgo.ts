/**
 * DuckDuckGo HTML search — free, no API key, no rate limit headers
 * (we self-rate-limit via 600ms inter-request gap when called in loops).
 *
 * Endpoint: https://html.duckduckgo.com/html/?q=<url-encoded query>
 * Returns a static HTML page of results we can parse with regex.
 *
 * Used by Agent Holmes to:
 *   - find official websites (`"<clinic name>" site:hr`)
 *   - find personal LinkedIn (`site:linkedin.com/in "<owner name>"`)
 *   - find personal Instagram (`site:instagram.com "<owner name>"`)
 *   - find publicity (`"<owner name>" intervju OR podcast OR predavanje`)
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 12_000;

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export class SearchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "SearchError";
  }
}

export async function ddgSearch(
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
        // DDG html endpoint is sometimes finicky without a referer
        Referer: "https://html.duckduckgo.com/",
      },
    });
    if (!res.ok) {
      throw new SearchError(`DDG HTTP ${res.status}`, res.status);
    }
    const html = await res.text();
    return parseDdgResults(html, limit);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Parses DDG's HTML results. Each hit has a structure roughly like:
 *   <a class="result__a" href="REDIRECT_URL">Title</a>
 *   <a class="result__snippet" href="...">Snippet text</a>
 * The href is a duckduckgo redirect — we strip the `uddg=` param to get
 * the real target URL.
 */
function parseDdgResults(html: string, limit: number): SearchResult[] {
  const out: SearchResult[] = [];
  // Each result block — capture title link + snippet
  const blockRe =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null && out.length < limit) {
    const href = decodeRedirect(m[1]);
    if (!href) continue;
    const title = stripTags(m[2]).trim();
    const snippet = stripTags(m[3]).trim();
    out.push({ url: href, title, snippet });
  }
  // Fallback: if nothing matched, try a looser pattern (DDG occasionally
  // ships a slightly different layout)
  if (out.length === 0) {
    const looseRe = /<a[^>]*href="([^"]+uddg=[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let lm: RegExpExecArray | null;
    while ((lm = looseRe.exec(html)) !== null && out.length < limit) {
      const href = decodeRedirect(lm[1]);
      if (!href) continue;
      const title = stripTags(lm[2]).trim();
      out.push({ url: href, title, snippet: "" });
    }
  }
  return out;
}

function decodeRedirect(raw: string): string | null {
  // DDG uses /l/?kh=-1&uddg=<encoded> or //duckduckgo.com/l/?uddg=...
  if (raw.startsWith("//")) raw = "https:" + raw;
  try {
    const u = new URL(raw, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    if (target) return decodeURIComponent(target);
    // Some results are direct (already absolute external URLs)
    if (/^https?:\/\//.test(raw) && !raw.includes("duckduckgo.com")) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/* -------------------- Convenience wrappers ----------------------- */

/** Find the official website for a Croatian clinic / business. */
export async function findOfficialWebsite(
  clinicName: string,
  hint?: string, // e.g. "Rijeka" or "Zagreb"
): Promise<string | null> {
  const cleaned = clinicName
    .replace(/\s*\/\s*[^/]+$/, "") // strip "/ Dr. X" tail
    .trim();
  const q = `"${cleaned}"${hint ? ` ${hint}` : ""} site:hr`;
  try {
    const results = await ddgSearch(q, 8);
    // Prefer .hr root domains, skip aggregators
    const blocked =
      /(facebook|instagram|linkedin|tiktok|youtube|google|maps|companywall|posao|njuskalo|dental-tribune|wikipedia)/i;
    const candidate = results.find(
      (r) => /\.hr(?:\/|$)/i.test(r.url) && !blocked.test(r.url),
    );
    if (candidate) return rootUrl(candidate.url);
    // Fallback: any non-aggregator result
    const fallback = results.find((r) => !blocked.test(r.url));
    return fallback ? rootUrl(fallback.url) : null;
  } catch {
    return null;
  }
}

function rootUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

/** site:linkedin.com/in "<owner>" — returns ranked personal LI URLs. */
export async function findPersonalLinkedIn(
  ownerName: string,
  hint?: string,
): Promise<SearchResult[]> {
  const q = `site:linkedin.com/in "${ownerName}"${hint ? ` ${hint}` : ""}`;
  try {
    const results = await ddgSearch(q, 5);
    return results.filter((r) =>
      /linkedin\.com\/(?:[a-z]{2,3}\/)?in\//i.test(r.url),
    );
  } catch {
    return [];
  }
}

/** site:instagram.com "<owner>" — returns ranked IG profile URLs. */
export async function findPersonalInstagram(
  ownerName: string,
  hint?: string,
): Promise<SearchResult[]> {
  const q = `site:instagram.com "${ownerName}"${hint ? ` ${hint}` : ""}`;
  try {
    const results = await ddgSearch(q, 5);
    return results.filter(
      (r) =>
        /instagram\.com\/[^/?#]+\/?$/i.test(r.url) &&
        !/instagram\.com\/(p|reel|tv|explore|tag|hashtag|stories)\//i.test(
          r.url,
        ),
    );
  } catch {
    return [];
  }
}

/** Public mentions: interviews, podcasts, talks. */
export async function findPublicity(
  ownerName: string,
): Promise<SearchResult[]> {
  const q = `"${ownerName}" intervju OR podcast OR predavanje OR konferencija`;
  try {
    return await ddgSearch(q, 6);
  } catch {
    return [];
  }
}

/**
 * Per-platform search to find a company's social-media profile URL when
 * the website scrape didn't surface it (often because of JS rendering or
 * a footer that links via image-only icons).
 *
 * Returns canonical-looking profile URLs, filtering out post/reel/video
 * permalinks.
 */
export async function findCompanySocialUrl(
  clinicName: string,
  platform: "tiktok" | "instagram" | "youtube" | "facebook" | "linkedin",
): Promise<string | null> {
  const cleaned = clinicName
    .replace(/\s*\/\s*[^/]+$/, "") // strip "/ Dr. X" tail
    .trim();
  const domain =
    platform === "tiktok"
      ? "tiktok.com"
      : platform === "instagram"
        ? "instagram.com"
        : platform === "youtube"
          ? "youtube.com"
          : platform === "facebook"
            ? "facebook.com"
            : "linkedin.com/company";
  const q = `site:${domain} "${cleaned}"`;
  try {
    const results = await ddgSearch(q, 6);
    // Filter to canonical profile URLs (no post/reel/video permalinks)
    const filtered = results.filter((r) => {
      if (!r.url.includes(domain.split("/")[0])) return false;
      if (
        /\/(p|reel|tv|video|status|posts|tag|hashtag|explore|stories|shorts|watch)\//i.test(
          r.url,
        )
      )
        return false;
      return true;
    });
    if (filtered.length === 0) return null;
    // Pick the one whose URL path most closely matches the clinic name
    const cleanedSlug = cleaned
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");
    filtered.sort((a, b) => {
      const aPath = a.url.toLowerCase();
      const bPath = b.url.toLowerCase();
      const aMatch = cleanedSlug ? aPath.includes(cleanedSlug.slice(0, 5)) : false;
      const bMatch = cleanedSlug ? bPath.includes(cleanedSlug.slice(0, 5)) : false;
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      return 0;
    });
    return filtered[0].url;
  } catch {
    return null;
  }
}
