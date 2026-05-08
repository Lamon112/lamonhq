"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchText, type PlaceResult } from "@/lib/places";
import {
  enrichOrganization,
  organizationTopPeople,
  type ApolloOrg,
  type ApolloPerson,
} from "@/lib/apollo";
import { scrapeSite } from "@/lib/scraper";
import { logActivity } from "./activityLog";

export interface ProspectorInput {
  /** Niche keyword in any language — e.g. "stomatološka klinika", "estetska klinika", "physio clinic" */
  niche: string;
  /** City or region — e.g. "Zagreb", "Split", "Croatia" */
  location: string;
  /** Number of clinics to find (1-20) */
  count?: number;
  /** ISO country bias for Places, e.g. "hr" */
  regionCode?: string;
}

export interface ClinicOwner {
  name: string;
  role?: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  source?: "website" | "apollo";
}

export interface ProspectCandidate {
  placeId: string;
  name: string;
  address?: string;
  website?: string;
  domain?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUri?: string;
  apolloOrg?: ApolloOrg;
  topPeople?: ApolloPerson[];
  /** AI-extracted owners/directors from website (and Apollo if present) */
  owners?: ClinicOwner[];
  /** AI-scored ICP 0-20 */
  icpScore?: number;
  icpBreakdown?: {
    lice_branda: number;
    edge: number;
    premium: number;
    dokaz: number;
    brzina_odluke: number;
  };
  /** Short list of premium/edge signals AI saw (services, awards, brand cues) */
  premiumSignals?: string[];
  /** AI's one-line reasoning for the score */
  scoreReasoning?: string;
  /** Diagnostics: which website paths were scraped */
  scrapedPages?: string[];
}

export interface ProspectorResult {
  ok: boolean;
  candidates?: ProspectCandidate[];
  error?: string;
  /** Diagnostics: how many enrich/top_people calls succeeded */
  enrichedCount?: number;
  peopleCount?: number;
  /** Diagnostics: how many candidates AI scored */
  scoredCount?: number;
}

const ENRICH_SYSTEM_PROMPT = `Ti si AI Lead Enricher za Lamon Agency (Lamon HQ — agencija koja prodaje "Rast paket" za B2B klinike: 1.997€ setup + 1.497€/mj za AI receptionist + 24/7 booking system).

Dobio si scraped tekst s web stranice klinike. Tvoj zadatak: izvući vlasnike/direktore/ključno osoblje + score-ati klinika protiv ICP-a Lamon Agencije.

# ICP kriteriji (svaki 0-4, total 0-20):

- **lice_branda** (0-4): Postoji li jasno "lice" branda — vlasnik / founder / istaknuti doktor s prepoznatljivim imenom? Premium klinike obično imaju to. 0 = anonimna, 4 = vrlo jasno lice.
- **edge** (0-4): Imaju li jasnu razliku od konkurencije (USP, niche specijalnost, posebna metoda, awards)? 0 = generic, 4 = jasan edge.
- **premium** (0-4): Pozicioniranje i cijena premium tier (ne discount)? Tragovi: estetska medicina, conservative dentistry, "luksuz", visokokvalitetni materijali, after-hours support, designer interijer. 0 = budget, 4 = clearly premium.
- **dokaz** (0-4): Postoje testimonials, case studies, prije/poslije slike, results, partneri, awards? 0 = ni traga, 4 = jako bogato.
- **brzina_odluke** (0-4): Mali decision-making (1-2 osobe, vlasnik = doktor) = bitno. Velike grupe / lanci s upravom = sporo. 0 = veliki lanac, 4 = solo praksa s vlasnikom-doktorom.

# Vlasnici / decision makers

Iz scraped texta izvuci konkretna imena ljudi koji su vlasnici, direktori, founderi ILI top doktori s LinkedIn-om (ako vidiš). Tipično na "Tim", "O nama", "Liječnici" stranici.

Format: { name, role, linkedin?, email?, phone? }

Ako tekst ne pokazuje konkretne vlasnike (npr. samo opis usluga), vrati \`owners: []\` i \`scoreReasoning\` napomeni.

# Premium signals

Ekstraktiraj **3-5 konkretnih kratkih natuknica** o premium/edge tragovima koje vidiš (npr. "European Society of Implantology member", "designer interijer s mramornim podom", "after-hours emergency", "20+ godina iskustva"). Ne generic — konkretno.

# Format izlaza — STRIKT JSON, ništa drugo:

{
  "owners": [{"name": "dr. Marko Marčelić", "role": "Founder & glavni doktor", "linkedin": "https://...", "email": null, "phone": null}],
  "icp_breakdown": {
    "lice_branda": 3,
    "edge": 2,
    "premium": 4,
    "dokaz": 3,
    "brzina_odluke": 4
  },
  "icp_score": 16,
  "premium_signals": ["...", "..."],
  "score_reasoning": "1 rečenica zašto si dao taj score."
}

NE dodaj markdown code fence, NE objašnjenja, samo JSON.`;

