"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseOwnerCandidates,
  pickBestOwnerMatch,
  searchOwnersForOrg,
  type OwnerCandidate,
} from "@/lib/personSearch";
import { checkLinkedInProfile } from "@/lib/channelHealth";
import { huntOwnerInstagram } from "@/lib/instagramHunter";
import { logActivity } from "./activityLog";

interface ApolloIntegrationConfig {
  api_key?: string;
}

async function getApolloKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "apollo")
    .maybeSingle();
  const cfg = data?.config as ApolloIntegrationConfig | undefined;
  return cfg?.api_key ?? null;
}

export interface PersonEnrichmentChannel {
  status:
    | "alive"
    | "recently_active"
    | "dormant"
    | "dead"
    | "blocked"
    | "unknown";
  followers?: number;
  reason?: string;
}

export interface PersonEnrichmentRecord {
  name: string;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  email_status: string | null;
  apollo_id: string | null;
  match_score: number;
  channels: {
    email?: string;
    linkedin?: string;
    instagram?: string;
  };
  channelHealth?: {
    linkedin?: PersonEnrichmentChannel;
    instagram?: PersonEnrichmentChannel;
  };
  instagram_pattern?: string; // tells us how the IG handle was guessed
}

export interface LeadPersonEnrichment {
  owner: PersonEnrichmentRecord | null;
  candidates_searched: string[];
  apollo_total: number;
  apollo_skipped?: boolean;
  enriched_at: string;
  city_filter?: string | null;
  note?: string;
}

export interface DeepEnrichResult {
  ok: boolean;
  enrichment?: LeadPersonEnrichment;
  error?: string;
}

/**
 * Heuristic to pull the most distinctive token out of a lead name to
 * use as the Apollo organization keyword. Avoids generic words like
 * "Stomatološka", "ordinacija", "klinika", etc.
 */
function extractOrgKeyword(leadName: string): string {
  const stop = new Set([
    "stomatološka","stomatoloska","ordinacija","klinika","centar","centar.",
    "dental","dentalne","dentalni","medicine","poliklinika","polyclinic",
    "estetska","estetske","fizio","fizioterapija","ortopedija","ortodoncija",
    "dr","dr.","prof","prof.","mr","mr.","spec","med","dent","dds","of","i",
    "and","&","+","/","-","–","—","|","clinic","centre","center",
  ]);
  const tokens = leadName
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+|[/\-–—|]+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 3 &&
        !stop.has(t.toLowerCase()) &&
        !/^[A-Z]{2,4}$/.test(t), // skip acronyms like "DDS"
    );
  // Prefer the first token that looks distinctive (capitalised + ≥4 char)
  const distinctive = tokens.find(
    (t) => /^[A-ZŠĐČĆŽ]/.test(t) && t.length >= 4,
  );
  return distinctive ?? tokens[0] ?? leadName.split(/\s+/)[0] ?? leadName;
}

