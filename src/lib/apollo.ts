/**
 * Apollo.io REST API helpers (no SDK).
 *
 * Free tier: 100 credits/month. Most searches are free; only contact email
 * reveals consume credits (1 per email).
 *
 * Auth: header `X-Api-Key: <APOLLO_API_KEY>`.
 */

const API_BASE = "https://api.apollo.io/api/v1";

type AnyJson = Record<string, unknown>;

async function apolloFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "X-Api-Key": apiKey.trim(),
        "Cache-Control": "no-cache",
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
    const json = (await res.json()) as { error?: string; message?: string } & T;
    if (!res.ok) {
      return {
        ok: false,
        error:
          (json.error as string) ??
          (json.message as string) ??
          `Apollo HTTP ${res.status}`,
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Apollo fetch error",
    };
  }
}

export interface ApolloOrg {
  id: string;
  name: string;
  website_url?: string;
  primary_domain?: string;
  industry?: string;
  organization_city?: string;
  organization_country?: string;
  organization_state?: string;
  estimated_num_employees?: number;
  linkedin_url?: string;
  short_description?: string;
}

export interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  headline?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  city?: string;
  country?: string;
  state?: string;
  organization?: ApolloOrg;
}

export interface SearchPeopleInput {
  apiKey: string;
  /** Country names (e.g. ["Croatia"]) or ISO codes accepted by Apollo */
  countries?: string[];
  cities?: string[];
  /** Industries / keywords describing the company (e.g. ["dental", "dermatology"]) */
  industries?: string[];
  /** Job titles to target — e.g. ["owner", "founder", "director", "ceo"] */
  titles?: string[];
  /** Free-text company keyword (e.g. "klinika", "estetska", "fizio") */
  organizationKeyword?: string;
  page?: number;
  perPage?: number;
}

