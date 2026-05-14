/**
 * Telegram DM intent classifier — first line in the @lamonleonardo
 * userbot pipeline. When a new DM lands, we need to know:
 *
 *   1. What does the user WANT? (zlatna_knjiga, yt, mentorstvo, info,
 *      premium_join, premium_question, generic_question)
 *   2. Is this a qualifying-question answer (so we can extract data)?
 *   3. Is this a high-intent escalation signal (mentor traženje,
 *      explicit "želim govoriti s Leonardom", etc.)?
 *
 * Two-pass:
 *   - Regex pass (cheap, deterministic, catches 80% — exact CTA words
 *     people send literally per the channel posts: "Zlatna knjiga",
 *     "YT", "Mentorstvo", "INFO")
 *   - LLM pass (Haiku) only when regex is ambiguous or stage requires
 *     more sophisticated parsing (e.g., extracting user goal from a
 *     free-form qualifying answer)
 *
 * Cost: ~€0.0002 per LLM call. Across 50-100 DMs/day = €0.01-0.02/day.
 */

import Anthropic from "@anthropic-ai/sdk";

export type TelegramIntent =
  | "zlatna_knjiga"      // PDF lead magnet request
  | "yt_youtube"         // YouTube biznis intent
  | "mentorstvo"         // Direct mentorship request
  | "info"               // Generic info / "tell me more"
  | "premium_join"       // "Pridružio sam se / Joined" confirmation
  | "premium_question"   // Question about PREMIUM tier (price, content, what's inside)
  | "qualifying_answer"  // Free-form answer to one of the 3 qualifying questions
  | "escalate_to_leo"    // Explicit "želim govoriti s Leonardom" / direct contact
  | "ghost_unsubscribe"  // "stop", "ne zanima me", "ne piši mi" — opt out
  | "greeting"           // "Hej", "Pozdrav" with no other context
  | "generic_question"   // Anything else
  | "unclear";           // Couldn't classify even via LLM

export interface ClassifyResult {
  intent: TelegramIntent;
  confidence: "regex_exact" | "regex_fuzzy" | "llm" | "fallback";
  /** Optional extracted fields when intent = qualifying_answer */
  extracted?: {
    location?: string;
    age?: number;
    experience?: "beginner" | "trying" | "earning_some" | "earning_well";
    hours_per_week?: number | string;
    monthly_goal_eur?: number | string;
  };
  reasoning?: string;
}

const REGEX_PATTERNS: Array<{ pattern: RegExp; intent: TelegramIntent }> = [
  // Zlatna knjiga — exact + fuzzy
  { pattern: /\bzlatn[aei]\s+knjig[aeu]?\b/i, intent: "zlatna_knjiga" },
  { pattern: /\bzlatn[aei]\b/i, intent: "zlatna_knjiga" },
  { pattern: /\b10\s*zlatnih\s*pravila\b/i, intent: "zlatna_knjiga" },
  { pattern: /\bbesplatna?\s*knjig[aeu]?\b/i, intent: "zlatna_knjiga" },
  { pattern: /\bvodi[čc]\b/i, intent: "zlatna_knjiga" },

  // YT
  { pattern: /^yt$/i, intent: "yt_youtube" },
  { pattern: /\byoutube\s+biznis\b/i, intent: "yt_youtube" },
  { pattern: /\byoutube\s+kanal\b/i, intent: "yt_youtube" },

  // Mentorstvo
  { pattern: /\bmentorstv[oa]\b/i, intent: "mentorstvo" },
  { pattern: /\b1[\s\-]?(?:na|on)[\s\-]?1\b/i, intent: "mentorstvo" },
  { pattern: /\bcoach(ing)?\b/i, intent: "mentorstvo" },

  // Premium tier specifically
  { pattern: /\bpremium\b.*\b(\?|cijen|kako|sto|što|info)/i, intent: "premium_question" },
  { pattern: /^(pridruž|prijavi|joined|in)\b/i, intent: "premium_join" },

  // Info — generic
  { pattern: /^info$/i, intent: "info" },
  { pattern: /\bvi[šs]e\s+info\b/i, intent: "info" },
  { pattern: /\brec[ie]?\s+(mi\s+)?vi[šs]e\b/i, intent: "info" },

  // Escalation
  { pattern: /\bleonardo\s+(osobno|direktno|li[čc]no)\b/i, intent: "escalate_to_leo" },
  { pattern: /\bzovi\s+me\b/i, intent: "escalate_to_leo" },
  { pattern: /\bžel(im|jeo|jela)\s+govorit/i, intent: "escalate_to_leo" },

  // Opt-out
  { pattern: /\bstop\b/i, intent: "ghost_unsubscribe" },
  { pattern: /\bne\s+zanima\s+me\b/i, intent: "ghost_unsubscribe" },
  { pattern: /\bne\s+pi[šs]i\s+mi\b/i, intent: "ghost_unsubscribe" },

  // Greeting only (must come last — short & wide)
  { pattern: /^\s*(hej|bok|pozdrav|dobar\s+dan|ej|hi|hello)\s*[.!?]*\s*$/i, intent: "greeting" },
];

