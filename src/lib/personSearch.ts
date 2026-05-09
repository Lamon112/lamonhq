/**
 * Person-first owner discovery.
 *
 * Pipeline per lead:
 *   1. Parse candidate owner name from the clinic's lead name
 *      (HR clinics often follow "Stomatološka ordinacija X / Dr. Y Z")
 *   2. Apollo people search by org keyword + senior-role titles
 *   3. Rank Apollo hits against parsed candidates with fuzzy name match
 *   4. Caller picks best match, then runs channelHealth on personal LI
 *
 * No emails are revealed (no Apollo credit spend) — we only consume
 * already-public fields. If `email_status === "verified"` Apollo returns
 * the email for free.
 */

import { searchPeople, type ApolloPerson } from "@/lib/apollo";

/* -------------------- Owner candidate parser ----------------------- */

const TITLE_PREFIX_RE =
  /\b(?:dr\.?|prof\.?|mr\.?|spec\.?|prim\.?|med\.?|dent\.?)\s+/gi;

const HR_FIRST_NAMES = new Set([
  // popular HR first names — used to identify person tokens vs clinic words
  "ivan","ana","marko","marija","luka","tina","goran","sanja","tomislav",
  "petar","matea","filip","ivana","leonardo","leon","mateo","stjepan",
  "mihael","nikola","robert","vedran","dragan","damir","sandra","tea",
  "ante","frano","frane","mate","dario","darko","tibor","tiberio",
  "andrija","ivo","silvija","martina","monika","klara","franka","sara",
  "nataša","natasa","jelena","kristina","barbara","dora","lana","ema",
  "vlatka","valentina","zlatko","mladen","drazen","dražen","slaven",
  "boris","saša","sasa","andrej","oliver","krešimir","kresimir",
  "robert","alen","aleksandra","branka","vesna","ljiljana","mirjana",
  "mirjan","krunoslav","krunoslava","marina","helena","mia",
  "kresimira","gordana","nada","vinka","matija","damjan","srecko",
  "srećko","tonči","tonci","domagoj","mirko","ivanka",
]);

export interface OwnerCandidate {
  fullName: string;
  firstName: string;
  lastName: string;
  source: "after_slash" | "title_prefix" | "trailing_person";
  confidence: number; // 0-1
}

/**
 * Pulls out plausible owner names from a clinic title.
 *
 * Examples:
 *   "Dental clinic Tina Babić, DDS. / dr. Tina Babić"
 *     -> [Tina Babić]
 *   "Stomatološka ordinacija Smile Design Kovač / Željko Kovač"
 *     -> [Željko Kovač, Smile Design Kovač(low)]
 *   "Implant Center Frankić - Dr. med. dent. Ante Frankić"
 *     -> [Ante Frankić]
 */
export function parseOwnerCandidates(leadName: string): OwnerCandidate[] {
  const candidates = new Map<string, OwnerCandidate>();

  // Strip parens "(…)" first to avoid noise
  const clean = leadName.replace(/\([^)]*\)/g, " ");

  // Source 1: "X / Y Z" or "X - Y Z" — text after a slash or dash often
  // names the doctor.
  const sepParts = clean.split(/\s+[/\-–—|]\s+/);
  for (let i = 1; i < sepParts.length; i++) {
    const part = sepParts[i].trim();
    addPersonFromText(part, "after_slash", 0.85, candidates);
  }

  // Source 2: anywhere a "Dr. <Name>" prefix appears
  const reTitle = /\b(?:dr|prof|mr|spec|prim|med|dent)\.?\s+(?:[A-Za-zšđčćžŠĐČĆŽ\.]+\s+){0,3}([A-ZŠĐČĆŽ][a-zšđčćž]+(?:\s+[A-ZŠĐČĆŽ][a-zšđčćž]+){1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = reTitle.exec(clean)) !== null) {
    addPersonFromText(m[1], "title_prefix", 0.95, candidates);
  }

  // Source 3: trailing 2-3 capitalised tokens at the very end if they
  // look like a person (HR first name, or 2 cap tokens that aren't
  // common clinic words).
  const tailMatch = clean.match(
    /([A-ZŠĐČĆŽ][a-zšđčćž]+\s+[A-ZŠĐČĆŽ][a-zšđčćž]+)\s*$/,
  );
  if (tailMatch) addPersonFromText(tailMatch[1], "trailing_person", 0.6, candidates);

  return [...candidates.values()].sort((a, b) => b.confidence - a.confidence);
}

