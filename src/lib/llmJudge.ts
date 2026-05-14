/**
 * LLM Judge — secondary auditor for issues regex can't catch.
 *
 * The regex layer (`src/lib/draftAuditor.ts`) catches every PATTERN-
 * matchable failure mode Leonardo's flagged: pricing strings, kuna
 * mentions, hallucinated numbers vs evidence, submissive phrasing,
 * etc. But subtle issues — tone mismatch with pitch tier, broken
 * logical flow, internal contradiction, weak persuasion structure —
 * require actually READING the draft. That's this file's job.
 *
 * Uses Claude Haiku (cheapest tier) — ~$0.0004 per draft. Across the
 * full 70-lead pipeline that's <$0.03 per nightly cron run, well
 * within Council monthly budget.
 *
 * Output: structured JSON list of issues that get merged into the
 * existing AuditResult, displayed alongside regex-found issues with
 * the same severity/snippet/suggestion shape.
 *
 * Skips drafts that already have CRITICAL regex issues (no point
 * burning Haiku tokens on a draft we already know we're refreshing).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AuditChannel, AuditIssue, AuditSeverity } from "./draftAuditor";

interface JudgeInput {
  draft: string;
  channel: AuditChannel;
  /** ICP tier (Veteran/Intermediate/Starter/Dead) for pitch-tone calibration */
  pitchTier?: string | null;
  /** Lead name for context */
  leadName: string;
  /** Recommended Plima package — anchor for ROI/value alignment check */
  recommendedPackage?: string | null;
}

const JUDGE_SYSTEM_PROMPT = `Ti si stroga QA inspekcija za hrvatske B2B premium-dental cold outreach poruke.

Tvoj posao: čitati svaki draft i tražiti SUPTILNE probleme koje regex ne može uloviti. Vrati ISKLJUČIVO strict JSON array (može biti prazan).

# Što tražiti

1. **TONE MISMATCH** — premium klinika (Veteran tier) treba peer-level autoritet, ne corporate softness; solo praksa (Starter) treba humanost, ne prerano "5-stupova" tehnička priča
2. **LOGIČKA NEDOSLJEDNOST** — draft sebi kontradiktira (npr. "klinika ima jak digitalni nastup" + odmah "vidim da niste prisutni online")
3. **SLOMLJEN PROTOK** — paragrafi ne vode jedan u drugi; hook ne nadovezuje se na pain; pain ne vodi u solution; solution ne vodi u CTA
4. **SLABI HOOK** — generic compliment ("imate odličnu kliniku") umjesto konkretnog observacijskog signala
5. **GROZAN CTA** — "javite se kad stignete" / "ako vas zanima" je pasivno; treba "Predlažem [konkretno] u utorak ili četvrtak"
6. **REGISTAR MIX** — formalno "Vi/Vaš" + casual "ej, znači" u istoj poruci
7. **KULTURNI FAIL** — koristi anglo-saksonske convention koji ne sjede u HR ("hope you're well", "feel free", direkt ne-prilagođen na HR humor/dinamiku)
8. **PRAZNA OBEĆANJA** — "garantiramo X% rast" / "sigurno ćete vidjeti rezultate" — neistinita / neproverljiva
9. **PIVOT PROMAŠEN** — pitch nije prilagođen ICP tier-u (premium klinika dobiva content-strategy pitch koji je za starter; starter dobiva 5-10K€ premium pitch)

# IGNORIRAJ (regex već lovi)

- Pricing leaks (1.497€, 2.500€, "dostupno za")
- Kuna mentions
- Halucinacije brojki (X YT pratitelja koji nije u evidence-u)
- Submissive frase ("Volio bih", "ako biste bili tako ljubazni")
- Sign-off "S poštovanjem, Leonardo Lamon"
- Croatian-English mash ("sadržaj creator")
- TikTok pregleda mislabel
- 000€ regex debris

NE duplicate-aj te. Fokus na nesto sto regex ne moze identificirati.

# Output format

Vrati ISKLJUČIVO JSON array, npr:
[
  {
    "severity": "high" | "medium" | "low",
    "category": "tone" | "logic" | "flow" | "hook" | "cta" | "register" | "cultural" | "promise" | "pivot",
    "description": "1 rečenica što je problem",
    "snippet": "max 120 chars iz drafta gdje je problem",
    "suggestion": "1 rečenica konkretni fix (na hrvatskom)"
  }
]

Ako nema problema → vrati prazan array []. NE dodavaj objašnjenja, NE markdown fence, samo JSON.`;

export async function judgeDraftWithLLM(
  input: JudgeInput,
): Promise<AuditIssue[]> {
  // Skip the API call if there's no API key configured (local dev or
  // test runs). The caller will continue with regex-only audit.
  if (!process.env.ANTHROPIC_API_KEY) return [];
  // Don't waste tokens on tiny / empty drafts.
  if (!input.draft || input.draft.length < 80) return [];

  const tierLabel = input.pitchTier
    ? input.pitchTier.charAt(0).toUpperCase() + input.pitchTier.slice(1)
    : "n/a";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      // Haiku 3.5 is the cheapest tier with reliable JSON output. Sonnet
      // is overkill for a 200-token critique pass.
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: [{ type: "text", text: JUDGE_SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: `Lead: ${input.leadName}
Channel: ${input.channel}
Pitch tier: ${tierLabel}
Recommended package: ${input.recommendedPackage ?? "n/a"}

# Draft to judge

${input.draft.slice(0, 4000)}

Vrati JSON array sa suptilnim problemima ili [].`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "[]";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Bad JSON from Haiku — log nothing, just skip. Cheap to retry
      // tomorrow's cron.
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (i): i is {
          severity: string;
          category: string;
          description: string;
          snippet?: string;
          suggestion: string;
        } => {
          return (
            typeof i === "object" &&
            i !== null &&
            typeof (i as { severity?: unknown }).severity === "string" &&
            typeof (i as { category?: unknown }).category === "string" &&
            typeof (i as { description?: unknown }).description === "string" &&
            typeof (i as { suggestion?: unknown }).suggestion === "string"
          );
        },
      )
      .map((i): AuditIssue => {
        const sev: AuditSeverity =
          i.severity === "high" || i.severity === "medium" || i.severity === "low"
            ? (i.severity as AuditSeverity)
            : "low";
        return {
          checkId: `llm-judge-${i.category}`,
          severity: sev,
          channel: input.channel,
          description: i.description,
          snippet: i.snippet?.slice(0, 180),
          suggestion: i.suggestion,
        };
      });
  } catch {
    // Anthropic API down / rate limited — skip judge, regex audit
    // still works.
    return [];
  }
}

/**
 * Judge every channel draft in a Holmes report. Returns merged issues
 * across all channels. Use sparingly — one call per channel = N×$0.0004.
 */
export async function judgeAllChannelsForLead(args: {
  leadName: string;
  pitchTier?: string | null;
  recommendedPackage?: string | null;
  channelDrafts: Partial<Record<AuditChannel, string | null | undefined>>;
}): Promise<AuditIssue[]> {
  const allIssues: AuditIssue[] = [];
  const channels: AuditChannel[] = [
    "email",
    "phone",
    "whatsapp",
    "instagram",
    "linkedin",
  ];
  for (const ch of channels) {
    const draft = args.channelDrafts[ch];
    if (!draft || typeof draft !== "string") continue;
    const issues = await judgeDraftWithLLM({
      draft,
      channel: ch,
      leadName: args.leadName,
      pitchTier: args.pitchTier ?? null,
      recommendedPackage: args.recommendedPackage ?? null,
    });
    allIssues.push(...issues);
  }
  return allIssues;
}
