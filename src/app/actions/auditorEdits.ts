"use server";

/**
 * Auditor edit capture — the LEARNING half of the Audit Lab.
 *
 * Every time Leonardo clicks "Spremi izmjenu" on an Outreach Lab draft
 * AND the saved version differs meaningfully from what the AI gave him,
 * this action runs. It uses Claude Haiku to summarize what he changed
 * (cheap — ~€0.0003 per call), then inserts the summary into
 * `shared_insights` with `room='auditor'` and `action_type=
 * 'leonardo.edit_pattern'`.
 *
 * `renderInsightsForPrompt` (already injected into Holmes' system
 * prompt) detects these auditor entries and surfaces them in a
 * dedicated "📚 LEONARDOVI EDIT PATTERNS" section, framed as
 * prescriptive — "apply this same correction next time, automatically".
 *
 * Net effect: every manual fix Leonardo makes today becomes a built-in
 * rule the AI follows tomorrow. After 30-50 edits the Holmes drafts
 * arrive pre-corrected and Leonardo's review-and-edit loop collapses
 * toward zero.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

interface CaptureInput {
  leadId: string;
  channel: "email" | "phone" | "whatsapp" | "instagram" | "linkedin";
  aiVersion: string;
  finalVersion: string;
}

const SUMMARIZE_PROMPT = `Ti si pattern-extractor za AI draft edits.

Dobiješ DVA verzije iste outreach poruke (AI-generated original + Leonardova final ispravka). Tvoj posao: napisati JEDNU rečenicu koja opisuje pattern koji je on primijenio, U IMPERATIVU.

# Format

Vrati strict JSON: {"summary": "...", "tags": ["...", "..."]}

- summary: 1 rečenica imperativ na hrvatskom (max 120 chars). Format: "Zamijeni X sa Y" ILI "Ukloni Z" ILI "Dodaj W u [poziciju]" ILI "Pretvori [pasivnu frazu] u [aktivnu]". Mora biti dovoljno generičko da se primjeni na sve buduće draftove, ne samo ovog leada.
- tags: 1-3 short kebab-case tagova koji opisuju kategoriju edita (npr. "tone-peer-level", "hook-specificity", "cta-assumptive", "intro-mandatory", "remove-cliche")

# Primjeri

Original: "Volio bih pitati koliko poziva propuštate"
Final: "Smijem li pitati koliko poziva propuštate"
Output: {"summary": "Zamijeni 'Volio bih pitati' sa 'Smijem li pitati' (peer-level autoritet)", "tags": ["tone-peer-level", "submissive-fix"]}

Original: "GoMED ima dobru osnovu — web, IG, direktni WhatsApp"
Final: "Dobar dan 🙂\\n\\nLeonardo Lamon ovdje — bavim se razvojem privatnih ordinacija.\\n\\nGoMED ima dobru osnovu — web, IG, direktni WhatsApp"
Output: {"summary": "WA poruka MORA početi pozdravom + 'Leonardo Lamon ovdje' predstavljanjem, prije observation-a", "tags": ["intro-mandatory", "wa-format"]}

Original: "javite kad stignete da pošaljem više informacija"
Final: "Predlažem 15-min Zoom u srijedu u 10:30 ili četvrtak nakon 18h"
Output: {"summary": "Zamijeni pasivni CTA ('javite kad stignete') sa konkretnim Zoom prijedlogom (dva termina + trajanje)", "tags": ["cta-assumptive", "specificity"]}

Original: "S poštovanjem,\\nLeonardo Lamon"
Final: "Pozdrav,\\nLeonardo"
Output: {"summary": "Sign-off MORA biti 'Pozdrav,\\\\nLeonardo' (samo ime), NIKAD 'S poštovanjem' ili full prezime", "tags": ["signoff", "tone-peer-level"]}

# Pravilo

Ako razlika izmedju dvije verzije je TRIVIJALNA (samo whitespace, jedna pravopisna ispravka, sinonim) → vrati {"summary": "SKIP", "tags": []}.

Vrati ISKLJUČIVO JSON bez fence/markdown.`;

interface CaptureResult {
  ok: boolean;
  captured?: { summary: string; tags: string[] };
  skipped?: string;
  error?: string;
}

export async function captureDraftEdit(
  input: CaptureInput,
): Promise<CaptureResult> {
  // Auth check via SSR client.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Not authenticated" };

  // Skip if drafts are too similar (saves an LLM call). Compare lengths
  // first as a cheap heuristic.
  if (
    Math.abs(input.aiVersion.length - input.finalVersion.length) < 10 &&
    normalizeWhitespace(input.aiVersion) ===
      normalizeWhitespace(input.finalVersion)
  ) {
    return { ok: true, skipped: "trivial-diff" };
  }

  // Skip if no Anthropic key configured.
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  }

  let summary: string;
  let tags: string[];

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 256,
      system: [{ type: "text", text: SUMMARIZE_PROMPT }],
      messages: [
        {
          role: "user",
          content: `Channel: ${input.channel}

# AI ORIGINAL

${input.aiVersion.slice(0, 3000)}

# LEONARDO FINAL

${input.finalVersion.slice(0, 3000)}

Vrati JSON: {"summary": "...", "tags": [...]}`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      summary?: string;
      tags?: string[];
    };

    if (!parsed.summary || typeof parsed.summary !== "string") {
      return { ok: false, error: "Bad summary format from Haiku" };
    }
    if (parsed.summary === "SKIP") {
      return { ok: true, skipped: "haiku-said-trivial" };
    }

    summary = parsed.summary.trim();
    tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [];
  } catch (e) {
    return {
      ok: false,
      error: `Haiku diff summarize failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }

  // Persist as a shared_insight so renderInsightsForPrompt picks it up
  // automatically on the next Holmes run. Use service-role client
  // because shared_insights table likely has restrictive RLS.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, error: "Service role env not set" };
  }

  const admin = createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.from("shared_insights").insert({
    room: "auditor",
    action_type: "leonardo.edit_pattern",
    title: `Edit pattern: ${tags[0] ?? input.channel}`,
    summary,
    tags: ["learned-edit", input.channel, ...tags],
    completed_at: new Date().toISOString(),
    // Link back to the lead for traceability if anyone wants to see
    // the original edit.
    metadata: {
      lead_id: input.leadId,
      channel: input.channel,
      ai_length: input.aiVersion.length,
      final_length: input.finalVersion.length,
    },
  });

  if (error) {
    return { ok: false, error: `DB insert failed: ${error.message}` };
  }

  return {
    ok: true,
    captured: { summary, tags: ["learned-edit", input.channel, ...tags] },
  };
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}
