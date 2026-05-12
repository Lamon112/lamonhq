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
  replace: string | ((m: string) => string);
  reason: string;
}

// EXACT COPY of the swaps in src/lib/premiumLanguage.ts (English part).
// Manually mirrored — keep in sync.
const SWAPS: Swap[] = [
  {
    find: /\bcontent engine-?(a|om|u|i|ima)?\b/gi,
    replace: (m) => {
      const suffix = m.match(/engine-?(a|om|u|i|ima)?$/i)?.[1] ?? "";
      const base = "stroj za sadržaj";
      const withSuffix = suffix
        ? base.replace(/sadržaj$/, "sadržaj" + suffix)
        : base;
      return matchCase(m, withSuffix);
    },
    reason: "content engine → stroj za sadržaj",
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
    replace: (m) => matchCase(m, "follow-up niz"),
    reason: "nurture sequence → follow-up niz",
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
      text = text.replace(s.find, (m) => fn(m));
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