/**
 * Pass 1: regex match. Returns null if no match (caller should LLM).
 */
export function classifyRegex(text: string): ClassifyResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const { pattern, intent } of REGEX_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent,
        confidence: trimmed.length < 30 ? "regex_exact" : "regex_fuzzy",
      };
    }
  }
  return null;
}

/*
 * Heuristic field extractor for qualifying answers. Runs alongside the
 * LLM extractor as a safety net — if Haiku is rate-limited, returns
 * "unclear", or hallucinates fields, the regex still surfaces obvious
 * signals (city names, age numbers, hour counts, € goals).
 *
 * Non-exhaustive on purpose. We optimize for the 3 questions Leonardo
 * asks in tplOpening: location+age, experience+hours, monthly goal.
 *
 * Returns partial extracted fields or undefined if nothing was parsed.
 */
export function extractQualifyingFields(text: string): ClassifyResult["extracted"] | undefined {
  const t = text.trim();
  if (!t) return undefined;

  const out: NonNullable<ClassifyResult["extracted"]> = {};

  // Location — common Balkan country / city names. Wide enough net for
  // typical first-line answers like "iz Splita" or "Velika Gorica".
  const locationPatterns = [
    // Countries / regions (also accept "iz X")
    /\b(iz\s+)?(hrvatske?|hrvatska|bosne?|bosna|srbije?|srbija|crne?\s+gore?|makedonije?|makedonija|slovenij[ae]|kosova|albanij[ae])\b/i,
    // Major cities — Croatia + region
    /\b(zagreb|split|rijeka|osijek|zadar|pula|šibenik|sibenik|karlovac|varaždin|varazdin|velika\s+gorica|sisak|samobor|vinkovci|sl\.\s*brod|slavonski\s+brod|dubrovnik|đakovo|djakovo|metković|metkovic)\b/i,
    /\b(sarajevo|mostar|banja\s+luka|tuzla|zenica|bihać|bihac|brčko|brcko)\b/i,
    /\b(beograd|novi\s+sad|niš|nis|kragujevac|subotica|čačak|cacak|panevo|pančevo|zrenjanin)\b/i,
    /\b(skoplje|skopje|bitola|kumanovo|tetovo|prilep)\b/i,
    /\b(podgorica|nikšić|niksic|bar|herceg\s+novi|budva)\b/i,
    /\b(ljubljana|maribor|celje|kranj)\b/i,
  ];
  for (const p of locationPatterns) {
    const m = t.match(p);
    if (m) {
      out.location = (m[2] ?? m[1] ?? m[0]).trim();
      break;
    }
  }

  // Age — number + "godin" word, or "X yo / godina"
  const ageMatch = t.match(/\b(1[5-9]|[2-6]\d)\s*(godin[ae]|god\.?|yo|y\.?o\.?)\b/i);
  if (ageMatch) {
    const n = parseInt(ageMatch[1], 10);
    if (n >= 14 && n <= 75) out.age = n;
  }

  // Hours per week — multiple formats:
  // 1. "X sati", "X h tjedno", "preko X sati", "20-25 sati", "20+ sati"
  // 2. "20+" alone (bare number+plus when in qualifying context)
  // 3. Phrases meaning "full time / unlimited" → 40
  // 4. Phrases meaning "weekend only / part-time" → 10
  const fullTimePhrases =
    /\b(koliko\s+treba|ne\s+radim|cijeli\s+dan|cijelo\s+vrijeme|puno\s+radno\s+vrijeme|sve\s+slobodno\s+vrijeme|24\/?7|non[\s-]?stop|full\s*time|nezaposlen)\b/i;
  const partTimePhrases =
    /\b(samo\s+vikend|vikendom|par\s+sati|malo|kad\s+stignem)\b/i;

  if (fullTimePhrases.test(t)) {
    out.hours_per_week = 40;
  } else if (partTimePhrases.test(t)) {
    out.hours_per_week = 10;
  } else {
    const hoursMatch = t.match(
      /\b(?:preko\s+|oko\s+|do\s+)?(\d{1,2})\s*(?:[-–]\s*\d{1,2}\s*)?(?:\+\s*)?(?:sat[aei]|h\b|hr\b)/i,
    );
    if (hoursMatch) {
      const n = parseInt(hoursMatch[1], 10);
      if (n >= 1 && n <= 80) out.hours_per_week = n;
    } else {
      // Bare "20+" or "20-25" as standalone short reply
      // Only triggers when the message is short (<25 chars) — likely a
      // direct nudge response.
      if (t.length <= 25) {
        const bareMatch = t.match(/^\s*(\d{1,2})\s*(?:[-–]\s*\d{1,2})?\s*\+?\s*$/);
        if (bareMatch) {
          const n = parseInt(bareMatch[1], 10);
          if (n >= 1 && n <= 80) out.hours_per_week = n;
        }
      }
    }
  }

  // Monthly goal in EUR — handles: 1k, 1.000 €, 1500eur, 2K mjesečno,
  // "preko 1000 eura", "minimalno X €", "barem X eura"
  const goalPatterns = [
    /\b(\d{1,3})\s*(?:k|K)\s*(?:€|eur|eura|mj|mjeseč)/,
    /\b(\d{3,5})\s*(?:€|eur|eura)/,
    /\b(?:preko|oko|barem|minimalno|cilj[ae]?)\s+(\d{3,5})\s*(?:€|eur|eura)?/i,
    /\b(?:zadovoljan|sretan).{0,20}(\d{3,5})\s*(?:€|eur|eura)?/i,
  ];
  for (const p of goalPatterns) {
    const m = t.match(p);
    if (m) {
      const raw = m[1];
      let n = parseInt(raw, 10);
      // 1k → 1000
      if (/^\d{1,3}$/.test(raw) && /k/i.test(m[0])) n *= 1000;
      if (n >= 200 && n <= 100_000) {
        out.monthly_goal_eur = n;
        break;
      }
    }
  }

  // Experience signal
  const lower = t.toLowerCase();
  if (/\b(tek\s+kre[ćc]em|po[čc]etnik|nemam\s+iskustva?|nikad\s+nisam)\b/.test(lower)) {
    out.experience = "beginner";
  } else if (/\b(monetiziran|zara[đd]ujem|zara[đd]io|profit)\b/.test(lower)) {
    out.experience = "earning_some";
  } else if (/\b(poku[šs]avam|isprobavam|gledam\s+kanale|gledao)\b/.test(lower)) {
    out.experience = "trying";
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

const LLM_SYSTEM_PROMPT = `Ti si intent classifier za Telegram DM-ove koji ljudi šalju Leonardu Lamonu — tvorcu SideHustle™ Balkan Skool grupe.

Korisnik može:
- Zatražiti besplatnu PDF knjigu "10 Zlatnih Pravila" (intent: zlatna_knjiga)
- Pitati o YouTube biznisu (intent: yt_youtube)
- Tražiti 1:1 mentorstvo €500/mj (intent: mentorstvo)
- Tražiti generičke informacije o Skool grupi (intent: info)
- Potvrditi da se pridružio PREMIUM grupi (intent: premium_join)
- Pitati o PREMIUM grupi (cijena, što je unutra) (intent: premium_question)
- Odgovoriti na qualifying pitanja (lokacija, godine, iskustvo, sati, cilj) (intent: qualifying_answer)
- Tražiti direktan kontakt s Leonardom (intent: escalate_to_leo)
- Otkazati / odjaviti (intent: ghost_unsubscribe)
- Samo pozdraviti bez drugog konteksta (intent: greeting)
- Bilo što drugo (intent: generic_question)
- Nešto što ne razumiješ (intent: unclear)

Vrati ISKLJUČIVO strict JSON: {"intent": "...", "reasoning": "1 rečenica"}.

Ako je intent "qualifying_answer", uključi i "extracted": { location?, age?, experience?, hours_per_week?, monthly_goal_eur? }. Experience može biti: beginner, trying, earning_some, earning_well.

Bez markdown fence, samo JSON.`;

/**
 * Pass 2: LLM (Haiku) classification when regex didn't match OR when
 * we explicitly want extracted fields (e.g., parsing a qualifying answer).
 */
export async function classifyLLM(
  text: string,
  context?: { stage?: string; expectingQualifyingAnswer?: boolean },
): Promise<ClassifyResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { intent: "unclear", confidence: "fallback" };
  }
  if (!text.trim()) {
    return { intent: "unclear", confidence: "fallback" };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 256,
      system: [{ type: "text", text: LLM_SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: `User DM: "${text.slice(0, 800)}"
${context?.expectingQualifyingAnswer ? "\n[CONTEXT: User je u QUALIFYING fazi — pokušaj prepoznati answer + extract fields]" : ""}

Vrati JSON.`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "{}";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      intent?: string;
      reasoning?: string;
      extracted?: ClassifyResult["extracted"];
    };

    const validIntents: TelegramIntent[] = [
      "zlatna_knjiga",
      "yt_youtube",
      "mentorstvo",
      "info",
      "premium_join",
      "premium_question",
      "qualifying_answer",
      "escalate_to_leo",
      "ghost_unsubscribe",
      "greeting",
      "generic_question",
      "unclear",
    ];

    const intent: TelegramIntent =
      parsed.intent && validIntents.includes(parsed.intent as TelegramIntent)
        ? (parsed.intent as TelegramIntent)
        : "unclear";

    return {
      intent,
      confidence: "llm",
      extracted: parsed.extracted,
      reasoning: parsed.reasoning,
    };
  } catch {
    return { intent: "unclear", confidence: "fallback" };
  }
}

/**
 * Combined classifier — regex first (cheap), LLM fallback when needed.
 * For known qualifying-answer flows pass `expectingQualifyingAnswer: true`
 * to force the LLM pass + field extraction.
 */
export async function classifyIntent(
  text: string,
  context?: { stage?: string; expectingQualifyingAnswer?: boolean },
): Promise<ClassifyResult> {
  // If we expect a qualifying answer, skip regex (it'll mis-route a
  // free-form answer like "iz Splita 23 tek krećem cilj 1K" as
  // unclear — go straight to LLM for field extraction).
  if (!context?.expectingQualifyingAnswer) {
    const regex = classifyRegex(text);
    if (regex) return regex;
  }
  return classifyLLM(text, context);
}
