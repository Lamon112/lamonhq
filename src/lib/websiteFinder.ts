/**
 * AI-driven website finder.
 *
 * Pipeline:
 *   1. Generate ~6 candidate URLs:
 *        - 4 deterministic patterns from the clinic name
 *        - 2-3 from a one-shot Anthropic Claude call ("guess the URL")
 *   2. HTTP-GET all candidates in parallel
 *   3. Score each: 200 OK + HTML title looks clinic-ish wins
 *   4. Return top URL or null
 *
 * Zero user input, zero external API beyond Anthropic (which we already
 * have). Works around the DDG-from-datacenter blocking we saw earlier.
 */

import Anthropic from "@anthropic-ai/sdk";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8_000;

export interface FoundWebsite {
  url: string;
  source: "deterministic" | "ai_guess";
  matchedKeywords: string[];
  title?: string;
}

/* -------------------- Deterministic candidates ----------------------- */

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Best-effort guesses based on common HR dental-clinic naming. We strip
 * generic words ("ordinacija", "stomatološka", "dental", "dr.") and try
 * the distinctive tokens.
 */
function deterministicCandidates(leadName: string): string[] {
  const stop = new Set([
    "stomatoloska", "stomatoloka", "ordinacija", "ordinacijai", "klinika",
    "centar", "dental", "dentalne", "dentalni", "medicine", "poliklinika",
    "estetska", "fizio", "fizioterapija", "ortopedija", "ortodoncija",
    "dr", "prof", "spec", "med", "dent", "dds", "of", "and", "i", "the",
    "clinic", "centre", "center", "polyclinic",
  ]);
  const cleaned = leadName.replace(/\([^)]*\)/g, " ").replace(/[/\-–—|]+/g, " ");
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => slug(t))
    .filter((t) => t.length >= 3 && !stop.has(t));
  if (tokens.length === 0) return [];

  const distinctive = tokens.slice(0, 3);
  const out = new Set<string>();
  // Two-word distinctive combos
  if (distinctive.length >= 2) {
    out.add(`https://${distinctive[0]}-${distinctive[1]}.hr`);
    out.add(`https://${distinctive[0]}${distinctive[1]}.hr`);
    out.add(`https://${distinctive[0]}-${distinctive[1]}.com`);
  }
  // Single-token guesses (HR doctor naming patterns)
  for (const t of distinctive) {
    out.add(`https://${t}.hr`);
    out.add(`https://${t}.com`);
    out.add(`https://dr${t}.hr`);
    out.add(`https://dr${t}.com`);
    out.add(`https://dr-${t}.hr`);
    out.add(`https://dr-${t}.com`);
    out.add(`https://${t}-dental.hr`);
    out.add(`https://centar-${t}.hr`);
  }
  return [...out].slice(0, 12);
}

/* -------------------- AI candidate generator ------------------------ */

const AI_SYSTEM_PROMPT = `Ti si AI helper koji predviđa website URL hrvatskih privatnih dentalnih/estetskih/zdravstvenih klinika na temelju njihovog naziva.

# Format
Vrati STRIKT JSON: { "candidates": ["url1", "url2", "url3", ...] }
Maksimalno 6 kandidata. Bez markdown fence-a, bez objašnjenja.

# HR doktorski domain patterns (BIT BITNO — koristi sve relevantne)

Ako naziv sadrži ime doktora/vlasnika "dr. PREZIME":
- drprezime.com    (npr. drstimac.com, drmilanovic.com, drcuvalo.com)
- dr-prezime.com   (npr. dr-stimac.com)
- drprezime.hr
- dr-prezime.hr
- prezime-dental.hr
- prezime.hr

Ako naziv sadrži kratku marku/centar (npr. "Orto Nova", "Smile Design", "Tina Babic Dental"):
- markamarkayuhr (npr. orto-nova.hr, smile-design.hr, dental-babic.hr)
- markamarkacom

Ako je generic naziv (npr. "Stomatološka ordinacija X"):
- skip generic patterns, fokus na X

# Primjeri input/output

Input: "Dental - Centar Štimac / Štimac (obitelj)"
Output: { "candidates": ["https://drstimac.com", "https://stimac-dental.hr", "https://centarstimac.hr", "https://stimac.hr", "https://dr-stimac.com"] }

Input: "Stomatološka ordinacija Smile Design Kovač / Željko Kovač"
Output: { "candidates": ["https://smile-design-kovac.hr", "https://smiledesign.hr", "https://drkovac.hr", "https://kovacdental.hr", "https://drkovac.com"] }

Input: "Orto Nova Centar Dentalne Medicine / Tiberio Zaverski"
Output: { "candidates": ["https://orto-nova.hr", "https://ortonova.hr", "https://orto-nova.com", "https://drzaverski.hr"] }

Input: "Dental clinic Tina Babic, DDS. / dr. Tina Babić"
Output: { "candidates": ["https://drbabic.hr", "https://dr-babic.com", "https://tinababic.hr", "https://dental-babic.hr", "https://drbabic.com"] }

# Pravila
- Bez halucinacija agresivnih: ako stvarno nemaš ideju, vrati malo (3-4) realistic candidates
- DIACRITICS skidaj (š→s, ć→c, č→c, đ→d) jer se domene ne mogu unicode
- Bez "https://www." prefiksa — samo "https://"
- Bez putanja iza domene (samo do .hr/.com)`;