function addPersonFromText(
  raw: string,
  source: OwnerCandidate["source"],
  baseConfidence: number,
  out: Map<string, OwnerCandidate>,
) {
  const stripped = raw.replace(TITLE_PREFIX_RE, "").trim();
  // Take 2-3 capitalised tokens
  const tokens = stripped.split(/\s+/).filter((t) => /^[A-ZŠĐČĆŽ]/.test(t));
  if (tokens.length < 2) return;
  const candidate = tokens.slice(0, 3).join(" ");
  const [firstName, ...rest] = candidate.split(" ");
  const lastName = rest.join(" ");
  if (!firstName || !lastName) return;

  let confidence = baseConfidence;
  if (HR_FIRST_NAMES.has(firstName.toLowerCase())) confidence += 0.05;
  if (confidence > 1) confidence = 1;

  const key = candidate.toLowerCase();
  const existing = out.get(key);
  if (!existing || existing.confidence < confidence) {
    out.set(key, {
      fullName: candidate,
      firstName,
      lastName,
      source,
      confidence,
    });
  }
}

/* -------------------- Apollo person search ----------------------- */

const SENIOR_TITLES = [
  "owner",
  "founder",
  "co-founder",
  "ceo",
  "director",
  "managing director",
  "general manager",
  "principal",
  "chief",
  "doctor",
  "physician",
  "dentist",
  "dental surgeon",
  "specialist",
  "head",
  "lead",
  "vlasnik",
  "osnivač",
  "voditelj",
  "doktor",
  "stomatolog",
  "specijalist",
];

export interface SearchOwnersInput {
  apiKey: string;
  /** Free-text company keyword (eg. clinic name or distinctive token) */
  organizationKeyword: string;
  /** ISO country names (default: ["Croatia"]) */
  countries?: string[];
  /** Optional city filter (e.g. "Zagreb") */
  cities?: string[];
}

export async function searchOwnersForOrg(
  input: SearchOwnersInput,
): Promise<{ ok: boolean; people?: ApolloPerson[]; error?: string }> {
  return searchPeople({
    apiKey: input.apiKey,
    countries: input.countries ?? ["Croatia"],
    cities: input.cities,
    titles: SENIOR_TITLES,
    organizationKeyword: input.organizationKeyword,
    perPage: 10,
  });
}

/* -------------------- Best-match ranker ----------------------- */

/**
 * Given parsed candidates from the lead name and a list of Apollo hits,
 * returns the single best person along with a match score (0-1).
 *
 * Match score combines:
 *   - last-name exact match (strongest)
 *   - first-name fuzzy
 *   - candidate's own confidence
 *   - Apollo person seniority weight (founder > director > doctor)
 */
export interface PersonMatch {
  person: ApolloPerson;
  score: number;
  matchedCandidate: OwnerCandidate | null;
}

export function pickBestOwnerMatch(
  candidates: OwnerCandidate[],
  hits: ApolloPerson[],
): PersonMatch | null {
  if (hits.length === 0) return null;

  const scored = hits.map((p) => {
    const fullName =
      p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    const last = (p.last_name ?? "").toLowerCase();
    const first = (p.first_name ?? "").toLowerCase();
    let score = seniorityWeight(p.title);
    let matchedCandidate: OwnerCandidate | null = null;

    for (const c of candidates) {
      const cl = c.lastName.toLowerCase();
      const cf = c.firstName.toLowerCase();
      let candidateBoost = 0;
      if (last && cl === last) candidateBoost += 0.5;
      else if (last && cl.includes(last)) candidateBoost += 0.25;
      if (first && cf === first) candidateBoost += 0.3;
      else if (first && cf.includes(first.slice(0, 3))) candidateBoost += 0.1;
      candidateBoost *= c.confidence;
      if (candidateBoost > 0 && (!matchedCandidate || candidateBoost > 0.4)) {
        score += candidateBoost;
        matchedCandidate = c;
      }
    }

    // If no candidate matched but Apollo lists a senior title at the org,
    // still consider but penalise so candidate-matched people win.
    if (!matchedCandidate) score *= 0.4;

    return { person: p, score, matchedCandidate, fullName };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]
    ? {
        person: scored[0].person,
        score: scored[0].score,
        matchedCandidate: scored[0].matchedCandidate,
      }
    : null;
}

function seniorityWeight(title?: string): number {
  if (!title) return 0.1;
  const t = title.toLowerCase();
  if (/(owner|founder|vlasnik|osnivač)/.test(t)) return 0.4;
  if (/(ceo|managing director|director|principal|head|voditelj)/.test(t))
    return 0.3;
  if (/(doctor|dentist|stomatolog|specijalist|specialist)/.test(t)) return 0.2;
  return 0.1;
}
