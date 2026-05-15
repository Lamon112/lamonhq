/**
 * Skool članovi CSV → Supabase ingest.
 *
 * Kontekst: Skool nema public API. Leonardo, kao admin
 * skool.com/sidehustlehr, može:
 *   1. Otvoriti admin → Members panel
 *   2. Otvoriti DevTools console → kopirati `JSON.stringify(window.__NEXT_DATA__.props.pageProps)`
 *   3. Snimi kao outputs/skool-members-raw.json
 *   4. Pokreni ovu skriptu: node scripts/ingest-skool-members.mjs
 *
 * Alternativno: ako ima CSV export iz Skool admin → outputs/skool-members.csv
 * skripta detektira format i mapira oba.
 *
 * Tier mapping logika:
 *   - subscription.priceMonthly === 20 → legacy_20
 *   - subscription.priceMonthly === 50 → premium_50
 *   - subscription.status === 'comp' || free trial → comp
 *   - no subscription → free
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function detectTier(member) {
  // Try multiple shapes — Skool's Next data uses `subscriptionDetails`,
  // CSV exports use `plan` or `tier`.
  const monthlyPrice =
    member?.subscriptionDetails?.priceMonthly ??
    member?.subscription?.priceMonthly ??
    member?.priceMonthly ??
    null;
  const status =
    member?.subscriptionDetails?.status ??
    member?.subscription?.status ??
    member?.status ??
    null;

  if (status === "comp" || status === "complimentary") return "comp";
  if (monthlyPrice === 20 || monthlyPrice === "20") return "legacy_20";
  if (monthlyPrice === 50 || monthlyPrice === "50") return "premium_50";
  if (member?.plan?.toLowerCase?.() === "mentor") return "mentor";
  if (!monthlyPrice && !status) return "free";
  return null;
}

function parseFromNextData(raw) {
  // Skool's Next data shape — find members array under various paths.
  const members =
    raw?.members ??
    raw?.community?.members ??
    raw?.communityMembers ??
    raw?.users ??
    [];
  if (!Array.isArray(members)) return [];
  return members.map((m) => ({
    skool_user_id: m.id ?? m.userId ?? null,
    skool_username: m.username ?? m.handle ?? null,
    display_name: m.name ?? m.displayName ?? m.fullName ?? null,
    email: m.email ?? null,
    avatar_url: m.profilePicture ?? m.avatarUrl ?? null,
    bio: m.bio ?? null,
    tier: detectTier(m),
    country: m.country ?? m.location?.country ?? null,
    city: m.city ?? m.location?.city ?? null,
    joined_at: m.joinedAt ?? m.createdAt ?? null,
    last_active_at: m.lastActiveAt ?? m.lastSeenAt ?? null,
    posts_count: m.postsCount ?? null,
    comments_count: m.commentsCount ?? null,
    likes_count: m.likesCount ?? null,
  }));
}

function parseFromCsv(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (key) => headers.indexOf(key);
  const get = (cols, key) => {
    const i = idx(key);
    return i >= 0 ? cols[i]?.trim() ?? null : null;
  };
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const monthlyPrice = parseFloat(get(cols, "monthly_price") ?? "");
    return {
      skool_user_id: get(cols, "user_id") ?? get(cols, "id"),
      skool_username: get(cols, "username") ?? get(cols, "handle"),
      display_name: get(cols, "name") ?? get(cols, "display_name"),
      email: get(cols, "email"),
      avatar_url: null,
      bio: null,
      tier: detectTier({ priceMonthly: monthlyPrice, status: get(cols, "status") }),
      country: get(cols, "country"),
      city: get(cols, "city"),
      joined_at: get(cols, "joined_at"),
      last_active_at: get(cols, "last_active_at"),
      posts_count: parseInt(get(cols, "posts") ?? "0", 10) || null,
      comments_count: parseInt(get(cols, "comments") ?? "0", 10) || null,
      likes_count: parseInt(get(cols, "likes") ?? "0", 10) || null,
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const inputArg = args.indexOf("--input");
  const inputPath =
    inputArg >= 0
      ? args[inputArg + 1]
      : fs.existsSync("outputs/skool-members-raw.json")
        ? "outputs/skool-members-raw.json"
        : fs.existsSync("outputs/skool-members.csv")
          ? "outputs/skool-members.csv"
          : null;

  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error("Input file not found. Provide --input <path> or place at:");
    console.error("  outputs/skool-members-raw.json  (Skool __NEXT_DATA__)");
    console.error("  outputs/skool-members.csv       (CSV export)");
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  let members = [];
  if (inputPath.endsWith(".json")) {
    const parsed = JSON.parse(raw);
    members = parseFromNextData(parsed);
  } else {
    members = parseFromCsv(raw);
  }

  console.log(`Parsed ${members.length} members from ${path.basename(inputPath)}`);

  const tierCounts = members.reduce((acc, m) => {
    const t = m.tier ?? "unknown";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Tier breakdown:", tierCounts);

  // Upsert one batch
  let upserted = 0;
  for (const m of members) {
    if (!m.skool_user_id && !m.email) continue; // skip rows w/o identity
    const { error } = await sb
      .from("skool_members")
      .upsert(m, { onConflict: "skool_user_id" });
    if (error) {
      console.error(`Upsert failed for ${m.skool_username}:`, error.message);
    } else {
      upserted++;
    }
  }
  console.log(`✓ Upserted ${upserted} / ${members.length} members`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
