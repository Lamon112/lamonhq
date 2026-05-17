/**
 * Keyword matcher for Instagram comments / DMs.
 *
 * Triggers stored in ig_keyword_triggers table. We load active triggers
 * sorted by priority (lower first), then return the FIRST match. This
 * lets us add specific keywords like "AI" with high priority (10) and
 * fall back to generic catch-alls like "info" (priority 50).
 */

import { createClient } from "@supabase/supabase-js";

export interface KeywordTrigger {
  id: string;
  keyword: string;
  match_mode: "exact" | "contains" | "word_boundary";
  case_sensitive: boolean;
  comment_reply_text: string;
  dm_reply_text: string;
  dm_link: string | null;
  cooldown_seconds: number;
  priority: number;
  active: boolean;
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

let cache: { triggers: KeywordTrigger[]; ts: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 min — trade-off freshness vs DB hits

export async function loadActiveTriggers(): Promise<KeywordTrigger[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.triggers;
  const { data, error } = await sb()
    .from("ig_keyword_triggers")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: true });
  if (error) {
    console.error("[ig-keyword-matcher] load failed:", error);
    return cache?.triggers ?? [];
  }
  const triggers = (data ?? []) as KeywordTrigger[];
  cache = { triggers, ts: now };
  return triggers;
}

/** Force-invalidate the cache (call after admin updates triggers). */
export function invalidateTriggerCache() {
  cache = null;
}

/**
 * Match text against active triggers. Returns first match (lowest priority
 * number first). Returns null if no trigger matches.
 */
export function matchKeyword(
  text: string,
  triggers: KeywordTrigger[],
): KeywordTrigger | null {
  for (const t of triggers) {
    if (testMatch(text, t)) return t;
  }
  return null;
}

function testMatch(text: string, trigger: KeywordTrigger): boolean {
  const haystack = trigger.case_sensitive ? text : text.toLowerCase();
  const needle = trigger.case_sensitive
    ? trigger.keyword
    : trigger.keyword.toLowerCase();
  switch (trigger.match_mode) {
    case "exact":
      return haystack.trim() === needle;
    case "word_boundary": {
      // Match keyword as a whole word — useful for short keywords like "AI"
      // that you don't want to match inside other words ("said", "saint")
      const pattern = new RegExp(`\\b${escapeRegex(needle)}\\b`, trigger.case_sensitive ? "" : "i");
      return pattern.test(haystack);
    }
    case "contains":
    default:
      return haystack.includes(needle);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