async function aiCandidates(leadName: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: AI_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Klinika: "${leadName}"\n\nVrati JSON.`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { candidates?: string[] };
    return (parsed.candidates ?? [])
      .filter((u): u is string => typeof u === "string" && u.length > 4)
      .map(normalizeUrl)
      .slice(0, 4);
  } catch {
    return [];
  }
}

function normalizeUrl(u: string): string {
  let url = u.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/$/, "");
}

/* -------------------- HTTP probe + score ----------------------------- */

const CLINIC_KEYWORDS = [
  "klinika", "ordinacija", "stomatolog", "dental", "implant", "estetik",
  "ortodonc", "doktor", "zubar", "klinika", "dentist", "dent",
  "specijalist", "ambulanta", "fiziotrap", "rehabilit",
];

interface ProbeResult {
  url: string;
  status: number;
  matchedKeywords: string[];
  title?: string;
}

async function probe(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    if (!res.ok)
      return { url: res.url || url, status: res.status, matchedKeywords: [] };
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|xhtml/i.test(ct))
      return { url: res.url || url, status: res.status, matchedKeywords: [] };
    const html = await res.text();
    const lower = html.toLowerCase();
    const matched = CLINIC_KEYWORDS.filter((k) => lower.includes(k));
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    return {
      url: res.url || url,
      status: res.status,
      matchedKeywords: matched,
      title,
    };
  } catch {
    return { url, status: 0, matchedKeywords: [] };
  } finally {
    clearTimeout(t);
  }
}

/* -------------------- Public entry point ----------------------------- */

export async function findWebsiteForLead(
  leadName: string,
): Promise<FoundWebsite | null> {
  // Generate candidates from both sources in parallel
  const det = deterministicCandidates(leadName);
  const aiPromise = aiCandidates(leadName);
  const ai = await aiPromise;

  // Combine + de-dupe
  const seen = new Set<string>();
  const candidates: Array<{ url: string; source: "deterministic" | "ai_guess" }> = [];
  for (const u of ai) {
    if (!seen.has(u)) {
      seen.add(u);
      candidates.push({ url: u, source: "ai_guess" });
    }
  }
  for (const u of det) {
    if (!seen.has(u)) {
      seen.add(u);
      candidates.push({ url: u, source: "deterministic" });
    }
  }
  if (candidates.length === 0) return null;

  // Probe all in parallel
  const probes = await Promise.all(
    candidates.map(async (c) => ({
      ...c,
      probe: await probe(c.url),
    })),
  );

  // Pick the best — must be 200 + at least 1 clinic keyword in HTML
  const valid = probes.filter(
    (p) => p.probe.status >= 200 && p.probe.status < 400 &&
      p.probe.matchedKeywords.length > 0,
  );
  if (valid.length === 0) {
    // Looser pass: 200 with any HTML
    const anyOk = probes.find(
      (p) => p.probe.status >= 200 && p.probe.status < 400 && p.probe.title,
    );
    if (!anyOk) return null;
    return {
      url: anyOk.probe.url,
      source: anyOk.source,
      matchedKeywords: [],
      title: anyOk.probe.title,
    };
  }
  // Sort by keyword match count desc, then prefer ai_guess source as tiebreaker
  valid.sort((a, b) => {
    const k = b.probe.matchedKeywords.length - a.probe.matchedKeywords.length;
    if (k !== 0) return k;
    return a.source === "ai_guess" ? -1 : 1;
  });
  const winner = valid[0];
  return {
    url: winner.probe.url,
    source: winner.source,
    matchedKeywords: winner.probe.matchedKeywords,
    title: winner.probe.title,
  };
}