interface ParsedEnrichment {
  owners: Array<{
    name: string;
    role?: string;
    linkedin?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  icp_breakdown: {
    lice_branda: number;
    edge: number;
    premium: number;
    dokaz: number;
    brzina_odluke: number;
  };
  icp_score: number;
  premium_signals: string[];
  score_reasoning: string;
}

function parseEnrichment(raw: string): ParsedEnrichment | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ParsedEnrichment;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as ParsedEnrichment;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function enrichAndScoreClinic(
  anthropic: Anthropic,
  c: ProspectCandidate,
): Promise<ProspectCandidate> {
  // 1. Try to scrape the website (fail silently — Apollo + Places data still useful)
  let scrapedText: string | null = null;
  let scrapedPages: string[] = [];
  if (c.website) {
    const scraped = await scrapeSite(c.website);
    if (scraped) {
      scrapedText = scraped.combinedText;
      scrapedPages = scraped.pages.map((p) => p.url);
    }
  }

  // 2. Build context for AI
  const apolloHints: string[] = [];
  if (c.apolloOrg?.industry)
    apolloHints.push(`Industry: ${c.apolloOrg.industry}`);
  if (c.apolloOrg?.estimated_num_employees)
    apolloHints.push(`Employees: ${c.apolloOrg.estimated_num_employees}`);
  if (c.apolloOrg?.linkedin_url)
    apolloHints.push(`Org LinkedIn: ${c.apolloOrg.linkedin_url}`);
  if (c.rating !== undefined && c.reviewCount !== undefined)
    apolloHints.push(`Google rating: ${c.rating} (${c.reviewCount} reviews)`);

  // Apollo top_people (if any) — use as decision-maker hints
  const apolloPeopleSummary =
    c.topPeople && c.topPeople.length > 0
      ? c.topPeople
          .slice(0, 5)
          .map((p) => {
            const fullName =
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              p.name ||
              "?";
            return `- ${fullName}${p.title ? ` (${p.title})` : ""}${p.linkedin_url ? ` ${p.linkedin_url}` : ""}`;
          })
          .join("\n")
      : null;

  const userMessage = `# Klinika
**Name:** ${c.name}
**Address:** ${c.address ?? "?"}
**Website:** ${c.website ?? "?"}
**Phone:** ${c.phone ?? "?"}

# Apollo enrich data
${apolloHints.length > 0 ? apolloHints.join("\n") : "(no Apollo data)"}

${apolloPeopleSummary ? `# Apollo top people\n${apolloPeopleSummary}` : ""}

# Scraped website content (multiple pages combined)
${scrapedText ? scrapedText : "(website not reachable or no content)"}

Sad ekstraktiraj vlasnike + score-aj ICP po pravilima. STRIKT JSON.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: ENRICH_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw =
      textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = parseEnrichment(raw);
    if (!parsed) return { ...c, scrapedPages };

    return {
      ...c,
      scrapedPages,
      owners: parsed.owners.map((o) => ({
        name: o.name,
        role: o.role,
        linkedin: o.linkedin ?? undefined,
        email: o.email ?? undefined,
        phone: o.phone ?? undefined,
        source: "website",
      })),
      icpScore: parsed.icp_score,
      icpBreakdown: parsed.icp_breakdown,
      premiumSignals: parsed.premium_signals,
      scoreReasoning: parsed.score_reasoning,
    };
  } catch {
    return { ...c, scrapedPages };
  }
}

interface ApolloConfig {
  api_key: string;
}

async function getApolloKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "apollo")
    .maybeSingle();
  if (!data?.config) return null;
  const cfg = data.config as ApolloConfig;
  return cfg.api_key ?? null;
}

