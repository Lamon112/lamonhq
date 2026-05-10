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
  findClinicEmployees,
  findCompanySocialUrl,
  findOfficialWebsite,
  findPersonalInstagram,
  findPersonalLinkedIn,
  findPublicity,
  type SearchResult,
} from "@/lib/duckduckgo";
import { findWebsiteForLead } from "@/lib/websiteFinder";
import { renderInsightsForPrompt } from "@/lib/sharedInsights";
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
2b. **years_experience — UVIJEK pokušaj derivirati**. Ovo je kritično za Leonarda jer vodi pitch personalizaciju. Tri sekvencijalne metode:
    (a) Direktna izjava: "X godina iskustva", "od XXXX godine radi", "preko X godina prakse" → koristi taj broj.
    (b) Godina diplomiranja: "diplomirao 20XX", "MD 20XX", "graduated 19XX" → vrati (2026 - godina_diplomiranja).
    (c) Godina osnivanja klinike kao floor: ako nema doktorske godine ali "klinika osnovana 20XX" i vlasnik je founder → vrati (2026 - godina_osnivanja).
    Samo ako sva 3 ne daju ništa → null. Ne ostavljaj null lijeno — pretraži bio, title, education, web, LinkedIn experience.
3. **personal_angles** — minimalno 2 stvari u svakom polju. Izvuci iz BIO-a, IG bio-a, LinkedIn headline-a, recent posts-a, publicity rezultata.
4. **best_angle.summary** — 1 rečenica taktički iskoristiv "zašto OVAJ vlasnik baš OVAJ angle". MORA referencirati pitch tier (npr. "Viralni TT (5.8M views) — pitchaj Plima paket s Rivom (premium voice + cross-channel), ne content strategy"). Voice se NE spominje u prvoj rečenici outreach-a — Council pravilo: prvo ROI bol, tek na demo poziv tech detalj.
5. **opening_hook** — PRVA rečenica V8 outreach-a. MORA biti tier-prilagođena. Za veteran: spomeni njihov konkretan viralni hit ili brojku. Za starter: industry stat.
6. **avoid** — 1-3 stvari koje NE treba spomenuti (npr. za veteran: NE pričaj o "kako pomoći s contentom" — uvrijedit ćeš ih).
7. **reachability** — RANGIRAJ kanale po šansi za reply. Neaktivan profil = nizak score.
8. **outreach_draft** — pun V8 draft (6 stage struktura: pozdrav vlasnik · hook 1 specifični osobni · hook 2 brojka/tier-relevant · pivot · solution kratko · CTA dva termina · potpis "Leonardo Lamon" — BEZ zareza). Tier-prilagođen. Ovo je legacy / fallback draft.

12. **primary_channel** — odluči koji kanal je BEST first-touch:
   - "instagram" ako vlasnik aktivan na osobnom IG (alive, redoviti posts) — lifestyle moment, neformalno-premium tone
   - "linkedin" ako vlasnik ima aktivan personal LI s 200+ followers — profesionalno, peer-to-peer
   - "phone" ako reachability stavlja telefon kao top + premium klinika (vlasnici premium klinika cijene direktan poziv kao signal autoriteta)
   - "whatsapp" ako WA broj u scrape + smal-business signal (jednostavan, kratak)
   - "email" kao fallback (uvijek radi, ali najmanji reply rate)

