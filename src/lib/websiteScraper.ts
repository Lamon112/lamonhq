/**
 * Company website social-link harvester.
 *
 * For a clinic's homepage URL, this fetches the HTML and walks every
 * anchor tag pulling out:
 *   - instagram.com / facebook.com / linkedin.com / tiktok.com / youtube.com
 *   - mailto: + tel: links (catches `dr.x@…` emails right from footer)
 *   - WhatsApp wa.me / api.whatsapp.com links
 *
 * Then it follows up to 2 likely "Tim/About/Kontakt" pages with the same
 * extraction so we catch personal LinkedIn URLs of doctors that often
 * live on those pages (e.g. a "Naš tim" grid with one card per doctor).
 *
 * No third-party API. ~1-3 fetches per lead.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_FOLLOW_PAGES = 2;

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|xhtml/.test(ct)) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface ScrapedChannels {
  instagram?: string[]; // multiple OK — could be company + owner
  facebook?: string[];
  linkedin_company?: string[];
  linkedin_personal?: string[]; // /in/<handle>
  tiktok?: string[];
  youtube?: string[];
  whatsapp?: string[];
  emails?: string[];
  phones?: string[];
  /** All hrefs we walked, useful for debugging */
  pages_visited: string[];
}

const SOCIAL_PATTERNS = {
  instagram: /^https?:\/\/(?:www\.)?instagram\.com\/([^/?#]+)/i,
  facebook: /^https?:\/\/(?:www\.)?facebook\.com\/([^/?#]+)/i,
  linkedin_personal:
    /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#]+)/i,
  linkedin_company:
    /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|school)\/([^/?#]+)/i,
  tiktok: /^https?:\/\/(?:www\.)?tiktok\.com\/(@?[^/?#]+)/i,
  youtube: /^https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)?([^/?#]+)/i,
  whatsapp:
    /^https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send|chat\.whatsapp\.com\/.+|web\.whatsapp\.com\/)/i,
} as const;

const FOLLOW_HINTS = [
  "tim", "team", "naš tim", "nas tim", "our team",
  "o nama", "about", "about us",
  "kontakt", "contact",
  "doktori", "lijecnici", "liječnici", "doctors",
];

function extractSocialsFromHtml(html: string, baseUrl: string): ScrapedChannels {
  const out: ScrapedChannels = { pages_visited: [baseUrl] };
  const push = (key: keyof ScrapedChannels, value: string) => {
    if (key === "pages_visited") return;
    const arr = (out[key] as string[] | undefined) ?? [];
    if (!arr.includes(value)) arr.push(value);
    (out as unknown as Record<string, string[]>)[key] = arr;
  };

  // Pull all href / src URLs (case-insensitive). We don't need a real
  // parser — anchors are by far the dominant carrier of social links.
  const hrefs = Array.from(
    html.matchAll(/(?:href|src|content)\s*=\s*["']([^"']+)["']/gi),
  ).map((m) => m[1].trim());

  for (const raw of hrefs) {
    const href = raw.startsWith("//") ? `https:${raw}` : raw;
    if (href.startsWith("mailto:")) {
      const email = href.slice(7).split("?")[0].trim();
      if (email && /@/.test(email)) push("emails", email.toLowerCase());
      continue;
    }
    if (href.startsWith("tel:")) {
      const phone = href.slice(4).trim();
      if (phone) push("phones", phone);
      continue;
    }
    for (const [key, re] of Object.entries(SOCIAL_PATTERNS)) {
      if (re.test(href)) {
        // Ignore generic IG share URLs like /sharer/, /tr?id=, /tag/
        if (
          /\/(sharer|tr|p|reel|tag|tv|explore|hashtag)\b/i.test(href) ||
          /\?utm_/.test(href)
        ) {
          // sharer / tracker URLs are not the canonical page — skip
          // (still fall through to the cleaner version if present)
        } else {
          push(key as keyof ScrapedChannels, href.replace(/\/$/, ""));
        }
        break;
      }
    }
  }

  // Also dig plain-text emails in case footer renders them without
  // mailto: (rare but happens — e.g. images-of-text or JSON-LD)
  const textEmails = html.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?:HR|hr|com|net|org)/gi,
  );
  if (textEmails) {
    for (const e of textEmails) push("emails", e.toLowerCase());
  }

  return out;
}

/** Find candidate "team / about / contact" page URLs to follow. */
function pickFollowUps(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re =
    /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,160}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < MAX_FOLLOW_PAGES) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (!text) continue;
    if (!FOLLOW_HINTS.some((h) => text.includes(h))) continue;
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (!abs.startsWith(new URL(baseUrl).origin)) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

function mergeChannels(a: ScrapedChannels, b: ScrapedChannels): ScrapedChannels {
  const merged: ScrapedChannels = {
    pages_visited: [...a.pages_visited, ...b.pages_visited],
  };
  for (const key of [
    "instagram",
    "facebook",
    "linkedin_company",
    "linkedin_personal",
    "tiktok",
    "youtube",
    "whatsapp",
    "emails",
    "phones",
  ] as const) {
    const av = a[key] ?? [];
    const bv = b[key] ?? [];
    const set = new Set([...av, ...bv]);
    if (set.size > 0) {
      (merged as unknown as Record<string, string[]>)[key] = [...set];
    }
  }
  return merged;
}

export async function scrapeCompanyWebsite(
  url: string,
): Promise<ScrapedChannels | null> {
  // Normalise URL
  let baseUrl = url.trim();
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;
  try {
    new URL(baseUrl);
  } catch {
    return null;
  }

  const homeHtml = await fetchHtml(baseUrl);
  if (!homeHtml) return null;

  let scraped = extractSocialsFromHtml(homeHtml, baseUrl);

  // Follow up to 2 team/about/contact pages for deeper personal links
  const follows = pickFollowUps(homeHtml, baseUrl);
  for (const followUrl of follows) {
    const html = await fetchHtml(followUrl);
    if (!html) continue;
    scraped = mergeChannels(scraped, extractSocialsFromHtml(html, followUrl));
  }
  return scraped;
}