export async function deepEnrichLead(
  leadId: string,
): Promise<DeepEnrichResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, niche")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead nije pronađen" };

  const apiKey = await getApolloKey(supabase);

  // 1. Owner candidates from clinic name
  const candidates = parseOwnerCandidates(lead.name as string);

  // 2. Apollo search (skipped if no key configured)
  const orgKeyword = extractOrgKeyword(lead.name as string);

  let apolloPeople: Awaited<ReturnType<typeof searchOwnersForOrg>>;
  let owner: PersonEnrichmentRecord | null = null;
  let apolloTotal = 0;
  let apolloSkipped = false;
  let note: string | undefined;

  if (!apiKey) {
    apolloSkipped = true;
    note = "Apollo nije povezan — vraćam samo parsed candidate(s)";
  } else {
    apolloPeople = await searchOwnersForOrg({
      apiKey,
      organizationKeyword: orgKeyword,
    });
    if (!apolloPeople.ok) {
      note = `Apollo error: ${apolloPeople.error ?? "unknown"}`;
    } else {
      apolloTotal = apolloPeople.people?.length ?? 0;
      const match = pickBestOwnerMatch(candidates, apolloPeople.people ?? []);

      // No Apollo hit but we DO have a parsed candidate from the clinic
      // name — still try IG hunt + record the name as best-effort owner.
      if ((!match || match.score < 0.3) && candidates[0]) {
        const c = candidates[0];
        const igHunt = await huntOwnerInstagram(
          c.firstName,
          c.lastName,
        ).catch(() => null);
        if (igHunt) {
          owner = {
            name: c.fullName,
            title: null,
            linkedin_url: null,
            email: null,
            email_status: null,
            apollo_id: null,
            match_score: c.confidence,
            channels: { instagram: igHunt.url },
            channelHealth: {
              instagram: {
                status: "alive",
                followers: igHunt.followers,
                reason: `pattern: ${igHunt.matchedPattern}`,
              },
            },
            instagram_pattern: igHunt.matchedPattern,
          };
        }
      }

      if (match && match.score >= 0.3) {
        const p = match.person;
        const fullName =
          p.name ??
          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
        const channels: PersonEnrichmentRecord["channels"] = {};
        if (p.email) channels.email = p.email;
        if (p.linkedin_url) channels.linkedin = p.linkedin_url;

        const channelHealth: PersonEnrichmentRecord["channelHealth"] = {};

        // Run LinkedIn check + IG handle hunt in parallel — both are slow
        const liPromise = p.linkedin_url
          ? checkLinkedInProfile(p.linkedin_url).catch(() => null)
          : Promise.resolve(null);

        const firstName =
          p.first_name ??
          fullName.split(/\s+/)[0] ??
          match.matchedCandidate?.firstName ??
          "";
        const lastName =
          p.last_name ??
          fullName.split(/\s+/).slice(-1)[0] ??
          match.matchedCandidate?.lastName ??
          "";
        const igPromise =
          firstName && lastName
            ? huntOwnerInstagram(firstName, lastName).catch(() => null)
            : Promise.resolve(null);

        const [liHealth, igHunt] = await Promise.all([liPromise, igPromise]);

        if (liHealth) {
          channelHealth.linkedin = {
            status: liHealth.status,
            followers: liHealth.followers,
            reason: liHealth.reason,
          };
        }

        let instagramPattern: string | undefined;
        if (igHunt) {
          channels.instagram = igHunt.url;
          channelHealth.instagram = {
            status: "alive",
            followers: igHunt.followers,
            reason: igHunt.followers
              ? `${igHunt.followers} followers · pattern: ${igHunt.matchedPattern}`
              : `pattern: ${igHunt.matchedPattern}`,
          };
          instagramPattern = igHunt.matchedPattern;
        }

        owner = {
          name: fullName || (match.matchedCandidate?.fullName ?? ""),
          title: p.title ?? p.headline ?? null,
          linkedin_url: p.linkedin_url ?? null,
          email: p.email ?? null,
          email_status: p.email_status ?? null,
          apollo_id: p.id,
          match_score: Number(match.score.toFixed(2)),
          channels,
          channelHealth,
          instagram_pattern: instagramPattern,
        };
      }
    }
  }

  // 3. Persist (always — even if owner is null, we record the attempt)
  const enrichment: LeadPersonEnrichment = {
    owner,
    candidates_searched: candidates.map((c) => c.fullName),
    apollo_total: apolloTotal,
    apollo_skipped: apolloSkipped || undefined,
    enriched_at: new Date().toISOString(),
    note,
  };

  const { error } = await supabase
    .from("leads")
    .update({ person_enrichment: enrichment })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "lead_scored",
    title: `Deep enrich: ${lead.name}`,
    summary: owner
      ? `Owner: ${owner.name}${owner.title ? ` (${owner.title})` : ""}${owner.email ? ` · ${owner.email}` : ""}`
      : `Bez match-a (Apollo total: ${apolloTotal}, candidates: ${candidates.length})`,
    hqRoom: "lead_scorer",
    hqRowId: leadId,
  });

  revalidatePath("/");
  return { ok: true, enrichment };
}

/**
 * Bulk version — runs deepEnrichLead for every Hot lead (≥15 ICP, active
 * stage) that doesn't yet have person_enrichment. Sequential to respect
 * Apollo Free tier rate limits.
 */
export async function bulkDeepEnrichHot(): Promise<{
  ok: boolean;
  enriched: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return { ok: false, enriched: 0, skipped: 0, errors: ["Niste prijavljeni"] };

  const { data: hotLeads } = await supabase
    .from("leads")
    .select("id, person_enrichment")
    .gte("icp_score", 15)
    .in("stage", ["discovery", "pricing", "financing", "booking"]);

  const candidates = (hotLeads ?? []) as Array<{
    id: string;
    person_enrichment: LeadPersonEnrichment | null;
  }>;
  const todo = candidates.filter((l) => !l.person_enrichment?.owner);
  if (todo.length === 0)
    return {
      ok: true,
      enriched: 0,
      skipped: candidates.length,
      errors: [],
    };

  let enriched = 0;
  const errors: string[] = [];
  for (const l of todo) {
    const res = await deepEnrichLead(l.id);
    if (!res.ok) {
      errors.push(`${l.id}: ${res.error ?? "unknown"}`);
    } else if (res.enrichment?.owner) {
      enriched++;
    }
    // Cooperative pause to stay under Apollo's per-second cap
    await new Promise((r) => setTimeout(r, 250));
  }

  revalidatePath("/");
  return {
    ok: true,
    enriched,
    skipped: candidates.length - todo.length,
    errors,
  };
}