export async function runProspector(
  input: ProspectorInput,
): Promise<ProspectorResult> {
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!placesKey) {
    return {
      ok: false,
      error: "GOOGLE_PLACES_API_KEY nije postavljen u Vercel env vars",
    };
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const niche = input.niche.trim();
  const location = input.location.trim();
  if (!niche || !location)
    return { ok: false, error: "Niche + location obavezni" };

  // 1. Places search
  const query = `${niche} ${location}`;
  const placesRes = await searchText({
    apiKey: placesKey,
    textQuery: query,
    regionCode: input.regionCode ?? "hr",
    maxResultCount: Math.min(input.count ?? 10, 20),
  });
  if (!placesRes.ok || !placesRes.places) {
    return { ok: false, error: placesRes.error ?? "Places search failed" };
  }

  const apolloKey = await getApolloKey(supabase);

  let enrichedCount = 0;
  let peopleCount = 0;

  // 2. For each place, optionally enrich via Apollo (free tier)
  const baseCandidates: ProspectCandidate[] = await Promise.all(
    placesRes.places.map(async (p: PlaceResult) => {
      const c: ProspectCandidate = {
        placeId: p.id,
        name: p.name,
        address: p.formattedAddress,
        website: p.websiteUri,
        domain: p.domain,
        phone: p.internationalPhoneNumber,
        rating: p.rating,
        reviewCount: p.userRatingCount,
        googleMapsUri: p.googleMapsUri,
      };

      if (apolloKey && c.domain) {
        const enriched = await enrichOrganization({
          apiKey: apolloKey,
          domain: c.domain,
        });
        if (enriched.ok && enriched.org) {
          c.apolloOrg = enriched.org;
          enrichedCount++;
          if (enriched.org.id) {
            const tops = await organizationTopPeople({
              apiKey: apolloKey,
              organizationId: enriched.org.id,
            });
            if (tops.ok && tops.people) {
              c.topPeople = tops.people.slice(0, 5);
              peopleCount += c.topPeople.length;
            }
          }
        }
      }
      return c;
    }),
  );

  // 3. AI enrich + ICP score per candidate (parallel, scrapes website + Claude)
  let scoredCount = 0;
  let candidates: ProspectCandidate[] = baseCandidates;
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    candidates = await Promise.all(
      baseCandidates.map(async (c) => {
        const enriched = await enrichAndScoreClinic(anthropic, c);
        if (typeof enriched.icpScore === "number") scoredCount++;
        return enriched;
      }),
    );
  }

  return {
    ok: true,
    candidates,
    enrichedCount,
    peopleCount,
    scoredCount,
  };
}

export interface AddCandidatesInput {
  /** Full enriched ProspectCandidate snapshots — saves all AI work */
  candidates: ProspectCandidate[];
}

