/**
 * Croatian company financial intel — fetcha javne podatke s companywall.hr.
 *
 * Strategy:
 *   1. Slug-search by company name → ako ima točan match, dobiveni URL
 *   2. Scrape revenue / profit / employees / credit rating iz statične HTML stranice
 *   3. Sva polja su optional — ako neki ne uspije parse, nema problema
 *
 * Failure: vraća null (klijent koristi enrichment bez financial intel).
 */

export interface CompanyFinancials {
  source: "companywall";
  url: string;
  legalName?: string;
  oib?: string;
  foundedYear?: number;
  employees?: number;
  latestYear?: number;
  revenue?: number;
  profit?: number;
  prevYearRevenue?: number;
  yoyGrowthPct?: number;
  profitMarginPct?: number;
  creditRating?: string;
  riskLevel?: string;
}

const HOSTNAME = "https://www.companywall.hr";
const FETCH_TIMEOUT_MS = 7000;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function safeFetch(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
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
    return await res.text();
  } catch {
    return null;
  }
}

function parseEuroAmount(raw: string): number | undefined {
  // Handles "158.195,29" / "158 195,29" / "158195.29" / "5.170,04 €" etc.
  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, "") // strip thousands sep dots
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

function parseInt0(raw: string): number | undefined {
  const num = parseInt(raw.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Find the company URL on companywall.hr by searching their endpoint and
 * picking the result whose slug overlaps most with the queried name. Slug
 * matching is essential — companywall uses many name variants (e.g.
 * "spalato-dental--doo" with double dash). A direct slug guess fails too
 * often, so we always search and rank.
 */
async function findCompanyUrl(companyName: string): Promise<string | null> {
  const targetSlug = slugify(companyName);
  if (!targetSlug) return null;

  // Significant words from the company name (drop generic words and "doo")
  const stop = new Set([
    "doo",
    "dental",
    "centar",
    "klinika",
    "ordinacija",
    "stomatoloska",
    "stomatologija",
    "poliklinika",
    "estetika",
    "dr",
    "med",
    "dent",
  ]);
  const targetWords = new Set(
    targetSlug
      .split("-")
      .filter((w) => w.length > 2 && !stop.has(w)),
  );

  // Distinctive word that anchors the search (typically owner surname or
  // brand). If the name is purely generic (no distinctive word survives
  // the stop list), fall back to first long word from the original slug.
  let anchor: string | null = null;
  for (const w of targetWords) {
    anchor = w;
    break;
  }
  if (!anchor) {
    anchor = targetSlug.split("-").find((w) => w.length > 2) ?? null;
  }
  if (!anchor) return null;

  const searchUrl = `${HOSTNAME}/pretraga?q=${encodeURIComponent(companyName)}`;
  const searchHtml = await safeFetch(searchUrl);
  if (!searchHtml) return null;

  const links = Array.from(
    searchHtml.matchAll(/href="(\/tvrtka\/[^"]+\/[A-Za-z0-9]+)"/g),
  ).map((m) => m[1]);
  if (links.length === 0) return null;

  // Score each link by counting overlap with target words; ties go to the
  // earliest result (companywall already orders by relevance).
  let bestScore = 0;
  let bestLink: string | null = null;
  for (const link of links.slice(0, 10)) {
    const parts = link.split("/"); // ["", "tvrtka", "<slug>", "<id>"]
    const slug = parts[2] ?? "";
    const words = new Set(
      slug.split("-").filter((w) => w.length > 2 && !stop.has(w)),
    );
    let overlap = 0;
    for (const w of targetWords) if (words.has(w)) overlap++;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestLink = link;
    }
  }

  // Require at least one anchor word match (or every word match if name is
  // very short). This prevents false positives where the search returns
  // any random "dental clinic doo" for a query that just contains "doo".
  const minScore = Math.max(1, Math.min(2, targetWords.size));
  if (bestScore >= minScore && bestLink) return HOSTNAME + bestLink;
  return null;
}