interface PeopleSearchResponse {
  people: ApolloPerson[];
  contacts?: ApolloPerson[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export async function searchPeople(
  input: SearchPeopleInput,
): Promise<{ ok: boolean; people?: ApolloPerson[]; total?: number; error?: string }> {
  const body: AnyJson = {
    page: input.page ?? 1,
    per_page: Math.min(input.perPage ?? 10, 25),
  };
  if (input.countries?.length) body.person_locations = input.countries;
  if (input.cities?.length) {
    body.person_locations = [
      ...((body.person_locations as string[] | undefined) ?? []),
      ...input.cities,
    ];
  }
  if (input.titles?.length) body.person_titles = input.titles;
  if (input.industries?.length) body.q_organization_industry_tag_ids = input.industries;
  if (input.organizationKeyword?.trim()) {
    body.q_organization_keyword_tags = [input.organizationKeyword.trim()];
  }

  const res = await apolloFetch<PeopleSearchResponse>(
    input.apiKey,
    "/mixed_people/search",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) return { ok: false, error: res.error };
  const merged = [
    ...(res.data.people ?? []),
    ...(res.data.contacts ?? []),
  ];
  return {
    ok: true,
    people: merged,
    total: res.data.pagination?.total_entries ?? merged.length,
  };
}

export interface SearchOrgsInput {
  apiKey: string;
  countries?: string[];
  cities?: string[];
  industries?: string[];
  organizationKeyword?: string;
  /** e.g. ["1,10"] for 1-10 employees */
  employeeRanges?: string[];
  page?: number;
  perPage?: number;
}

interface OrgsSearchResponse {
  organizations?: ApolloOrg[];
  accounts?: ApolloOrg[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export async function searchOrganizations(
  input: SearchOrgsInput,
): Promise<{
  ok: boolean;
  orgs?: ApolloOrg[];
  total?: number;
  error?: string;
}> {
  const body: AnyJson = {
    page: input.page ?? 1,
    per_page: Math.min(input.perPage ?? 10, 25),
  };
  if (input.countries?.length) body.organization_locations = input.countries;
  if (input.cities?.length) {
    body.organization_locations = [
      ...((body.organization_locations as string[] | undefined) ?? []),
      ...input.cities,
    ];
  }
  if (input.employeeRanges?.length)
    body.organization_num_employees_ranges = input.employeeRanges;
  if (input.organizationKeyword?.trim())
    body.q_organization_keyword_tags = [input.organizationKeyword.trim()];

  const res = await apolloFetch<OrgsSearchResponse>(
    input.apiKey,
    "/mixed_companies/search",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) return { ok: false, error: res.error };
  const merged = [
    ...(res.data.organizations ?? []),
    ...(res.data.accounts ?? []),
  ];
  return {
    ok: true,
    orgs: merged,
    total: res.data.pagination?.total_entries ?? merged.length,
  };
}

/**
 * Reveal/enrich a single person — costs 1 credit if their email isn't already
 * in the user's Apollo workspace.
 */
export async function matchPerson(opts: {
  apiKey: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  domain?: string;
  linkedinUrl?: string;
  email?: string;
  revealPersonalEmails?: boolean;
}): Promise<{ ok: boolean; person?: ApolloPerson; error?: string }> {
  const body: AnyJson = {
    reveal_personal_emails: !!opts.revealPersonalEmails,
  };
  if (opts.firstName) body.first_name = opts.firstName;
  if (opts.lastName) body.last_name = opts.lastName;
  if (opts.organizationName) body.organization_name = opts.organizationName;
  if (opts.domain) body.domain = opts.domain;
  if (opts.linkedinUrl) body.linkedin_url = opts.linkedinUrl;
  if (opts.email) body.email = opts.email;

  const res = await apolloFetch<{ person?: ApolloPerson }>(
    opts.apiKey,
    "/people/match",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, person: res.data.person };
}

/** Light wrapper to validate that the API key is good. */
export async function pingApollo(
  apiKey: string,
): Promise<{ ok: boolean; userEmail?: string; error?: string }> {
  const res = await apolloFetch<{
    user?: { email?: string; name?: string };
    is_logged_in?: boolean;
  }>(apiKey, "/auth/health", {
    method: "GET",
  });
  if (!res.ok) {
    // Fall back to enrich probe (free-tier safe)
    const probe = await apolloFetch<unknown>(apiKey, "/organizations/enrich", {
      method: "POST",
      body: JSON.stringify({ domain: "apollo.io" }),
    });
    if (!probe.ok) return { ok: false, error: probe.error };
    return { ok: true };
  }
  return { ok: true, userEmail: res.data.user?.email };
}

// ===========================================================================
// Free-tier endpoints — work on Apollo Free plan
// ===========================================================================

/**
 * Enrich an organization by domain. Free-tier safe.
 * Returns full org info including industry, size, LinkedIn, founded year.
 */
export async function enrichOrganization(opts: {
  apiKey: string;
  domain: string;
}): Promise<{ ok: boolean; org?: ApolloOrg; error?: string }> {
  const res = await apolloFetch<{ organization?: ApolloOrg }>(
    opts.apiKey,
    "/organizations/enrich",
    {
      method: "POST",
      body: JSON.stringify({ domain: opts.domain }),
    },
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, org: res.data.organization };
}

/**
 * Get top decision-makers of an organization. Free-tier safe.
 * Returns up to ~10 people with title + LinkedIn URL (emails locked).
 */
export async function organizationTopPeople(opts: {
  apiKey: string;
  organizationId: string;
}): Promise<{ ok: boolean; people?: ApolloPerson[]; error?: string }> {
  const params = new URLSearchParams({
    organization_id: opts.organizationId,
  });
  const res = await apolloFetch<{ people?: ApolloPerson[] }>(
    opts.apiKey,
    `/mixed_people/organization_top_people?${params.toString()}`,
    {
      method: "GET",
    },
  );
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, people: res.data.people ?? [] };
}
