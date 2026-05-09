/**
 * Agent Holmes — AI detective that produces a deep dossier on a lead's
 * owner before Leonardo writes a single message.
 *
 * Pipeline:
 *   1. Find official website (DDG search if not in lead.notes)
 *   2. Scrape website (homepage + Tim/About/Kontakt) for socials + email
 *   3. Identify owner candidate from clinic name
 *   4. Search DDG site:linkedin.com/in + site:instagram.com for personal
 *      profiles of that owner
 *   5. Fetch + parse those profiles (followers, status)
 *   6. Search DDG for publicity (intervju / podcast / predavanje)
 *   7. Synthesize everything via Anthropic Claude into a structured
 *      Holmes report
 *
 * Cost per lead: ~5-8 DDG searches (free) + 3-6 page fetches + 1 Claude
 *   call (~3-5K tokens). ~30s wall-clock when the network cooperates.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  ddgSearch,
  findCompanySocialUrl,
  findOfficialWebsite,
  findPersonalInstagram,
  findPersonalLinkedIn,
  findPublicity,
  type SearchResult,
} from "@/lib/duckduckgo";
import { findWebsiteForLead } from "@/lib/websiteFinder";
import { scrapeCompanyWebsite, type ScrapedChannels } from "@/lib/websiteScraper";
import {
  checkInstagramProfile,
  checkLinkedInProfile,
  type ChannelHealth,
} from "@/lib/channelHealth";
import { parseOwnerCandidates } from "@/lib/personSearch";
import {
  analyzeSocialDepth,
  type SocialDepth,
} from "@/lib/socialDepthAnalyzer";

const HOLMES_SYSTEM_PROMPT = `Ti si Sherlock Holmes ali za sales prospecting. Dobiješ raw evidence o KLINICI + njenom VLASNIKU + njihovim social profilima i tvoj zadatak je sintetizirati Holmes Report u striktnom JSON formatu.

# Mission
Leonardo se bavi razvojem privatnih ordinacija kroz 6 stupova (chatbot, automatizacija, content, social, PR, web). Cilj report-a: dati mu max šansu da dobije reply na cold outreach pisanje VLASNIKU OSOBNO.

# Pitch tiering (KRITIČNO za personalizaciju)

Evidence sadrži \`social_depth.tier\`: starter | intermediate | veteran | dead.
Tvoj outreach_draft i best_angle MORAJU se prilagoditi tieru:

- **starter** (mrtvi profili, 0 posts) — pitch CONTENT STRATEGIJU + foundation. Hook: "Industry studije pokazuju 35% poziva propušteno…". Cijena: 1.497€/mj Growth.
- **intermediate** (1-10K followers, redoviti posts) — pitch DISTRIBUCIJU + automation backend. Hook: čestitaj na traction-u, pitaj o backend-u (chatbot, nurture, retargeting). Cijena: 2.500-3.500€/mj.
- **veteran** (10K+ followers ili viral hit >1M views) — NIKAD generic content pitch. Pitch AI GATEKEEPER + premium filter + conversion optimization. Hook: spomeni KONKRETAN viralni post / nagradu / brojku, pitaj kako filtriraju kvalitetu high-volume traffica. Cijena: 5K-10K/mj premium.
- **dead** — fokus samo na foundational web/automation, ili oznaci "skip" u best_angle.

# Pravila

1. **Striktni JSON** — bez markdown fence-a, bez dodatnog teksta, samo JSON objekt.
2. **Bez halucinacija** — ako neki podatak nije u evidence-u, vraćaj null ili prazan string. NEMOJ izmišljati ime, godine, fakultet itd.
3. **personal_angles** — minimalno 2 stvari u svakom polju. Izvuci iz BIO-a, IG bio-a, LinkedIn headline-a, recent posts-a, publicity rezultata.
4. **best_angle.summary** — 1 rečenica taktički iskoristiv "zašto OVAJ vlasnik baš OVAJ angle". MORA referencirati pitch tier (npr. "Viralni TT (5.8M views) — pitchaj AI gatekeeper, ne content strategy").
5. **opening_hook** — PRVA rečenica V8 outreach-a. MORA biti tier-prilagođena. Za veteran: spomeni njihov konkretan viralni hit ili brojku. Za starter: industry stat.
6. **avoid** — 1-3 stvari koje NE treba spomenuti (npr. za veteran: NE pričaj o "kako pomoći s contentom" — uvrijedit ćeš ih).
7. **reachability** — RANGIRAJ kanale po šansi za reply. Neaktivan profil = nizak score.
8. **outreach_draft** — pun V8 draft (6 stage struktura: pozdrav vlasnik · hook 1 specifični osobni · hook 2 brojka/tier-relevant · pivot · solution kratko · CTA dva termina · potpis "Leonardo Lamon" — BEZ zareza). Tier-prilagođen.

   **OBAVEZNO**: U solution-u ili pivot-u SUPTILNO embed-aj da je Leonardov posao **razvoj privatnih ordinacija** — to je signal autoriteta koji svaka ordinacija želi imati za sebe. Ne mora biti cijela rečenica — može biti dio konteksta dok pričaš o nečem drugom. Primjeri:
   - "Bavim se razvojem privatnih ordinacija kroz 6 stupova — ovo (AI gatekeeper / chatbot / itd.) je glavni stup za vašu situaciju."
   - "Iz prakse razvoja privatnih ordinacija — vidio sam X kod sličnih tier-a."
   - "Specijalizirao sam se za razvoj privatnih ordinacija; baš zato me Y kod vas zanima."

   Cilj: doktor odmah razumije da Leonardo nije "još jedan agencija pitch", nego netko tko se isključivo bavi privatnim ordinacijama → autoritetska poluga.
9. **pitch_tier** field je OBAVEZAN — kopiraj iz evidence.social_depth.tier.
10. **recommended_package** — preporuči paket: "Growth (1.497€/mj)" | "Distribution+ (2.5-3.5K€/mj)" | "Premium AI Gatekeeper (5-10K€/mj)" | "Foundation only" | "skip".
11. Bez ALL CAPS. Govor s "vi/vam".

# Evidence keys ti dostavljam

- clinic_name, clinic_website, niche, notes_excerpt
- website_scrape: { instagram, linkedin_personal, linkedin_company, facebook, tiktok, youtube, emails, phones }
- owner_name_candidate, owner_candidate_confidence
- linkedin_search_hits: [{ url, title, snippet }]
- instagram_search_hits: [{ url, title, snippet }]
- publicity_hits: [{ url, title, snippet }]
- linkedin_profile: { status, followers, reason } | null
- instagram_profile: { status, followers, postCount, reason } | null

# Output schema

{
  "owner": {
    "name": "string|null",
    "title": "string|null",
    "bio": "string|null",
    "photo": "string|null",
    "education": ["string"],
    "languages": ["string"],
    "years_experience": "number|null"
  },
  "channels": {
    "linkedin_personal": "string|null",
    "instagram_personal": "string|null",
    "email": "string|null",
    "phone": "string|null",
    "linkedin_company": "string|null",
    "instagram_company": "string|null",
    "website": "string|null"
  },
  "personal_angles": {
    "interests": ["string"],
    "values": ["string"],
    "recent_activity": ["string"],
    "pain_points": ["string"]
  },
  "best_angle": {
    "summary": "string",
    "opening_hook": "string",
    "avoid": ["string"]
  },
  "reachability": [
    { "channel": "string", "url": "string", "confidence": 0.0,
      "reasoning": "string" }
  ],
  "publicity": [{ "title": "string", "url": "string", "snippet": "string" }],
  "outreach_draft": "string",
  "pitch_tier": "starter|intermediate|veteran|dead",
  "recommended_package": "string"
}

Vrati SAMO JSON.`;

export interface HolmesReport {
  owner: {
    name: string | null;
    title: string | null;
    bio: string | null;
    photo: string | null;
    education: string[];
    languages: string[];
    years_experience: number | null;
  };
  channels: {
    linkedin_personal: string | null;
    instagram_personal: string | null;
    email: string | null;
    phone: string | null;
    linkedin_company: string | null;
    instagram_company: string | null;
    website: string | null;
  };
  personal_angles: {
    interests: string[];
    values: string[];
    recent_activity: string[];
    pain_points: string[];
  };
  best_angle: {
    summary: string;
    opening_hook: string;
    avoid: string[];
  };
  reachability: Array<{
    channel: string;
    url: string;
    confidence: number;
    reasoning: string;
  }>;
  publicity: Array<{ title: string; url: string; snippet: string }>;
  outreach_draft: string;
  pitch_tier?: "starter" | "intermediate" | "veteran" | "dead";
  recommended_package?: string;
  social_depth?: SocialDepth;
  evidence?: HolmesEvidence;
  model: string;
  generated_at: string;
}

export interface HolmesEvidence {
  clinic_name: string;
  clinic_website: string | null;
  website_scrape: ScrapedChannels | null;
  owner_name_candidate: string | null;
  owner_candidate_confidence: number;
  linkedin_search_hits: SearchResult[];
  instagram_search_hits: SearchResult[];
  publicity_hits: SearchResult[];
  linkedin_profile: ChannelHealth | null;
  instagram_profile: ChannelHealth | null;
  social_depth: SocialDepth | null;
}

export interface RunHolmesInput {
  leadName: string;
  niche?: string | null;
  notesExcerpt?: string | null;
  hintCity?: string | null;
  /**
   * Pre-known company website URL (from leads.website_url). When set we
   * skip the DDG search entirely and go straight to scraping it.
   */
  websiteUrl?: string | null;
}

