"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  matchPerson,
  pingApollo,
  searchPeople,
  type ApolloPerson,
} from "@/lib/apollo";
import { logActivity } from "./activityLog";

export interface ApolloStatus {
  connected: boolean;
  email?: string;
  setupAt?: string;
}

interface ApolloConfig {
  api_key: string;
  email?: string;
  setup_at?: string;
}

export async function setupApollo(
  apiKey: string,
): Promise<{ ok: boolean; error?: string; email?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const trimmed = apiKey.trim();
  if (!trimmed) return { ok: false, error: "Apollo API key je obavezan" };

  const ping = await pingApollo(trimmed);
  if (!ping.ok) {
    return {
      ok: false,
      error: `Apollo validation failed: ${ping.error}. Provjeri da je key ispravan i da nije expired.`,
    };
  }

  const config: ApolloConfig = {
    api_key: trimmed,
    email: ping.userEmail,
    setup_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: userData.user.id,
      provider: "apollo",
      config,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/integrations");
  return { ok: true, email: ping.userEmail };
}

export async function getApolloStatus(): Promise<ApolloStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "apollo")
    .maybeSingle();
  if (!data?.config) return { connected: false };
  const c = data.config as ApolloConfig;
  return { connected: true, email: c.email, setupAt: c.setup_at };
}

export async function disconnectApollo(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("provider", "apollo")
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/integrations");
  return { ok: true };
}

async function getApiKey(): Promise<{ ok: boolean; apiKey?: string; error?: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "apollo")
    .maybeSingle();
  if (!data?.config) return { ok: false, error: "Apollo nije povezan" };
  const c = data.config as ApolloConfig;
  if (!c.api_key) return { ok: false, error: "Apollo API key fali" };
  return { ok: true, apiKey: c.api_key };
}

export interface DiscoveryFilters {
  countries?: string[];
  cities?: string[];
  organizationKeyword?: string;
  titles?: string[];
  page?: number;
}

export interface DiscoveryResult {
  ok: boolean;
  people?: ApolloPerson[];
  total?: number;
  error?: string;
}

export async function searchProspects(
  filters: DiscoveryFilters,
): Promise<DiscoveryResult> {
  const key = await getApiKey();
  if (!key.ok || !key.apiKey) return { ok: false, error: key.error };

  const result = await searchPeople({
    apiKey: key.apiKey,
    countries: filters.countries,
    cities: filters.cities,
    organizationKeyword: filters.organizationKeyword,
    titles: filters.titles,
    page: filters.page ?? 1,
    perPage: 10,
  });
  return result;
}

export interface AddProspectInput {
  apolloPersonId: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  linkedinUrl?: string;
  organizationName?: string;
  organizationDomain?: string;
  organizationCity?: string;
  organizationCountry?: string;
  /** Whether to spend an Apollo credit to reveal the email if missing */
  revealEmail?: boolean;
}

export async function addProspectToPipeline(
  input: AddProspectInput,
): Promise<{ ok: boolean; leadId?: string; revealedEmail?: string; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  let email = input.email;

  if ((!email || email.includes("email_not_unlocked")) && input.revealEmail) {
    const key = await getApiKey();
    if (key.ok && key.apiKey) {
      const matched = await matchPerson({
        apiKey: key.apiKey,
        firstName: input.firstName,
        lastName: input.lastName,
        organizationName: input.organizationName,
        domain: input.organizationDomain,
        linkedinUrl: input.linkedinUrl,
        revealPersonalEmails: false,
      });
      if (matched.ok && matched.person?.email) {
        email = matched.person.email;
      }
    }
  }

  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const leadName = [input.organizationName, fullName].filter(Boolean).join(" / ").trim() ||
    fullName ||
    input.organizationName ||
    "Apollo lead";

  const notes = [
    input.title ? `Title: ${input.title}` : null,
    input.linkedinUrl ? `LinkedIn: ${input.linkedinUrl}` : null,
    input.organizationCity || input.organizationCountry
      ? `Location: ${[input.organizationCity, input.organizationCountry]
          .filter(Boolean)
          .join(", ")}`
      : null,
    input.organizationDomain ? `Domain: ${input.organizationDomain}` : null,
    `Apollo person id: ${input.apolloPersonId}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: userData.user.id,
      name: leadName,
      email: email ?? null,
      source: "other",
      stage: "discovery",
      icp_breakdown: {},
      notes,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "lead_scored",
    title: `Apollo prospect dodan: ${leadName}`,
    summary: [input.title, email ? `email: ${email}` : null]
      .filter(Boolean)
      .join(" · "),
    hqRoom: "lead_scorer",
    hqRowId: data.id,
    tags: ["apollo", "prospecting"],
  });

  revalidatePath("/");
  return { ok: true, leadId: data.id, revealedEmail: email };
}
