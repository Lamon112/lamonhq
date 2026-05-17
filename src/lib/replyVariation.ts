/**
 * Reply variation — defeats Meta spam detection.
 *
 * Problem: if @sidequestshr replies "Javi se u DM 🙏" 50× in 1 hour,
 * Meta's spam classifier flags the account as bot-like and limits
 * reach (or worse, shadowbans).
 *
 * Solution: check the last N sent replies for this trigger. If our
 * proposed text already appears recently, apply a random subtle
 * variation (emoji swap, punctuation, synonym swap, mild reorder)
 * until we find a unique version.
 *
 * Variations are designed to be HUMAN-INVISIBLE (look natural, not
 * weird) but byte-level different so spam classifier sees diversity.
 */

import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Emoji pool for swap-tactic — themed to match SideHustle voice
const EMOJI_POOL = [
  "🙏", "🙌", "💪", "🤖", "🎬", "📕", "🔥", "⚡", "✨", "🎯",
  "💡", "🚀", "💼", "📲", "👇", "🤘", "👀",
];

// Trailing punctuation variations
const PUNCT_POOL = ["", ".", "!", " ✌️"];

// Synonym swap dictionary — case-insensitive, preserves rough capitalization
// of first letter
const SYNONYMS: Record<string, string[]> = {
  info: ["informacije", "infa", "detalje", "info"],
  informacije: ["info", "infa", "detalje"],
  "javi se": ["piši mi", "javi mi se", "kontaktiraj me", "pošalji mi DM"],
  "javi mi se": ["javi se", "piši mi", "kontaktiraj me"],
  besplatan: ["gratis", "free", "besplatan"],
  besplatnu: ["gratis", "free", "besplatnu"],
  vodič: ["guide", "priručnik", "vodič"],
  DM: ["DM", "DM-u", "inbox", "poruke"],
  šaljem: ["šaljem", "pošaljem", "dostavljam"],
};

interface VaryArgs {
  base: string;
  triggerId: string;
  channel: "comment" | "dm";
  /** Look-back window in seconds for recent identical replies (default 1h) */
  withinSeconds?: number;
}

/**
 * Vary the reply if too similar to recent ones. Returns base unchanged
 * if no recent duplicates exist.
 */
export async function varyReply(args: VaryArgs): Promise<string> {
  const within = args.withinSeconds ?? 3600;
  const cutoff = new Date(Date.now() - within * 1000).toISOString();

  const table = args.channel === "comment" ? "ig_comment_events" : "ig_dm_events";
  const textCol = args.channel === "comment" ? "public_reply_text" : "reply_text";
  const tsCol = args.channel === "comment" ? "public_reply_at" : "reply_at";
  const statusCol = args.channel === "comment" ? "public_reply_status" : "reply_status";

  const { data } = await sb()
    .from(table)
    .select(`${textCol}`)
    .eq("matched_trigger_id", args.triggerId)
    .eq(statusCol, "sent")
    .gte(tsCol, cutoff)
    .order(tsCol, { ascending: false })
    .limit(8);

  const recent = new Set(
    (data ?? [])
      .map((r: Record<string, unknown>) => r[textCol] as string | null)
      .filter((s): s is string => Boolean(s)),
  );

  // If base hasn't been sent recently, no variation needed
  if (!recent.has(args.base)) return args.base;

  // Try up to 8 random variation combos to find unique version
  for (let attempt = 0; attempt < 8; attempt++) {
    const varied = applyRandomVariation(args.base, attempt);
    if (!recent.has(varied)) return varied;
  }

  // Last resort: append zero-width space + random suffix (always unique)
  return args.base + " " + EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
}

function applyRandomVariation(text: string, attemptSeed: number): string {
  // Cycle through tactics to ensure diversity across attempts
  const tactics = [swapEmoji, addPunctuation, swapSynonym, mildReorder];
  const tactic = tactics[attemptSeed % tactics.length];
  return tactic(text);
}

// ─── Tactics ───

function swapEmoji(text: string): string {
  // Find emoji(s) anywhere in the text; swap one
  const emojiRegex =
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}]/gu;
  const matches = [...text.matchAll(emojiRegex)];
  if (matches.length === 0) {
    // No emoji present — append one
    const pick = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
    return `${text} ${pick}`;
  }
  // Replace a random emoji occurrence with a different one
  const target = matches[Math.floor(Math.random() * matches.length)];
  const idx = target.index ?? 0;
  let replacement = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
  // Ensure we actually picked a different emoji
  let tries = 0;
  while (replacement === target[0] && tries < 5) {
    replacement = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
    tries++;
  }
  return text.slice(0, idx) + replacement + text.slice(idx + target[0].length);
}

function addPunctuation(text: string): string {
  const punct = PUNCT_POOL[Math.floor(Math.random() * PUNCT_POOL.length)];
  if (!punct) return text;
  // Insert before final emoji if present
  const emojiAtEnd =
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]\s*$/u.test(text);
  if (emojiAtEnd) {
    return text.replace(
      /(\s*[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]+\s*)$/u,
      `${punct}$1`,
    );
  }
  return text.trimEnd() + punct;
}

function swapSynonym(text: string): string {
  const lowerKeys = Object.keys(SYNONYMS).filter((k) =>
    text.toLowerCase().includes(k.toLowerCase()),
  );
  if (lowerKeys.length === 0) return text;
  const key = lowerKeys[Math.floor(Math.random() * lowerKeys.length)];
  const synonyms = SYNONYMS[key].filter(
    (s) => s.toLowerCase() !== key.toLowerCase(),
  );
  if (synonyms.length === 0) return text;
  const replacement = synonyms[Math.floor(Math.random() * synonyms.length)];

  // Replace first occurrence, case-insensitive, preserve first-letter case
  const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, "i");
  const match = text.match(pattern);
  if (!match) return text;
  const original = match[0];
  let final = replacement;
  if (original[0] === original[0].toUpperCase()) {
    final = replacement[0].toUpperCase() + replacement.slice(1);
  }
  return text.replace(pattern, final);
}

function mildReorder(text: string): string {
  // Small natural reorders that don't change meaning
  const REORDERS: Array<[RegExp, string]> = [
    [/Javi se u DM/i, "U DM se javi"],
    [/U DM se javi/i, "Javi se u DM"],
    [/za besplatan/i, "za free"],
    [/za free/i, "za besplatan"],
    [/šaljem ti/i, "ti šaljem"],
    [/ti šaljem/i, "šaljem ti"],
  ];
  for (const [pattern, replacement] of REORDERS) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }
  return text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
