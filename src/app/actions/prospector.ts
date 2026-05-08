"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchText, type PlaceResult } from "@/lib/places";
import {
  enrichOrganization,
  organizationTopPeople,
  type ApolloOrg,
  type ApolloPerson,
} from "@/lib/apollo";
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
}

export interface ProspectorResult {
  ok: boolean;
  candidates?: ProspectCandidate[];
  error?: string;
  /** Diagnostics: how many enrich/top_people calls succeeded */
  enrichedCount?: number;
  peopleCount?: number;
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
  const candidates: ProspectCandidate[] = await Promise.all(
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

  return {
    ok: true,
    candidates,
    enrichedCount,
    peopleCount,
  };
}

export interface AddCandidatesInput {
  candidates: Array<{
    name: string;
    address?: string;
    website?: string;
    phone?: string;
    placeId: string;
    googleMapsUri?: string;
    employeeCount?: number;
    industry?: string;
    organizationLinkedin?: string;
    /** Single decision-maker pre-selected for this lead row */
    decisionMakerName?: string;
    decisionMakerTitle?: string;
    decisionMakerLinkedin?: string;
  }>;
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
    const leadName = c.decisionMakerName
      ? `${c.name} / ${c.decisionMakerName}`
      : c.name;
    const notesParts = [
      c.decisionMakerTitle ? `Title: ${c.decisionMakerTitle}` : null,
      c.decisionMakerLinkedin ? `LinkedIn: ${c.decisionMakerLinkedin}` : null,
      c.organizationLinkedin ? `Org LinkedIn: ${c.organizationLinkedin}` : null,
      c.industry ? `Industry: ${c.industry}` : null,
      typeof c.employeeCount === "number"
        ? `Employees: ${c.employeeCount}`
        : null,
      c.address ? `Address: ${c.address}` : null,
      c.phone ? `Phone: ${c.phone}` : null,
      c.website ? `Website: ${c.website}` : null,
      c.googleMapsUri ? `Maps: ${c.googleMapsUri}` : null,
      `Place ID: ${c.placeId}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: userId,
        name: leadName,
        source: "other",
        stage: "discovery",
        icp_breakdown: {},
        notes: notesParts,
      })
      .select("id")
      .single();

    if (error) continue;
    added++;

    void logActivity(userId, {
      type: "lead_scored",
      title: `AI Prospector → ${leadName}`,
      summary: c.industry ?? c.address ?? "Prospect added",
      hqRoom: "lead_scorer",
      hqRowId: data.id,
      tags: ["prospector", "places", c.industry].filter(Boolean) as string[],
    });
  }

  revalidatePath("/");
  return { ok: true, added };
}