export async function addProspectsToPipeline(
  input: AddCandidatesInput,
): Promise<{ ok: boolean; added: number; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, added: 0, error: "Niste prijavljeni" };

  const userId = userData.user.id;
  let added = 0;
  for (const c of input.candidates) {
    // Pick the primary owner (first AI-extracted, fallback to Apollo top person)
    const primaryOwner = c.owners?.[0];
    const fallbackPerson =
      !primaryOwner && c.topPeople && c.topPeople.length > 0
        ? c.topPeople[0]
        : null;
    const ownerName =
      primaryOwner?.name ??
      (fallbackPerson
        ? [fallbackPerson.first_name, fallbackPerson.last_name]
            .filter(Boolean)
            .join(" ") ||
          fallbackPerson.name ||
          undefined
        : undefined);
    const ownerRole = primaryOwner?.role ?? fallbackPerson?.title ?? undefined;
    const ownerLinkedin =
      primaryOwner?.linkedin ?? fallbackPerson?.linkedin_url ?? undefined;
    const ownerEmail = primaryOwner?.email ?? fallbackPerson?.email ?? undefined;
    const ownerPhone = primaryOwner?.phone;

    const leadName = ownerName ? `${c.name} / ${ownerName}` : c.name;

    const notesParts = [
      c.scoreReasoning ? `🤖 ${c.scoreReasoning}` : null,
      c.premiumSignals && c.premiumSignals.length > 0
        ? `✨ Premium signals: ${c.premiumSignals.join(" · ")}`
        : null,
      ownerRole ? `Title: ${ownerRole}` : null,
      ownerLinkedin ? `LinkedIn: ${ownerLinkedin}` : null,
      ownerPhone ? `Owner phone: ${ownerPhone}` : null,
      c.apolloOrg?.linkedin_url
        ? `Org LinkedIn: ${c.apolloOrg.linkedin_url}`
        : null,
      c.apolloOrg?.industry ? `Industry: ${c.apolloOrg.industry}` : null,
      typeof c.apolloOrg?.estimated_num_employees === "number"
        ? `Employees: ${c.apolloOrg.estimated_num_employees}`
        : null,
      c.rating !== undefined && c.reviewCount !== undefined
        ? `Google: ⭐ ${c.rating} (${c.reviewCount})`
        : null,
      c.address ? `Address: ${c.address}` : null,
      c.phone ? `Phone: ${c.phone}` : null,
      c.website ? `Website: ${c.website}` : null,
      c.googleMapsUri ? `Maps: ${c.googleMapsUri}` : null,
      c.owners && c.owners.length > 1
        ? `Other contacts:\n${c.owners
            .slice(1, 4)
            .map(
              (o) =>
                `  - ${o.name}${o.role ? ` (${o.role})` : ""}${o.linkedin ? ` ${o.linkedin}` : ""}${o.email ? ` ${o.email}` : ""}`,
            )
            .join("\n")}`
        : null,
      `Place ID: ${c.placeId}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: userId,
        name: leadName,
        email: ownerEmail ?? null,
        source: "other",
        stage: "discovery",
        icp_score: c.icpScore ?? 0,
        icp_breakdown: c.icpBreakdown ?? {},
        notes: notesParts,
      })
      .select("id")
      .single();

    if (error) continue;
    added++;

    void logActivity(userId, {
      type: "lead_scored",
      title: `AI Prospector → ${leadName}${typeof c.icpScore === "number" ? ` · ${c.icpScore}/20` : ""}`,
      summary:
        c.scoreReasoning ??
        c.apolloOrg?.industry ??
        c.address ??
        "Prospect added",
      hqRoom: "lead_scorer",
      hqRowId: data.id,
      tags: [
        "prospector",
        "places",
        c.apolloOrg?.industry,
        typeof c.icpScore === "number" && c.icpScore >= 14 ? "hot" : null,
      ].filter(Boolean) as string[],
    });
  }

  revalidatePath("/");
  return { ok: true, added };
}

// =============================================================================
// Bulk re-enrich existing leads that don't have an ICP score yet.
// Walks the leads table for any `icp_score = 0` or null, extracts website from
// the lead's notes (or email domain), runs scrapeSite + AI enrich + score, then
// updates the row.
// =============================================================================

interface LeadRowSlim {
  id: string;
  name: string;
  email: string | null;
  notes: string | null;
  icp_score: number | null;
}

function extractWebsiteFromNotes(
  notes: string | null,
  email: string | null,
): string | null {
  if (notes) {
    const m = notes.match(/Website:\s*(https?:\/\/[^\s\n]+)/i);
    if (m?.[1]) return m[1];
  }
  if (email && email.includes("@")) {
    const domain = email.split("@")[1];
    if (domain) return `https://${domain}`;
  }
  return null;
}

function extractGoogleRating(
  notes: string | null,
): { rating: number; count: number } | null {
  if (!notes) return null;
  const m = notes.match(/Google:\s*⭐\s*([\d.]+)\s*\((\d+)\)/i);
  if (!m) return null;
  return {
    rating: parseFloat(m[1]),
    count: parseInt(m[2], 10),
  };
}

function extractAddress(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/Address:\s*([^\n]+)/i);
  return m?.[1]?.trim() ?? null;
}

function extractIndustry(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/Industry:\s*([^\n]+)/i);
  return m?.[1]?.trim() ?? null;
}

function extractEmployees(notes: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(/Employees:\s*(\d+)/i);
  return m?.[1] ? parseInt(m[1], 10) : null;
}

export interface BulkEnrichResult {
  ok: boolean;
  scanned: number;
  scored: number;
  skipped: number;
  error?: string;
}