export interface RunHolmesResult {
  ok: boolean;
  report?: HolmesReport;
  evidence?: HolmesEvidence;
  error?: string;
}

export async function runAgentHolmes(
  input: RunHolmesInput,
): Promise<RunHolmesResult> {
  if (!process.env.ANTHROPIC_API_KEY)
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };

  // Step 1: Find official website. Three-stage cascade:
  //   1. pre-set URL on the lead (manual override, fastest)
  //   2. AI-guess + HTTP probe (websiteFinder, no external deps)
  //   3. DDG search as last resort
  let website: string | null = normalizeWebsite(input.websiteUrl);
  if (!website) {
    const found = await findWebsiteForLead(input.leadName).catch(() => null);
    website = found?.url ?? null;
  }
  if (!website) {
    website = await findOfficialWebsite(
      input.leadName,
      input.hintCity ?? undefined,
    );
  }

  // Step 2: Identify owner candidate
  const candidates = parseOwnerCandidates(input.leadName);
  const ownerCandidate = candidates[0] ?? null;
  const ownerName = ownerCandidate?.fullName ?? null;

  // Step 3: Run recon in parallel — this is the slow part (~30s worst case)
  const [
    websiteScrape,
    linkedinHits,
    instagramHits,
    publicityHits,
  ] = await Promise.all([
    website ? scrapeCompanyWebsite(website).catch(() => null) : Promise.resolve(null),
    ownerName
      ? findPersonalLinkedIn(ownerName, input.hintCity ?? undefined).catch(
          () => [],
        )
      : Promise.resolve([] as SearchResult[]),
    ownerName
      ? findPersonalInstagram(ownerName, input.hintCity ?? undefined).catch(
          () => [],
        )
      : Promise.resolve([] as SearchResult[]),
    ownerName
      ? findPublicity(ownerName).catch(() => [])
      : Promise.resolve([] as SearchResult[]),
  ]);

  // Step 4: Pick best LI / IG candidate from search hits + verify alive
  const liUrl = linkedinHits[0]?.url ?? null;
  const igUrl = instagramHits[0]?.url ?? null;
  const [liProfile, igProfile] = await Promise.all([
    liUrl ? checkLinkedInProfile(liUrl).catch(() => null) : Promise.resolve(null),
    igUrl
      ? checkInstagramProfile(igUrl).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Step 4b: For each social platform missing in the website scrape,
  // try a DDG site:platform.com "<clinic name>" search. This catches
  // viral company TikToks (like Štimac's 5.8M-view content) that the
  // homepage might not link to, plus Instagram handles that lazy-load
  // via JS in the footer. Run in parallel.
  const [
    fallbackTikTok,
    fallbackInstagram,
    fallbackYouTube,
    fallbackFacebook,
  ] = await Promise.all([
    websiteScrape?.tiktok?.[0]
      ? Promise.resolve(websiteScrape.tiktok[0])
      : findCompanySocialUrl(input.leadName, "tiktok").catch(() => null),
    websiteScrape?.instagram?.[0]
      ? Promise.resolve(websiteScrape.instagram[0])
      : findCompanySocialUrl(input.leadName, "instagram").catch(() => null),
    websiteScrape?.youtube?.[0]
      ? Promise.resolve(websiteScrape.youtube[0])
      : findCompanySocialUrl(input.leadName, "youtube").catch(() => null),
    websiteScrape?.facebook?.[0]
      ? Promise.resolve(websiteScrape.facebook[0])
      : findCompanySocialUrl(input.leadName, "facebook").catch(() => null),
  ]);

  // Step 4c: Social depth analysis — measures HOW VIRAL the company's
  // public content engine is. Drives pitch_tier in synthesis.
  const socialDepth = await analyzeSocialDepth({
    instagram: fallbackInstagram ?? igUrl ?? undefined,
    tiktok: fallbackTikTok ?? undefined,
    youtube: fallbackYouTube ?? undefined,
    linkedin:
      websiteScrape?.linkedin_company?.[0] ?? liUrl ?? undefined,
  }).catch(() => null);

  // Merge fallback URLs back into website_scrape so the UI surfaces them
  // alongside the originally-scraped channels.
  if (websiteScrape) {
    if (fallbackTikTok && !websiteScrape.tiktok?.includes(fallbackTikTok)) {
      websiteScrape.tiktok = [...(websiteScrape.tiktok ?? []), fallbackTikTok];
    }
    if (
      fallbackInstagram &&
      !websiteScrape.instagram?.includes(fallbackInstagram)
    ) {
      websiteScrape.instagram = [
        ...(websiteScrape.instagram ?? []),
        fallbackInstagram,
      ];
    }
    if (
      fallbackYouTube &&
      !websiteScrape.youtube?.includes(fallbackYouTube)
    ) {
      websiteScrape.youtube = [
        ...(websiteScrape.youtube ?? []),
        fallbackYouTube,
      ];
    }
    if (
      fallbackFacebook &&
      !websiteScrape.facebook?.includes(fallbackFacebook)
    ) {
      websiteScrape.facebook = [
        ...(websiteScrape.facebook ?? []),
        fallbackFacebook,
      ];
    }
  }

  // Step 5: Synthesize
  const evidence: HolmesEvidence = {
    clinic_name: input.leadName,
    clinic_website: website,
    website_scrape: websiteScrape ?? null,
    owner_name_candidate: ownerName,
    owner_candidate_confidence: ownerCandidate?.confidence ?? 0,
    linkedin_search_hits: linkedinHits.slice(0, 4),
    instagram_search_hits: instagramHits.slice(0, 4),
    publicity_hits: publicityHits.slice(0, 5),
    linkedin_profile: liProfile,
    instagram_profile: igProfile,
    social_depth: socialDepth ?? null,
  };

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: [
        {
          type: "text",
          text: HOLMES_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `# Lead context
clinic_name: ${input.leadName}
niche: ${input.niche ?? "n/a"}
notes_excerpt: ${(input.notesExcerpt ?? "").slice(0, 1500)}

# Evidence (JSON)

${JSON.stringify(evidence, null, 2)}

Sad vrati Holmes Report kao striktni JSON.`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = parseHolmesJson(cleaned);
    if (!parsed)
      return {
        ok: false,
        evidence,
        error: `Holmes vratio nevalidan JSON: ${raw.slice(0, 200)}`,
      };

    const report: HolmesReport = {
      ...parsed,
      social_depth: socialDepth ?? undefined,
      evidence,
      model: "claude-sonnet-4-6",
      generated_at: new Date().toISOString(),
    };
    return { ok: true, report, evidence };
  } catch (e) {
    return {
      ok: false,
      evidence,
      error:
        e instanceof Error ? `Anthropic error: ${e.message}` : "AI greška",
    };
  }
}

function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

function parseHolmesJson(raw: string): Omit<HolmesReport, "model" | "generated_at" | "evidence"> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
