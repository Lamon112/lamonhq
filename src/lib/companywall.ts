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
 * Try to find the company URL on companywall.hr via their search query.
 */
async function findCompanyUrl(companyName: string): Promise<string | null> {
  const slug = slugify(companyName);
  if (!slug) return null;

  // Direct guess pattern — many CW slugs end with -doo (for d.o.o. companies)
  const guesses = [
    `${HOSTNAME}/tvrtka/${slug}-doo/`,
    `${HOSTNAME}/tvrtka/${slug}/`,
    `${HOSTNAME}/tvrtka/${slug}-doo-/`,
  ];
  for (const url of guesses) {
    const html = await safeFetch(url);
    if (html && html.includes(companyName.split(" ")[0])) {
      // Extract canonical URL with ID
      const canonicalMatch = html.match(
        /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
      );
      if (canonicalMatch) return canonicalMatch[1];
      return url;
    }
  }

  // Fallback: search endpoint
  const searchUrl = `${HOSTNAME}/pretraga?q=${encodeURIComponent(companyName)}`;
  const searchHtml = await safeFetch(searchUrl);
  if (!searchHtml) return null;

  const linkMatch = searchHtml.match(
    /href=["'](\/tvrtka\/[^"']+\/[A-Za-z0-9]+)["']/,
  );
  if (linkMatch) return HOSTNAME + linkMatch[1];

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

  // OIB
  const oibMatch = html.match(/OIB[\s:]*<[^>]*>(\d{11})/i) ||
    html.match(/OIB[\s:]+(\d{11})/i);
  if (oibMatch) result.oib = oibMatch[1];

  // Founded year
  const foundedMatch =
    html.match(/Godina osnivanja[^<]*<[^>]*>(\d{4})/i) ||
    html.match(/osnovano[^<]*<[^>]*>(\d{4})/i) ||
    html.match(/established[^<]*<[^>]*>(\d{4})/i);
  if (foundedMatch) result.foundedYear = parseInt0(foundedMatch[1]);

  // Employees
  const empMatch =
    html.match(/Broj zaposlenih[^<]*<[^>]*>(\d+)/i) ||
    html.match(/zaposlen[a-z]*[^<]*<[^>]*>(\d+)/i) ||
    html.match(/(\d+)\s*zaposlen/i);
  if (empMatch) result.employees = parseInt0(empMatch[1]);

  // Revenue (prihod) — look for the most recent year's amount
  const revenueRegex =
    /Ukupni prihodi[^<]*<[^>]*>[^<]*([\d.,\s]+)\s*(?:€|EUR|kn)/i;
  const revMatch = html.match(revenueRegex);
  if (revMatch) result.revenue = parseEuroAmount(revMatch[1]);

  // Profit (dobit)
  const profitRegex =
    /(?:Dobit|Neto dobit)[^<]*<[^>]*>[^<]*(-?[\d.,\s]+)\s*(?:€|EUR|kn)/i;
  const profitMatch = html.match(profitRegex);
  if (profitMatch) result.profit = parseEuroAmount(profitMatch[1]);

  // Credit rating (bonitet) — typically "A+", "B", etc. paired with risk level
  const ratingMatch =
    html.match(/bonitet[^<]*<[^>]*>([A-D][+-]?)/i) ||
    html.match(/credit\s+rating[^<]*<[^>]*>([A-D][+-]?)/i);
  if (ratingMatch) result.creditRating = ratingMatch[1];

  const riskMatch =
    html.match(/(nizak|umjeren|visok|srednji)\s+(?:kreditni\s+)?rizik/i) ||
    html.match(/(low|medium|high)\s+credit\s+risk/i);
  if (riskMatch) result.riskLevel = riskMatch[1].toLowerCase();

  // Year of latest data
  const yearMatch = html.match(/(?:financijska godina|business year)[^<]*(\d{4})/i);
  if (yearMatch) result.latestYear = parseInt0(yearMatch[1]);

  // Compute derived fields
  if (
    typeof result.revenue === "number" &&
    typeof result.profit === "number" &&
    result.revenue > 0
  ) {
    result.profitMarginPct =
      Math.round((result.profit / result.revenue) * 1000) / 10;
  }

  // Did we get anything useful?
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
