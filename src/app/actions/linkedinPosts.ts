"use server";

/**
 * LinkedIn post generator + storage.
 *
 * Leonardov 2026-05-14 directive: "Linkedin objava priprema".
 *
 * Pipeline:
 *   1. Leonardo picks topic + angle from Headquarters UI
 *   2. Claude Sonnet drafts 3 variants (hook-led, story-led, contrarian)
 *   3. Each variant scored on viral_prediction (1-10)
 *   4. Saved to linkedin_posts table for review
 *   5. Leonardo approves + edits → manual publish to LinkedIn
 *
 * Voice: Leonardov peer-level Croatian/English mix, no submissive lang,
 * assumptive close, segmentation framing. Same brand voice as Plima
 * outreach but optimized for LinkedIn algorithm (longer hook, story arc).
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface LinkedInPost {
  id: string;
  topic: string;
  angle: string;
  audience: string;
  variant_kind: "hook" | "story" | "contrarian";
  body: string;
  hashtags: string[];
  viral_prediction: number;
  conversion_prediction: number;
  rationale: string;
  status: "pending_review" | "approved" | "published" | "rejected";
  published_url: string | null;
  generation_cost_usd: number;
  created_at: string;
  updated_at: string;
}

const LINKEDIN_SYSTEM = `Ti si Leonardov Chief Content Officer za LinkedIn (lamon.io brand, B2B audience).

Brand: Lamon Agency / Plima (premium klinike AI receptionist). Leonardo solo founder iz Rijeke, Hrvatska. Pomaže premium dentalnim/estetskim klinikama filtrirati lead-ove kroz AI gatekeeper.

# Glas
- Direktan, peer-level, NIKAD submissive ("volio bih pitati", "ako biste bili tako ljubazni")
- Hrvatski / engleski mix prirodno
- Brojevi UVIJEK iz konkretnih primjera (Tom €17K/mj, Visodent 18.1K subs, 165 plaćenih u skool)
- Bez emoji-spamming (1-2 max), bez hashtag spam (3-5 max)
- Assumptive close — "Sljedeći utorak 14h ili četvrtak 16h?"

# LinkedIn algoritam principi
- Hook: prvi red MORA biti scroll-stopping (paradox, stat, contrarian take)
- Dužina: 1200-2000 chars optimal za reach
- Linije: kratke (1-2 rečenice po line break), white space
- Struktura: Hook → Problem → Story / Lesson → Takeaway → CTA
- CTA: komentar trigger ("Komentiraj X u komentar"), nikad "Slijedi me"

# Output: STRIKTNO JSON niz s 3 varijante:
[
  { "variant_kind": "hook", "body": "...", "hashtags": [...], "viral_prediction": 7.5, "conversion_prediction": 6.0, "rationale": "Why this works" },
  { "variant_kind": "story", ... },
  { "variant_kind": "contrarian", ... }
]

Bez markdown fence. Bez extra text. Samo JSON.`;

export async function generateLinkedInPost(input: {
  topic: string;
  angle: string;
  audience: string;
  extra_context?: string;
}): Promise<{ ok: boolean; count: number; cost: number; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, count: 0, cost: 0, error: "no API key" };
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = getServiceSupabase();

  const userMsg = `Generiraj 3 LinkedIn objave (hook / story / contrarian) o:

Tema: ${input.topic}
Angle: ${input.angle}
Audience: ${input.audience}
${input.extra_context ? `\nDodatan kontekst:\n${input.extra_context}` : ""}

Vrati JSON niz.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: [{ type: "text", text: LINKEDIN_SYSTEM }],
    messages: [{ role: "user", content: userMsg }],
  });
  const block = message.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text.trim() : "[]";
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let variants: Array<{
    variant_kind: string;
    body: string;
    hashtags?: string[];
    viral_prediction?: number;
    conversion_prediction?: number;
    rationale?: string;
  }> = [];
  try {
    variants = JSON.parse(cleaned);
  } catch {
    return { ok: false, count: 0, cost: 0, error: "parse failed" };
  }

  const cost =
    (message.usage.input_tokens / 1_000_000) * 3 +
    (message.usage.output_tokens / 1_000_000) * 15;
  const perVariantCost = cost / Math.max(1, variants.length);

  let inserted = 0;
  for (const v of variants) {
    const kind = ["hook", "story", "contrarian"].includes(v.variant_kind)
      ? v.variant_kind
      : "hook";
    const { error } = await supabase.from("linkedin_posts").insert({
      topic: input.topic,
      angle: input.angle,
      audience: input.audience,
      variant_kind: kind,
      body: v.body,
      hashtags: v.hashtags ?? [],
      viral_prediction: v.viral_prediction ?? 0,
      conversion_prediction: v.conversion_prediction ?? 0,
      rationale: v.rationale ?? "",
      generation_cost_usd: perVariantCost,
      status: "pending_review",
    });
    if (!error) inserted++;
  }

  revalidatePath("/");
  return { ok: true, count: inserted, cost };
}

export async function listLinkedInPosts(): Promise<LinkedInPost[]> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("linkedin_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as LinkedInPost[];
}

export async function approveLinkedInPost(id: string, edits?: string): Promise<void> {
  const sb = getServiceSupabase();
  const update: Record<string, unknown> = { status: "approved" };
  if (edits) update.body = edits;
  await sb.from("linkedin_posts").update(update).eq("id", id);
  revalidatePath("/");
}

export async function markLinkedInPublished(
  id: string,
  publishedUrl: string,
): Promise<void> {
  const sb = getServiceSupabase();
  await sb
    .from("linkedin_posts")
    .update({ status: "published", published_url: publishedUrl })
    .eq("id", id);
  revalidatePath("/");
}
