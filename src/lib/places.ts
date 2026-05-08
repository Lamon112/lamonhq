/**
 * Google Places API (New v1) helpers — text search + place details.
 *
 * Auth: header `X-Goog-Api-Key`.
 * Field mask required (controls billing tier).
 *
 * Free tier: $200/month credit ≈ 11K Basic-tier calls. textSearch with
 * websiteUri + phone is Advanced tier (~$32 per 1K calls).
 */

const PLACES_API = "https://places.googleapis.com/v1";

export interface PlaceResult {
  id: string;
  name: string;
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
  domain?: string; // derived from websiteUri
}

const DEFAULT_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.googleMapsUri",
].join(",");

function extractDomain(uri?: string): string | undefined {
  if (!uri) return undefined;
  try {
    const url = new URL(uri);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
}

export interface SearchTextInput {
  apiKey: string;
  textQuery: string;
  /** ISO country code or region bias, e.g. "hr" */
  regionCode?: string;
  maxResultCount?: number; // 1-20
}

export async function searchText(input: SearchTextInput): Promise<{
  ok: boolean;
  places?: PlaceResult[];
  error?: string;
}> {
  try {
    const body: Record<string, unknown> = {
      textQuery: input.textQuery,
      maxResultCount: Math.min(Math.max(input.maxResultCount ?? 10, 1), 20),
    };
    if (input.regionCode) body.regionCode = input.regionCode;

    const res = await fetch(`${PLACES_API}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": input.apiKey,
        "X-Goog-FieldMask": DEFAULT_FIELD_MASK,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      places?: RawPlace[];
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return {
        ok: false,
        error:
          json.error?.message ?? `Places HTTP ${res.status} ${res.statusText}`,
      };
    }
    const places: PlaceResult[] = (json.places ?? []).map((p) => ({
      id: p.id ?? "",
      name: p.displayName?.text ?? "",
      formattedAddress: p.formattedAddress,
      websiteUri: p.websiteUri,
      internationalPhoneNumber: p.internationalPhoneNumber,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      types: p.types,
      googleMapsUri: p.googleMapsUri,
      domain: extractDomain(p.websiteUri),
    }));
    return { ok: true, places };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Places fetch error",
    };
  }
}