function extractFinancials(html: string, url: string): CompanyFinancials | null {
  const result: CompanyFinancials = { source: "companywall", url };

  // Legal name (page title)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const t = titleMatch[1].split("|")[0].trim();
    if (t) result.legalName = t;
  }

  // ─── Schema.org FAQPage embedded JSON (most reliable signal) ──────
  // The page embeds answers like:
  //   "text": "Prihod je: 158195,29"
  //   "text": "FAQNetGainLossAnswerIs 5170,04"
  //   "text": "FAQExpensesAnswerIs 153025,25"
  const revenueFaq = html.match(/"text":\s*"Prihod je:\s*([\d.,]+)"/);
  if (revenueFaq) result.revenue = parseEuroAmount(revenueFaq[1]);

  const profitFaq = html.match(
    /"text":\s*"FAQNetGainLossAnswerIs\s*(-?[\d.,]+)"/,
  );
  if (profitFaq) result.profit = parseEuroAmount(profitFaq[1]);

  // ─── Yearly breakdown JSON for YoY growth ────────────────────────
  // The page embeds per-year financial JSON arrays. Look for current
  // and previous year by scanning for "Ukupni prihodi": "X" patterns
  // and pairing them with the closest preceding year marker.
  const yearlyMatches = Array.from(
    html.matchAll(/"Ukupni prihodi":\s*"([\d.,]+)"/g),
  ).map((m) => parseEuroAmount(m[1]) ?? 0);
  if (yearlyMatches.length >= 2) {
    // companywall typically lists years in chronological order; the last
    // entry is the most recent. Use it as latest if revenueFaq is missing.
    if (!result.revenue) result.revenue = yearlyMatches[yearlyMatches.length - 1];
    const latest = yearlyMatches[yearlyMatches.length - 1];
    const prev = yearlyMatches[yearlyMatches.length - 2];
    if (latest && prev && prev > 0) {
      result.prevYearRevenue = prev;
      result.yoyGrowthPct = Math.round(((latest - prev) / prev) * 1000) / 10;
    }
  }

  // ─── HTML "Ukupni prihodi tvrtke su <span class="text-bold">X</span>" fallback ─
  if (!result.revenue) {
    const directRevenue = html.match(
      /Ukupni prihodi tvrtke su\s*<span[^>]*>([\d.,]+)<\/span>/,
    );
    if (directRevenue) result.revenue = parseEuroAmount(directRevenue[1]);
  }

  // ─── Bonitet (credit rating) ─────────────────────────────────────
  const bonitetMatch =
    html.match(/bonitet[^>]*>[^<]*<[^>]*>([A-D][+-]?)/i) ||
    html.match(/Kreditna ocjena[^<]*<[^>]*>([A-D][+-]?)/i) ||
    html.match(/Bonitet[\s:]*([A-D][+-]?)/);
  if (bonitetMatch) result.creditRating = bonitetMatch[1];

  const riskMatch = html.match(
    /(nizak|niži|umjeren|umjereni|visok|visoki|srednji)\s+(?:kreditni\s+)?rizik/i,
  );
  if (riskMatch) result.riskLevel = riskMatch[1].toLowerCase();

  // ─── Founded year, employees ─────────────────────────────────────
  // Pattern: "Godina osnivanja:" then a date "21.11.2018." in the next bold span
  const foundedDateMatch = html.match(
    /Godina osnivanja[\s\S]{0,400}?<span[^>]*>(\d{1,2}\.\d{1,2}\.(\d{4})\.?)<\/span>/,
  );
  if (foundedDateMatch) result.foundedYear = parseInt0(foundedDateMatch[2]);
  if (!result.foundedYear) {
    const foundedYearMatch = html.match(
      /(?:Godina osnivanja|osnovano)[\s\S]{0,200}?(\d{4})/,
    );
    if (foundedYearMatch) result.foundedYear = parseInt0(foundedYearMatch[1]);
  }

  const empMatch =
    html.match(
      /Broj zaposlenih[\s\S]{0,400}?<span[^>]*class="text-bold"[^>]*>(\d+)<\/span>/,
    ) || html.match(/(\d+)\s*zaposlen[a-zćč]*\s+kompan/i);
  if (empMatch) result.employees = parseInt0(empMatch[1]);

  // ─── Year tag (latest year covered by the published financials) ──
  // companywall titles their finance year with a header like
  // "Financijska godina 2024"; otherwise infer from yearly JSON count.
  const yearTagMatch = html.match(
    /(?:Financijska godina|Poslovna godina)[\s\S]{0,80}?(\d{4})/i,
  );
  if (yearTagMatch) result.latestYear = parseInt0(yearTagMatch[1]);
  else if (yearlyMatches.length > 0) {
    // assume current year - 1 (financials always lag)
    result.latestYear = new Date().getFullYear() - 1;
  }

  // OIB (11-digit Croatian VAT/tax id)
  const oibMatch =
    html.match(/OIB[\s:]*<[^>]*>(\d{11})<\/[^>]*>/i) ||
    html.match(/OIB[\s:]*(\d{11})/i);
  if (oibMatch) result.oib = oibMatch[1];

  // ─── Derived: profit margin ──────────────────────────────────────
  if (
    typeof result.revenue === "number" &&
    typeof result.profit === "number" &&
    result.revenue > 0
  ) {
    result.profitMarginPct =
      Math.round((result.profit / result.revenue) * 1000) / 10;
  }

  const hasContent =
    result.revenue !== undefined ||
    result.profit !== undefined ||
    result.employees !== undefined ||
    result.creditRating !== undefined ||
    result.foundedYear !== undefined;
  return hasContent ? result : null;
}

export async function fetchCompanyFinancials(
  companyName: string,
): Promise<CompanyFinancials | null> {
  if (!companyName || companyName.trim().length < 3) return null;

  const url = await findCompanyUrl(companyName);
  if (!url) return null;

  const html = await safeFetch(url);
  if (!html) return null;

  return extractFinancials(html, url);
}

/**
 * Build a compact, human-readable financial summary suitable for AI prompt or UI badge.
 */
export function summarizeFinancials(f: CompanyFinancials): string {
  const parts: string[] = [];
  if (f.foundedYear) parts.push(`osn. ${f.foundedYear}`);
  if (f.employees) parts.push(`${f.employees} zaposlenih`);
  if (typeof f.revenue === "number" && f.latestYear) {
    parts.push(`prihod ${f.latestYear}: €${Math.round(f.revenue).toLocaleString("hr-HR")}`);
  } else if (typeof f.revenue === "number") {
    parts.push(`prihod: €${Math.round(f.revenue).toLocaleString("hr-HR")}`);
  }
  if (typeof f.yoyGrowthPct === "number") {
    parts.push(`YoY ${f.yoyGrowthPct > 0 ? "+" : ""}${f.yoyGrowthPct}%`);
  }
  if (typeof f.profitMarginPct === "number") {
    parts.push(`marža ${f.profitMarginPct}%`);
  }
  if (f.creditRating) parts.push(`bonitet ${f.creditRating}`);
  return parts.join(" · ");
}
