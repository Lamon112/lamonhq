// Standalone test for cleanPremiumLanguage — verifies English→Croatian
// swaps work on the actual phrases that leaked from Holmes into the
// Videntis draft. Inlines the function logic to bypass tsx/node ESM
// import resolution issues for the production .ts file.
//
// Run with: node --experimental-strip-types scripts/test-premium-clean.mts
// or:       npx tsx scripts/test-premium-clean.mts

function matchCase(original: string, replacement: string): string {
  if (!original) return replacement;
  const first = original[0];
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

interface Swap {
  find: RegExp;
  replace:
    | string
    | ((m: string, ...captureGroups: string[]) => string);
  reason: string;
}

// EXACT COPY of the swaps in src/lib/premiumLanguage.ts (English part).
// Manually mirrored — keep in sync.
const SWAPS: Swap[] = [
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
    replace: (m) => matchCase(m, "strategija sadržaja"),
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
  {
    find: /\bcontent\b(?!\s+(Marketing|Institute|Hub|Studio|Inc|Ltd))/gi,
    replace: (m) => matchCase(m, "sadržaj"),
    reason: "content → sadržaj",
  },
  {
    find: /\bengagement(-?a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/engagement-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base =
        "interakcij" +
        (suffix === "om"
          ? "om"
          : suffix === "u"
            ? "u"
            : suffix === "i"
              ? "i"
              : "a");
      return matchCase(m, base);
    },
    reason: "engagement → interakcija",
  },
  {
    find: /\breach-?(a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/reach-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base =
        "doseg" +
        (suffix === "om"
          ? "om"
          : suffix === "u"
            ? "u"
            : suffix === "i"
              ? "u"
              : suffix === "a"
                ? "a"
                : "");
      return matchCase(m, base);
    },
    reason: "reach → doseg",
  },
  {
    find: /\bbookinga?\b/gi,
    replace: (m) =>
      matchCase(m, m.endsWith("a") || m.endsWith("A") ? "termina" : "termin"),
    reason: "booking → termin",
  },
  {
    find: /\bbookinge\b/gi,
    replace: (m) => matchCase(m, "termine"),
    reason: "bookinge → termine",
  },
  {
    find: /\bperformance(-?a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/performance-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base =
        "rezultat" +
        (suffix === "om"
          ? "om"
          : suffix === "u"
            ? "u"
            : suffix === "i"
              ? "i"
              : suffix === "a"
                ? "a"
                : "i");
      return matchCase(m, base);
    },
    reason: "performance → rezultati",
  },
  {
    find: /\bgrowth-?(a|om|u|i)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/growth-?(a|om|u|i)?$/i)?.[1] ?? "";
      const base =
        "rast" +
        (suffix === "om"
          ? "om"
          : suffix === "u"
            ? "u"
            : suffix === "i"
              ? "i"
              : suffix === "a"
                ? "a"
                : "");
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
  {
    find: /\s*Dostupno za[^€]*€\/?(mj|mjesec|mjesečno)?\.?/gi,
    replace: "",
    reason: "stripped: Dostupno za X€/mj",
  },
  {
    find: /\bPlima paket:?\s*[\d.,\s\-–]+€\/?(mj|mjesec|mjesečno)?\.?/gi,
    replace: "Plima paket pokrivam u 15-min pozivu.",
    reason: "stripped: Plima paket €-amount",
  },
  {
    find: /\b(Cijena|Investicija)\s+(od\s+)?[\d.,\s\-–]+€\/?(mj|mjesec)?\.?/gi,
    replace: "",
    reason: "stripped: cijena/investicija €-amount",
  },
  {
    find: /(TikTok[^.]{0,80}?)\b(\d[\d.,]*)\s+pregleda\b/gi,
    replace: (m: string, prefix: string, num: string) => `${prefix}${num} interakcija`,
    reason: "TikTok pregleda → interakcija",
  },
  {
    find: /\s*Mogu (unaprijed )?poslati[^.]*ROI snapshot[^.]*\.?/gi,
    replace: "",
    reason: "stripped: ROI snapshot promise",
  },
  {
    find: /\s*(\+\s*)?(kratki\s+)?ROI snapshot[^.]*\.?/gi,
    replace: "",
    reason: "stripped: ROI snapshot inline",
  },
];

function cleanPremiumLanguage(input: string): {
  cleaned: string;
  swapCount: number;
  reasons: string[];
} {
  let text = input;
  let swapCount = 0;
  const reasons: string[] = [];
  for (const s of SWAPS) {
    const before = text;
    if (typeof s.replace === "function") {
      const fn = s.replace;
      text = text.replace(s.find, (m: string, ...rest: unknown[]) =>
        fn(m, ...(rest.filter((r) => typeof r === "string") as string[])),
      );
    } else {
      text = text.replace(s.find, s.replace);
    }
    if (text !== before) {
      const matches = before.match(s.find);
      swapCount += matches ? matches.length : 1;
      reasons.push(s.reason);
    }
  }
  return { cleaned: text, swapCount, reasons };
}

interface Case {
  input: string;
  mustNotContain: string[];
  shouldContain: string[];
}

const cases: Case[] = [
  {
    input:
      "Klinika je ozbiljan content engine (654 IG posts, 121 TT videa) ali TikTok average od 23 pregleda po videu otkriva kritični distribucijski i konverzijski problem",
    mustNotContain: ["content engine", "content "],
    shouldContain: ["sadržaj"],
  },
  {
    input:
      "Videntis dental centar ima jedan od ozbiljnijih content engine-a u dentalnoj niši",
    mustNotContain: ["content engine-a", "content engine"],
    shouldContain: ["sadrža"],
  },
  {
    input:
      "654 Instagram objava i 121 TikTok video — to je ozbiljan content engine.",
    mustNotContain: ["content engine"],
    shouldContain: ["sadržaj"],
  },
  {
    input:
      "Videntis ima content — nedostaje sustav koji ga pretvara u termine",
    mustNotContain: ["content "],
    shouldContain: ["sadržaj"],
  },
  {
    input: "Naš engagement je rastao 30%",
    mustNotContain: ["engagement"],
    shouldContain: ["interakcij"],
  },
  {
    input: "Naš reach je 793K",
    mustNotContain: ["reach"],
    shouldContain: ["doseg"],
  },
  {
    input: "Bookinga očekujemo u rujnu i bookinge zatim",
    mustNotContain: ["bookinga", "bookinge"],
    shouldContain: ["termin"],
  },
  {
    input: "To je posao 5 ljudi koji bi u HR koštao 10-15K€/mj bruto. Dostupno za 2.500–3.500€/mj. Predlažem srijedu u 10:30.",
    mustNotContain: ["2.500", "3.500€/mj", "Dostupno za 2"],
    shouldContain: ["10-15K€/mj bruto", "Predlažem"],
  },
  {
    input: "Plima paket: 2.500-3.500€/mj — pokriva sve potrebe vaše ordinacije.",
    mustNotContain: ["2.500-3.500€", "2.500"],
    shouldContain: ["Plima paket"],
  },
  {
    input: "follow-up niz za leadove koji nisu nazvali",
    mustNotContain: ["follow-up niz", "follow-up"],
    shouldContain: ["automatizirane poruke"],
  },
  {
    input:
      "Videntis dental centar ima jedan od ozbiljnijih content engine-a u dentalnoj niši",
    mustNotContain: ["content engine", "stroj za sadržaja"],
    shouldContain: ["produkcije sadržaja"],
  },
  {
    input:
      "TikTok kanal s 121 videom i ukupno 2.755 pregleda pokazuje jasan signal",
    mustNotContain: ["pregleda"],
    shouldContain: ["interakcija"],
  },
  {
    input:
      "Predlažem srijedu u 10:30 ili četvrtak nakon 18h. Mogu unaprijed poslati i kratki ROI snapshot specifičan za Videntis.",
    mustNotContain: ["ROI snapshot", "Mogu unaprijed poslati"],
    shouldContain: ["Predlažem"],
  },
];

let failed = 0;
let passed = 0;
console.log("─".repeat(72));
console.log("cleanPremiumLanguage — English→Croatian swap verification");
console.log("─".repeat(72));
for (const c of cases) {
  const result = cleanPremiumLanguage(c.input);
  const errors: string[] = [];
  for (const bad of c.mustNotContain) {
    if (result.cleaned.toLowerCase().includes(bad.toLowerCase())) {
      errors.push(`  ❌ Still contains: "${bad}"`);
    }
  }
  for (const good of c.shouldContain) {
    if (!result.cleaned.toLowerCase().includes(good.toLowerCase())) {
      errors.push(`  ❌ Missing expected: "${good}"`);
    }
  }
  const ok = errors.length === 0;
  if (ok) passed++;
  else failed++;
  console.log("");
  console.log(ok ? "✅ PASS" : "❌ FAIL");
  console.log("  IN : " + c.input);
  console.log("  OUT: " + result.cleaned);
  console.log(`  Swaps: ${result.swapCount}`);
  for (const e of errors) console.log(e);
}
console.log("");
console.log("─".repeat(72));
console.log(`Result: ${passed} passed, ${failed} failed`);
console.log("─".repeat(72));
if (failed > 0) process.exit(1);
