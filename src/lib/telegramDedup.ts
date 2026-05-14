/**
 * Telegram bot duplicate-message detector.
 *
 * Leonardov 2026-05-14 directive (zero tolerance):
 *   "neka svaki put ai pregledava chat i ni pod kojim uvjetom nesmije
 *    napisati istu poruku. I nakon sto napise poruku mora opet pregledati
 *    cijeli chat da bude siguran da nije napisao istu poruku, i ako u
 *    iti jednom momentu primjeti da nekako je odmah izbrisi tu poruku"
 *
 * Two safety nets:
 *
 * 1. PRE-SEND check  (this file)
 *    Compares the candidate draft against the last 10 outbound messages
 *    for this conversation. If the draft is the same — or fuzzy-similar
 *    above threshold — we abort the send and escalate to Leonardo.
 *
 * 2. POST-SEND check  (in the poller, after sendMessage returns)
 *    Re-runs the same comparison including the just-sent row. If somehow
 *    a duplicate slipped through (timing race, edge case in similarity),
 *    we call client.deleteMessages with revoke:true to unsend it from
 *    the recipient's view and mark the DB row as deleted_at = now().
 *
 * The check is fully deterministic — no LLM call — so it adds zero
 * latency and zero cost. The signal we care about is exact-or-near-exact
 * lexical overlap, which Jaccard over the normalized word set captures
 * cleanly. If we ever need semantic dupe detection (paraphrases that
 * mean the same thing but share no words), that's a Haiku call layered
 * on top — but for the production bug we're fixing (literal repeats of
 * "Top, jedna stvar još — koliko sati tjedno možeš?"), lexical is enough.
 */

export interface RecentOutbound {
  id: string;
  body: string;
  sent_at?: string;
}

export interface DupeCheck {
  isDuplicate: boolean;
  similarTo?: {
    messageId: string;
    body: string;
    similarity: number; // 0..1
    matchKind: "exact" | "fuzzy";
  };
}

/**
 * Normalize text for comparison: lowercase, collapse whitespace, strip
 * punctuation, keep Croatian/Serbian diacritics. We DON'T strip names
 * / numbers — those are real content; if two messages differ only by
 * the recipient's first name we still consider it a duplicate.
 */
export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "") // zero-width chars
    .replace(/[\s\n\r\t]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

/**
 * Jaccard similarity over the set of words (len >= 3 to drop stop-words
 * like "se", "je", "i", "u"). 1.0 = identical sets, 0.0 = disjoint.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wa = new Set(
    a.split(" ").filter((w) => w.length >= 3),
  );
  const wb = new Set(
    b.split(" ").filter((w) => w.length >= 3),
  );
  if (wa.size === 0 && wb.size === 0) return 1;
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = new Set([...wa, ...wb]).size;
  return inter / union;
}

/**
 * Main entry point — called both pre-send (with the candidate draft)
 * and post-send (with the just-sent body, scanning prior outbound only).
 *
 * @param draft         The text we're about to send (or just sent).
 * @param recent        Last N outbound messages for the same conversation,
 *                      ordered newest-first. Pass [] on first reply.
 * @param threshold     Jaccard threshold above which we consider it a
 *                      duplicate. Default 0.65 — tuned so paraphrased
 *                      identical-intent messages get caught but legit
 *                      stage transitions (opening → pitch) don't.
 */
export function checkDuplicate(
  draft: string,
  recent: RecentOutbound[],
  threshold = 0.65,
): DupeCheck {
  const draftNorm = normalizeForCompare(draft);
  if (!draftNorm) return { isDuplicate: false };

  for (const prev of recent) {
    const prevNorm = normalizeForCompare(prev.body);
    if (!prevNorm) continue;

    // Exact match after normalization — same template, possibly even
    // identical including vars (e.g. "Hej Marko! ...")
    if (draftNorm === prevNorm) {
      return {
        isDuplicate: true,
        similarTo: {
          messageId: prev.id,
          body: prev.body,
          similarity: 1,
          matchKind: "exact",
        },
      };
    }

    // Fuzzy near-duplicate (e.g. nudge with different missingFields list
    // but still functionally same ask).
    const score = jaccardSimilarity(draftNorm, prevNorm);
    if (score >= threshold) {
      return {
        isDuplicate: true,
        similarTo: {
          messageId: prev.id,
          body: prev.body,
          similarity: score,
          matchKind: "fuzzy",
        },
      };
    }
  }

  return { isDuplicate: false };
}