export async function bulkReEnrichUnscored(): Promise<BulkEnrichResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return {
      ok: false,
      scanned: 0,
      scored: 0,
      skipped: 0,
      error: "Niste prijavljeni",
    };

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      scanned: 0,
      scored: 0,
      skipped: 0,
      error: "ANTHROPIC_API_KEY nije postavljen",
    };
  }

  const { data: leads, error: selErr } = await supabase
    .from("leads")
    .select("id, name, email, notes, icp_score")
    .or("icp_score.is.null,icp_score.eq.0");

  if (selErr)
    return { ok: false, scanned: 0, scored: 0, skipped: 0, error: selErr.message };

  const list = (leads ?? []) as LeadRowSlim[];
  if (list.length === 0)
    return { ok: true, scanned: 0, scored: 0, skipped: 0 };

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let scored = 0;
  let skipped = 0;

  await Promise.all(
    list.map(async (lead) => {
      const website = extractWebsiteFromNotes(lead.notes, lead.email);
      if (!website) {
        skipped++;
        return;
      }

      const googleRating = extractGoogleRating(lead.notes);
      const apolloOrg = {
        id: "",
        name: lead.name,
        industry: extractIndustry(lead.notes) ?? undefined,
        estimated_num_employees: extractEmployees(lead.notes) ?? undefined,
      } as ApolloOrg;

      const c: ProspectCandidate = {
        placeId: lead.id,
        name: lead.name,
        website,
        domain: (() => {
          try {
            return new URL(website).hostname.replace(/^www\./, "");
          } catch {
            return undefined;
          }
        })(),
        address: extractAddress(lead.notes) ?? undefined,
        rating: googleRating?.rating,
        reviewCount: googleRating?.count,
        apolloOrg: apolloOrg.industry || apolloOrg.estimated_num_employees
          ? apolloOrg
          : undefined,
      };

      const enriched = await enrichAndScoreClinic(anthropic, c);
      if (typeof enriched.icpScore !== "number") {
        skipped++;
        return;
      }

      // Compose the new notes with AI reasoning + premium signals + owners,
      // then preserve the original metadata block.
      const primaryOwner = enriched.owners?.[0];
      const ownerEmail = primaryOwner?.email ?? lead.email ?? null;

      const enrichmentBlock = [
        enriched.scoreReasoning ? `🤖 ${enriched.scoreReasoning}` : null,
        enriched.premiumSignals && enriched.premiumSignals.length > 0
          ? `✨ Premium signals: ${enriched.premiumSignals.join(" · ")}`
          : null,
        enriched.owners && enriched.owners.length > 0
          ? `👥 AI vlasnici:\n${enriched.owners
              .map(
                (o) =>
                  `  - ${o.name}${o.role ? ` (${o.role})` : ""}${o.linkedin ? ` ${o.linkedin}` : ""}${o.email ? ` ${o.email}` : ""}${o.phone ? ` 📞 ${o.phone}` : ""}`,
              )
              .join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      // Strip any previous AI block so we don't duplicate
      const cleanedOriginalNotes = (lead.notes ?? "")
        .replace(/^🤖[^\n]*\n?/gm, "")
        .replace(/^✨ Premium signals:[^\n]*\n?/gm, "")
        .replace(/^👥 AI vlasnici:[\s\S]*?(?=\n[A-Z]|\n$|$)/gm, "")
        .trim();

      const newNotes = enrichmentBlock
        ? `${enrichmentBlock}\n\n${cleanedOriginalNotes}`.trim()
        : cleanedOriginalNotes;

      const ownerName = primaryOwner?.name;
      const newName = ownerName && !lead.name.includes("/")
        ? `${lead.name} / ${ownerName}`
        : lead.name;

      const { error: updErr } = await supabase
        .from("leads")
        .update({
          icp_score: enriched.icpScore,
          icp_breakdown: enriched.icpBreakdown ?? {},
          email: ownerEmail,
          notes: newNotes,
          name: newName,
        })
        .eq("id", lead.id);
      if (updErr) {
        skipped++;
        return;
      }

      scored++;

      void logActivity(userData.user!.id, {
        type: "lead_scored",
        title: `AI re-score: ${newName} · ${enriched.icpScore}/20`,
        summary: enriched.scoreReasoning,
        hqRoom: "lead_scorer",
        hqRowId: lead.id,
        tags: [
          "re-enrich",
          enriched.icpScore >= 14 ? "hot" : null,
        ].filter(Boolean) as string[],
      });
    }),
  );

  revalidatePath("/");
  return { ok: true, scanned: list.length, scored, skipped };
}
