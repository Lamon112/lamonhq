/**
 * Instagram handle hunter for a person, given their first/last name.
 *
 * Apollo doesn't return Instagram handles; LinkedIn doesn't expose them
 * either. We make an educated guess using common HR doctor naming
 * patterns and probe each via the public profile page in parallel.
 *
 * The first probe whose page parses cleanly into checkInstagramProfile()
 * AND returns a non-dead status is the winner.
 *
 * Cost: zero API. ~6 parallel HEAD/GET requests per lead.
 */

import { checkInstagramProfile } from "@/lib/channelHealth";

export interface InstagramHuntResult {
  url: string;
  handle: string;
  followers?: number;
  postCount?: number;
  matchedPattern: string;
}

/** Strip diacritics & lowercase — for handle generation */
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Generates the candidate handles in priority order. Earlier handles are
 * more likely to be the doctor's account (HR convention bias toward
 * "dr.lastname" or "drlastname" for medical professionals).
 */
function candidateHandles(firstName: string, lastName: string): Array<{
  handle: string;
  pattern: string;
}> {
  const f = slug(firstName);
  const l = slug(lastName);
  if (!f || !l) return [];
  const out = [
    { handle: `dr.${l}`, pattern: "dr.lastname" },
    { handle: `dr${l}`, pattern: "drlastname" },
    { handle: `dr.${f}.${l}`, pattern: "dr.firstname.lastname" },
    { handle: `dr.${f}${l}`, pattern: "dr.firstnamelastname" },
    { handle: `${f}.${l}`, pattern: "firstname.lastname" },
    { handle: `${f}_${l}`, pattern: "firstname_lastname" },
    { handle: `${f}${l}`, pattern: "firstnamelastname" },
    { handle: `${l}${f}`, pattern: "lastnamefirstname" },
    { handle: `${l}.${f}`, pattern: "lastname.firstname" },
  ];
  // De-dupe (some patterns collapse for short names)
  const seen = new Set<string>();
  return out.filter(({ handle }) => {
    if (seen.has(handle)) return false;
    seen.add(handle);
    return handle.length >= 4 && handle.length <= 30;
  });
}

export async function huntOwnerInstagram(
  firstName: string,
  lastName: string,
): Promise<InstagramHuntResult | null> {
  const candidates = candidateHandles(firstName, lastName);
  if (candidates.length === 0) return null;

  // Probe in parallel; first non-dead result wins. We still wait for all
  // so we can pick the highest-follower live handle.
  const probes = await Promise.all(
    candidates.map(async ({ handle, pattern }) => {
      const url = `https://www.instagram.com/${handle}/`;
      try {
        const health = await checkInstagramProfile(url);
        return { handle, pattern, url, health };
      } catch {
        return null;
      }
    }),
  );

  const valid = probes.filter(
    (p): p is NonNullable<typeof p> =>
      !!p &&
      p.health.status !== "dead" &&
      p.health.status !== "blocked" &&
      p.health.status !== "unknown",
  );
  if (valid.length === 0) return null;

  // Pick the candidate with highest followers (or first one if none have)
  valid.sort(
    (a, b) => (b.health.followers ?? 0) - (a.health.followers ?? 0),
  );
  const winner = valid[0];
  return {
    url: winner.url,
    handle: winner.handle,
    followers: winner.health.followers,
    postCount: winner.health.postCount,
    matchedPattern: winner.pattern,
  };
}
