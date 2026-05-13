/**
 * Premium positioning language auto-cleaner.
 *
 * Applies safe lexical swaps to any draft text (HR + EN) per the
 * premium positioning blueprint at docs/premium-positioning-language.md.
 *
 * Only includes UNAMBIGUOUS swaps — skips swaps that require human
 * judgment ("does this work for you" can mean many things; "samo radim"
 * is almost always the diminishing usage).
 *
 * Returns both the cleaned text AND the count of swaps applied so the
 * UI can show a "✨ Premium-cleaned (3 swaps)" badge.
 */

interface Swap {
  /** Regex to find — case-insensitive, word-boundary-safe where possible */
  find: RegExp;
  /**
   * Replacement. Function form receives the full match + any capture
   * groups, mirroring String.prototype.replace semantics.
   */
  replace:
    | string
    | ((match: string, ...captureGroups: string[]) => string);
  /** Brief explanation for the badge tooltip */
  reason: string;
}

/** Capitalize first letter of replacement to match original case. */
function matchCase(original: string, replacement: string): string {
  if (!original) return replacement;
  const first = original[0];
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

const SWAPS: Swap[] = [
  // ── #2 INVESTMENT framing ──
  // "cijena" / "cijene" / "Cijena" / "Cijene" → "investicija" / "investicije"
  // SKIP swap if surrounded by quotes ("cijena" as topic word) — heuristic: skip if preceded by " or '
  {
    find: /(?<![\p{L}"'])(c)ijena\b/gu,
    replace: (m) => m.replace(/(c)ijena/iu, (mm, c1) => matchCase(c1, "investicija").slice(0, -10) + "investicija"),
    reason: "cijena → investicija (premium framing)",
  },
  {
    find: /(?<![\p{L}"'])(c)ijene\b/gu,
    replace: (m) => m.replace(/(c)ijene/iu, (mm, c1) => matchCase(c1, "investicije").slice(0, -10) + "investicije"),
    reason: "cijene → investicije",
  },
  {
    find: /(?<![\p{L}"'])(c)ijenu\b/gu,
    replace: (m) => m.replace(/(c)ijenu/iu, (mm, c1) => matchCase(c1, "investiciju").slice(0, -10) + "investiciju"),
    reason: "cijenu → investiciju",
  },
  // EN price → investment (only when used as price-listing context)
  {
    find: /\bprice(s?)\s+(start|begin|range|are)\b/gi,
    replace: (m) => m.replace(/^p(rice)/i, (mm) => matchCase(mm, "i") + "nvestment").replace(/^P(rice)/, "Investment"),
    reason: "price starts → investment begins",
  },

  // ── #3 SPECIALIST language ──
  // "samo radim" / "radim samo" → "specijaliziran sam za"
  {
    find: /\b(s)amo radim\b/gi,
    replace: (m) => matchCase(m, "specijaliziran sam za"),
    reason: "samo radim → specijaliziran sam za",
  },
  {
    find: /\b(r)adim samo\b/gi,
    replace: (m) => matchCase(m, "specijaliziran sam za"),
    reason: "radim samo → specijaliziran sam za",
  },
  {
    find: /\bI\s+just\s+do\b/gi,
    replace: "I specialize in",
    reason: "I just do → I specialize in",
  },

  // ── #6 PACKAGES-first ──
  // "koji je vaš budget" → "dajte da vas provedem kroz pakete"
  {
    find: /\b(k)oji je va[šs]\s+(budget|bud[zž]et)\??/gi,
    replace: (m) => matchCase(m, "dajte da vas provedem kroz svoje pakete"),
    reason: "koji je vaš budget → dajte da vas provedem kroz pakete",
  },
  {
    find: /\bwhat'?s your budget\??/gi,
    replace: "let me walk you through my packages",
    reason: "what's your budget → let me walk through packages",
  },

  // ── #7 GRATITUDE not APOLOGY ──
  // "oprostite na kasnoj reakciji/odgovoru" → "hvala na strpljenju"
  {
    find: /\b(o)prostite na kasn(om|oj)\s+(odgovoru|reakciji|odgovaranju)\b/gi,
    replace: (m) => matchCase(m, "hvala vam na strpljenju"),
    reason: "oprostite na kasnoj reakciji → hvala na strpljenju",
  },
  {
    find: /\bsorry for (the )?late\s+(reply|response)\b/gi,
    replace: "thank you for your patience",
    reason: "sorry for late reply → thank you for your patience",
  },

  // ── #8 AVAILABILITY signaling ──
  // "pokušat ću vas ubaciti" → "provjerit ću svoju dostupnost"
  {
    find: /\b(p)oku[šs]at [cć]u\s+(vas\s+)?ubaciti\b/gi,
    replace: (m) => matchCase(m, "provjerit ću svoju dostupnost"),
    reason: "pokušat ću vas ubaciti → provjerit ću dostupnost",
  },
  {
    find: /\bI'?ll try to fit you in\b/gi,
    replace: "let me check my availability",
    reason: "I'll try to fit you in → let me check my availability",
  },

  // ── #1 LEAD don't ASK (limited safe swap) ──
  // "odgovara li vam ovo" / "is this OK with you" — safe in CTA context only
  {
    find: /\b(o)dgovara li vam ovo\??/gi,
    replace: (m) => matchCase(m, "evo što preporučam"),
    reason: "odgovara li vam ovo → evo što preporučam",
  },
  {
    // Strip ANY leonardo@lamon.* email reference from body. The Gmail
    // signature attaches the canonical leonardo@lamon.io with link
    // styling — duplication in body is noise + AI sometimes hallucinates
    // wrong TLD (e.g. lamon.hr). Signature is authoritative.
    find: /\s*leonardo@lamon\.[a-z]{2,}/gi,
    replace: "",
    reason: "stripped: leonardo@lamon.* from body (signature has it)",
  },
  {
    // Strip "lamon.io/plima" inline link too — signature has it.
    find: /\s*lamon\.io\/plima/gi,
    replace: "",
    reason: "stripped: lamon.io/plima from body (signature has it)",
  },
  {
    // "Slobodni u srijedu..." → "Predlažem 15-minutni Zoom razgovor u srijedu..."
    // KEY: "Predlažem" requires an explicit object in Croatian (predlažem
    // ŠTO? — sastanak? razgovor? poziv?). Bare "Predlažem srijedu" is
    // broken Croatian — recipient reads it and asks "predlažeš ŠTO?".
    // Inject the canonical object "15-minutni Zoom razgovor u [dan]".
    find: /\bSlobodni\s+(u\s+)?(ponedjeljak|utorak|srijed[au]|četvrtak|petak|subot[au]|nedjelj[au]|sutra)/gi,
    replace: (m) => {
      const dayMatch = m.match(/(ponedjeljak|utorak|srijed[au]|četvrtak|petak|subot[au]|nedjelj[au]|sutra)/i);
      const day = dayMatch?.[0].toLowerCase() ?? "";
      // Locative form: "u srijedu / u utorak / u petak…"
      const dayMap: Record<string, string> = {
        ponedjeljak: "u ponedjeljak",
        utorak: "u utorak",
        srijeda: "u srijedu",
        srijedu: "u srijedu",
        četvrtak: "u četvrtak",
        petak: "u petak",
        subota: "u subotu",
        subotu: "u subotu",
        nedjelja: "u nedjelju",
        nedjelju: "u nedjelju",
        sutra: "sutra",
      };
      const dayLoc = dayMap[day] ?? day;
      return matchCase(m, `Predlažem 15-minutni Zoom razgovor ${dayLoc}`);
    },
    reason:
      "'Slobodni u [dan]' → 'Predlažem 15-minutni Zoom razgovor u [dan]' (Brend · 09 #1 Lead don't Ask + explicit object)",
  },
  {
    // Catch bare "Predlažem [day] u [time]" without an explicit object —
    // inject "15-minutni Zoom razgovor" between Predlažem and the day.
    // "Predlažem srijedu u 10:30" → "Predlažem 15-minutni Zoom razgovor u srijedu u 10:30"
    // Pattern: Predlažem (NOT followed by typical objects: razgovor, poziv,
    // sastanak, Zoom, kratak, kratki, kratki, 15) then a day token.
    find: /\bPredlažem\s+(?!(\d+[-\s]?(min|minut|minutni)|razgov|poziv|sastan|Zoom|zoom|kratak|kratki|kratki|15|kratko|brzi|kratki))(u\s+)?(ponedjeljak|utorak|srijed[au]|četvrtak|petak|subot[au]|nedjelj[au]|sutra)\b/gi,
    replace: (m) => {
      const dayMatch = m.match(
        /(ponedjeljak|utorak|srijed[au]|četvrtak|petak|subot[au]|nedjelj[au]|sutra)/i,
      );
      const day = dayMatch?.[0].toLowerCase() ?? "";
      const dayMap: Record<string, string> = {
        ponedjeljak: "u ponedjeljak",
        utorak: "u utorak",
        srijeda: "u srijedu",
        srijedu: "u srijedu",
        četvrtak: "u četvrtak",
        petak: "u petak",
        subota: "u subotu",
        subotu: "u subotu",
        nedjelja: "u nedjelju",
        nedjelju: "u nedjelju",
        sutra: "sutra",
      };
      const dayLoc = dayMap[day] ?? day;
      return matchCase(m, `Predlažem 15-minutni Zoom razgovor ${dayLoc}`);
    },
    reason:
      "bare 'Predlažem [dan]' → 'Predlažem 15-minutni Zoom razgovor u [dan]' (explicit object required)",
  },

  // ── #13 ENGLESKE RIJEČI → HRVATSKI ──
  // Hardcoded English-to-Croatian translations for words that leak from
  // Holmes context (best_angle, opening_hook) into draft + subject.
  // Whole-word matching, case-insensitive, preserves leading capitalization.
  // "content engine" → "produkcija sadržaja" — grammatically flexible
  // (produkcija is feminine, declines naturally in Croatian sentences).
  {
    find: /\bcontent engine-?(a|om|u|i|ima)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/engine-?(a|om|u|i|ima)?$/i)?.[1] ?? "";
      const base = suffix === "a"
        ? "produkcije sadržaja"
        : suffix === "om"
          ? "produkcijom sadržaja"
          : suffix === "u"
            ? "produkciji sadržaja"
            : "produkcija sadržaja";
      return matchCase(m, base);
    },
    reason: "content engine → produkcija sadržaja",
  },
  {
    find: /\bcontent (strategy|strategija|strategije)\b/gi,
    replace: (m) =>
      matchCase(m, m.toLowerCase().includes("strategija") ? "strategija sadržaja" : "strategija sadržaja"),
    reason: "content strategy → strategija sadržaja",
  },
  {
    find: /\bcontenta\b/gi,
    replace: (m) => matchCase(m, "sadržaja"),
    reason: "contenta → sadržaja",
  },
  {
    find: /\bcontentom\b/gi,
    replace: (m) => matchCase(m, "sadržajem"),
    reason: "contentom → sadržajem",
  },
  // "content" standalone — careful with brand names ("Content Marketing Institute" etc.)
  // Only swap when followed by Croatian context words OR at word boundary alone.
  {
    find: /\bcontent\b(?!\s+(Marketing|Institute|Hub|Studio|Inc|Ltd))/gi,
    replace: (m) => matchCase(m, "sadržaj"),
    reason: "content → sadržaj",
  },
  {
    find: /\bengagement(-?a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/engagement-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base = "interakcij" + (suffix === "om" ? "om" : suffix === "u" ? "u" : suffix === "i" ? "i" : "a");
      return matchCase(m, base);
    },
    reason: "engagement → interakcija",
  },
  {
    find: /\breach-?(a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/reach-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base = "doseg" + (suffix === "om" ? "om" : suffix === "u" ? "u" : suffix === "i" ? "u" : suffix === "a" ? "a" : "");
      return matchCase(m, base);
    },
    reason: "reach → doseg",
  },
  {
    find: /\bbookinga?\b/gi,
    replace: (m) => matchCase(m, m.endsWith("a") || m.endsWith("A") ? "termina" : "termin"),
    reason: "booking → termin",
  },
  {
    find: /\bbookinge\b/gi,
    replace: (m) => matchCase(m, "termine"),
    reason: "bookinge → termine",
  },
  {
    find: /\bbookinga\b/gi,
    replace: (m) => matchCase(m, "termina"),
    reason: "bookinga → termina",
  },
  {
    find: /\bperformance(-?a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/performance-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base = "rezultat" + (suffix === "om" ? "om" : suffix === "u" ? "u" : suffix === "i" ? "i" : suffix === "a" ? "a" : "i");
      return matchCase(m, base);
    },
    reason: "performance → rezultati",
  },
  {
    find: /\bgrowth-?(a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/growth-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base = "rast" + (suffix === "om" ? "om" : suffix === "u" ? "u" : suffix === "i" ? "i" : suffix === "a" ? "a" : "");
      return matchCase(m, base);
    },
    reason: "growth → rast",
  },
  {
    find: /\bnurture (sequence|sekvenca|sekvenc[ae])\b/gi,
    replace: (m) => matchCase(m, "automatizirane poruke"),
    reason: "nurture sequence → automatizirane poruke",
  },
  {
    find: /\bfollow-up niz\w*\b/gi,
    replace: (m) => matchCase(m, "automatizirane poruke"),
    reason: "follow-up niz → automatizirane poruke",
  },

  // ── #16 NO UPFRONT PRICING — strip pricing sentences from drafts ──
  // Cold outreach must NEVER name a Plima €-amount. Strip the whole
  // sentence containing the price if AI leaked it. Preserves grammar
  // by removing from the previous period to the period after.
  {
    // "Dostupno za 2.500–3.500€/mj." or "Dostupno za 2.500-3.500€/mjesec."
    // Use [^€]* (not [^.]*) so Croatian thousand-separator dots don't
    // prematurely end the match (e.g. "2.500€" contains a dot).
    find: /\s*Dostupno za[^€]*€\/?(mj|mjesec|mjesečno)?\.?/gi,
    replace: "",
    reason: "stripped: Dostupno za X€/mj (no upfront pricing)",
  },
  {
    // "Plima paket: 2.500-3.500€/mj"
    find: /\bPlima paket:?\s*[\d.,\s\-–]+€\/?(mj|mjesec|mjesečno)?\.?/gi,
    replace: "Plima paket pokrivam u 15-min pozivu.",
    reason: "stripped: Plima paket €-amount",
  },
  {
    // "Cijena/Investicija od X€" or "od X-Y €/mj"
    find: /\b(Cijena|Investicija)\s+(od\s+)?[\d.,\s\-–]+€\/?(mj|mjesec)?\.?/gi,
    replace: "",
    reason: "stripped: cijena/investicija €-amount",
  },
  {
    // "Za vaš tier: 2.500-3.500€/mj" — AI leaked tier-specific pricing.
    // Matches Za va[šs] (tier|paket) : numbers €/mj (with possible space).
    // Negative-lookahead on K avoids stripping value references like
    // "10-15K€/mj bruto" (those are HR salary equivalents, allowed).
    find: /\b(Za va[šs]\s+)?(tier|paket)\s*:?\s*(?!\d+\s*K)[\d.,\s\-–]+€\s*\/?\s*(mj|mjesec|mjesečno)?\.?/gi,
    replace: "",
    reason: "stripped: 'Za vaš tier/paket: X€/mj' pricing",
  },
  {
    // Catch-all: any non-K-suffixed €/mj range standalone — but only
    // when NOT preceded by HR salary context like "bruto" / "u HR" /
    // "koštao" / "koštali". This catches lone "2.500-3.500€/mj." that
    // sneaks in without "Za vaš tier" prefix.
    find: /(?<!K|k|bruto|HR|u HR|koštao|koštali|koštalo)\s+[\d.,]+\s*[-–]\s*[\d.,]+\s*€\s*\/?\s*(mj|mjesec|mjesečno)\b\.?/gi,
    replace: "",
    reason: "stripped: lone €-range/mj pricing",
  },

  // ── #14 KRIVE METRIKE ── TikTok srca = lajkovi, NIKAD pregledi ──
  // Holmes often labels TikTok heart-counts as "pregleda" (views). Doctor
  // recipient instantly clocks this as wrong (TikTok shows views in
  // millions/thousands; the small number is likes). Auto-replace when
  // TikTok context is nearby OR when no YouTube context is present.
  {
    // "TikTok ... 2.755 pregleda" → "TikTok ... 2.755 interakcija"
    // Multi-line scan: match "pregleda" within 80 chars of "TikTok"
    find: /(TikTok[^.]{0,80}?)\b(\d[\d.,]*)\s+pregleda\b/gi,
    replace: (m, prefix: string, num: string) => `${prefix}${num} interakcija`,
    reason: "TikTok N pregleda → N interakcija (TikTok hearts ≠ views)",
  },
  {
    // CATCH-ALL: any "X pregleda" (where X has 3+ digits — typical
    // heart-count range) that's NOT preceded by "YouTube" within 60
    // chars. YouTube is the one platform where "pregleda" unambiguously
    // means views; everywhere else (TikTok, Instagram, generic social)
    // the same number is almost always likes/hearts that Holmes
    // mislabelled. Confidence is high enough that a false positive
    // ("X interakcija" when it really was views) is still acceptable —
    // worst case the doctor reads slightly understated engagement.
    //
    // Concrete bug this fixes: Štimac dental centar — AI wrote
    // "42.200 pregleda" when the underlying TT data was 42K aggregate
    // hearts/likes.
    find: /(?<!youtube[^.]{0,60})\b(\d[\d.,]{2,})\s+pregleda\b/gi,
    replace: (_m, num: string) => `${num} interakcija`,
    reason: "catch-all: N pregleda → N interakcija (only YouTube uses 'pregleda' for views)",
  },

  // ── #15 NO VAGUE PROMISES — strip ROI snapshot / audit / analiza filler ──
  // AI loves to end with "+ kratki ROI snapshot specifičan za X" type
  // filler. Strip the whole sentence — we don't have a deliverable.
  {
    // "Mogu unaprijed poslati ... ROI snapshot ... ." (whole sentence)
    find: /\s*Mogu (unaprijed )?poslati[^.]*ROI snapshot[^.]*\.?/gi,
    replace: "",
    reason: "stripped: 'Mogu poslati ROI snapshot' (vague promise)",
  },
  {
    // "+ ROI snapshot specifičan za X" inline
    find: /\s*(\+\s*)?(kratki\s+)?ROI snapshot[^.]*\.?/gi,
    replace: "",
    reason: "stripped: ROI snapshot mention (vague promise)",
  },
  {
    // "personaliziran audit / detaljnu analizu vaše klinike"
    find: /\s*(I\s+)?(?:šaljem|pošaljem|šaljemo|mogu poslati)\s+(personaliziran|detaljni|kratki)?\s*(audit|analizu)[^.]*\.?/gi,
    replace: "",
    reason: "stripped: audit/analizu vague promise",
  },
];

export interface CleanResult {
  /** Cleaned text */
  cleaned: string;
  /** Number of swaps applied */
  swapCount: number;
  /** Per-swap reason list (for badge tooltip) */
  reasons: string[];
}

/**
 * Apply premium positioning language swaps to a draft.
 * Pure function — safe to call in render path.
 */
export function cleanPremiumLanguage(input: string): CleanResult {
  if (!input) return { cleaned: input, swapCount: 0, reasons: [] };

  let text = input;
  let swapCount = 0;
  const reasons: string[] = [];

  for (const swap of SWAPS) {
    const before = text;
    if (typeof swap.replace === "function") {
      const fn = swap.replace;
      // Pass through all replace callback args (match + capture groups)
      // so swaps that use back-references like /(TikTok…)(\d+)/ work.
      text = text.replace(swap.find, (m: string, ...rest: unknown[]) =>
        fn(m, ...(rest.filter((r) => typeof r === "string") as string[])),
      );
    } else {
      text = text.replace(swap.find, swap.replace);
    }
    if (text !== before) {
      const matches = before.match(swap.find);
      const count = matches ? matches.length : 1;
      swapCount += count;
      reasons.push(swap.reason);
    }
  }

  return { cleaned: text, swapCount, reasons };
}