13. **channel_drafts** — za TOP 1-3 kanala generiraj **POSEBNE** prilagođene drafts:

    - **instagram** (max 950 znakova): casual-premium ton, lifestyle hook, 1-2 emoji OK, kratki rečenice, ne formalan, paragraph-based ne list. Hook: "Vidio sam vaš [konkretan post / story]..." ili "Slijedim [aktivnost]...". Pitch sažet, CTA "Imate 15 min ovaj tjedan? Mogu poslati i 60s voice memo s detaljima ako želite."

    - **linkedin** (max 700 znakova): profesionalno, peer-to-peer, no emoji osim 🤝 u pozdravu. Reference LI post / connection / mutual ako moguće. Hook short. Solution 1 rečenica. CTA "Slobodni u srijedu u 10:30 ili četvrtak nakon 18h?". Potpis "Leonardo Lamon".

    - **email** (full V8 ~1500-2000 znakova): koristi outreach_draft formatu. Plus subject line uključen kao prva linija "Subject: [naslov]". Naslov primjer: "Koliko [klinika] gubi mjesečno na propuštene pozive?" ili "Riva — niti jedan pacijent ne prolazi pored vas". Prva rečenica = ROI brojka (NE tech opis). Spomeni Plima paket mid-message kao rješenje, NE u headline-u. Voice se ne spominje pre-discovery — to je za demo poziv. Sign-off "S poštovanjem, Leonardo Lamon".

    - **phone** — POSEBNI FORMAT, NE PORUKA, nego **CALL SCRIPT** (3 min):
      \`\`\`
      📞 PHONE SCRIPT (3 min, prilagodi vlasnika)

      [0-30s OPENER]
      "Dr. [ime], dobar dan. Leonardo Lamon ovdje. Bavim se isključivo razvojem privatnih ordinacija — primijetio sam [konkretni signal] kod [klinika], zato vas zovem direktno. Imate li 2-3 min za kratko pitanje?"

      [30-90s PITCH]
      "[Industry stat + njihova procjena gubitka]. Razlog što vas zovem: vidim da [pain konkretan]. To realno znači [€ raspon] godišnje izgubljenog prihoda."

      [90-150s 2 QUESTIONS]
      Q1: "Kako trenutno hvatate pozive izvan radnog vremena?"
      Q2: "Tko trenutno odlučuje o [marketing / automatizacija / web]?"

      [150-180s CTA]
      "Predlažem 15 min Zoom u srijedu u 10:30 ili četvrtak 18h — pokazat ću vam konkretnu mehaniku za [pain]. Šaljem invite na koji email?"

      [Ako odbiju] "Razumijem. Mogu li poslati kratki email s 2-3 brojke koje će vam možda promijeniti pristup?"
      \`\`\`

    - **whatsapp** (kombinacija text + voice memo prep): kratki opener text (3-4 line) + bullet-list "Voice memo (60s) talking points:" — jer voice memo na WA daje osobni vibe + autoritet.

    Generiraj samo za kanale koji su u TOP 3 reachability. Skip dead/blocked kanale. Ako jedan kanal nije relevantan (npr. nema phone broj), izostavi ga.

14. **team** — analiziraj team_search_hits + clinic-name + niche. Mapiraj zaposlenike koje vidiš (ime + uloga + LI URL + tag-ovi). Procijeni org veličinu:
    - **solo** — 1-3 doktora, mala praksa
    - **small** — 4-8 ljudi, srednja
    - **mid** — 9-20 ljudi, multi-doktorska klinika
    - **large** — 20+, premium / multi-lokacija s ops + marketing timom

15. **recommended_contact** — KRITIČNI HOLMES DJELOKRUG. Odluči TKO je BEST FIRST CONTACT, ne samo "owner default". Logika:

    - **Solo praksa (1-3 doctors)** → vlasnik (jedini decision-maker)
    - **Mid-size (4-10 doctors)** → ako u team_search_hits postoji **"voditelj klinike" / "manager" / "operativni direktor"** s ≥1 god u toj klinici → preporuči NJEGA, fallback vlasnik. Razlog: u srednjoj praksi voditelj odlučuje o marketing/automatizaciji jer vlasnik radi pacijente.
    - **Large/Premium (10+ doctors)** → traži **"marketing", "social media manager", "growth", "operations"** uloge — ti su DIREKTNI buyer-i naših usluga. Vlasnik = strategic only, dugačka deal cycle.
    - **Special signal**: ako vlasnik ima jak osobni brand (publicity hits, viral content, premium positioning) — vlasnik želi peer-to-peer convo s Leonardom o BRAND VIZIJI. Tada vlasnik = primary čak i u mid praksi.
    - **Special signal**: ako klinika ima zaseban "marketing" ili "PR" osobu — uvijek prvo nju, ne vlasnika.

    Output recommended_contact:
    \`\`\`
    {
      "name": "...",
      "role": "...",
      "why": "1-2 rečenice taktički zašto BAŠ NJEGA (npr. 'voditelj odlučuje o marketing budgetu, vlasnik klinički fokusiran')",
      "channel": "instagram|linkedin|email|phone|whatsapp",
      "fallback": { "name": "...", "role": "...", "why": "..." }  // optional - drugi izbor ako primary ne odgovori
    }
    \`\`\`

16. **channel_drafts ADRESIRAJ NA recommended_contact**, ne na vlasnika ako su različiti. Pozdrav s imenom recommended_contact-a, hook prilagođen NJIHOVOJ ulozi (voditelj = pricaj o ROI/efikasnosti, marketing = pricaj o conversion/funnel, vlasnik = pricaj o viziji/brand).

   **OBAVEZNO**: U solution-u ili pivot-u SUPTILNO embed-aj da je Leonardov posao **razvoj privatnih ordinacija** — to je signal autoriteta koji svaka ordinacija želi imati za sebe. Ne mora biti cijela rečenica — može biti dio konteksta dok pričaš o nečem drugom. Primjeri:
   - "Bavim se razvojem privatnih ordinacija — Plima paket (s AI asistenticom Rivom koja diže svaki poziv 24/7) je glavni stup za vašu situaciju."
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
- team_search_hits: [{ url, title, snippet }] — LinkedIn profili zaposlenika klinike

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
  "primary_channel": "instagram|linkedin|email|phone|whatsapp",
  "channel_drafts": {
    "instagram": "string|null (≤950 chars, casual-premium)",
    "linkedin": "string|null (≤700 chars, professional)",
    "email": "string|null (full V8 ~1500-2000 chars, with Subject: line)",
    "phone": "string|null (3-min CALL SCRIPT format with stage labels)",
    "whatsapp": "string|null (text opener + voice memo prep bullets)"
  },
  "team": {
    "members": [
      { "name": "...", "role": "...|null", "linkedin_url": "...|null",
        "signals": ["operations", "marketing", "founder", ...] }
    ],
    "size_estimate": "solo|small|mid|large",
    "structure_note": "1-2 sentences about how the org works"
  },
  "recommended_contact": {
    "name": "...",
    "role": "...|null",
    "why": "1-2 sentence tactical reason",
    "channel": "instagram|linkedin|email|phone|whatsapp|null",
    "fallback": { "name": "...", "role": "...", "why": "..." }
  },
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
  /**
   * Per-channel adapted drafts. Holmes generates these based on
   * reachability ranking — the top channel gets a fully-tailored
   * format (IG = casual lifestyle, LI = professional, phone = call
   * script, email = full V8, WhatsApp = text + voice memo prep).
   */
  channel_drafts?: {
    instagram?: string;
    linkedin?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  };
  primary_channel?: "instagram" | "linkedin" | "email" | "phone" | "whatsapp";
  /**
   * Org structure analysis. Holmes maps the team and decides who's the
   * right decision-maker contact (not always the owner — sometimes a
   * voditelj / marketing manager who actually buys our services).
   */
  team?: {
    members: Array<{
      name: string;
      role: string | null;
      linkedin_url: string | null;
      signals: string[]; // e.g. ["operations", "marketing", "founder"]
    }>;
    size_estimate: "solo" | "small" | "mid" | "large";
    structure_note: string;
  };
  recommended_contact?: {
    name: string;
    role: string | null;
    why: string;
    channel:
      | "instagram"
      | "linkedin"
      | "email"
      | "phone"
      | "whatsapp"
      | null;
    fallback?: { name: string; role: string | null; why: string };
  };
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
  /**
   * Team / employee discovery: LinkedIn site:search results for people
   * who mention working at this clinic. Holmes synthesis uses this to
   * map org structure and recommend the right decision-maker contact
   * (sometimes a manager / voditelj instead of the owner).
   */
  team_search_hits?: SearchResult[];
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

  // Step 3: Run recon in parallel — this is the slow part (~30-45s worst case)
  const [
    websiteScrape,
    linkedinHits,
    instagramHits,
    publicityHits,
    teamHits,
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
    findClinicEmployees(input.leadName).catch(() => [] as SearchResult[]),
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
    team_search_hits: teamHits.slice(0, 12),
  };

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const sharedKnowledge = await renderInsightsForPrompt(10);
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000, // channel_drafts × 5 + team analysis + recommended_contact
      system: [
        {
          type: "text",
          text: HOLMES_SYSTEM_PROMPT + sharedKnowledge,
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
