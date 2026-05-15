/**
 * E2E test — Claude scoring pipeline (offline, no DB needed).
 *
 * Calls Anthropic with the SAME system prompt as /api/quiz/submit/route.ts
 * using a realistic mock quiz response. Validates that:
 *   1. Claude returns parseable JSON
 *   2. JSON has all required fields (score, weaknesses, matched_case_study, plan_md)
 *   3. score is 0-100
 *   4. weaknesses are top 3 with valid colors
 *   5. matched_case_study is one of the 5 known IDs
 *   6. Plan markdown contains week 1-4 structure
 *
 * Run: node scripts/test-quiz-claude-scoring.mjs
 */

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local manually (no dotenv dep)
const env = fs.readFileSync(path.resolve("./.env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

// COPY of QUIZ_SCORING_SYSTEM from src/app/api/quiz/submit/route.ts
const QUIZ_SCORING_SYSTEM = `Ti si Leonardov AI Side Hustle Coach (sidequestshr / Lamon Agency / SideHustle premium grupa).

Cilj: Generirati osobni 30-dnevni plan na temelju 10 odgovora iz quizа. Output je striktno JSON koji frontend renderira.

# Verificirani case studyji koje SMIJEŠ koristiti (NIKAD izmišljaj brojke)
- **Tom**: 17.000€ / 3 mjeseca, faceless TikTok, AI alati (ElevenLabs + Midjourney + CapCut), niša "AI Factory Secrets" + povijest
- **Matija**: 3.000€ / 2 mjeseca, faceless ASMR Reels, sleeping aid niša
- **Vuk**: 5.000€ / mjesečno, longform YouTube, dokumentarni stil "Vuk Cosic"
- **Filmovi Ukratko**: 30.000 followera, recap kanal, 60s sažeci serija/filmova
- **Borna documenting**: dokumentira svoj put kao zero-to-hero, growth od 0 do 12K za 4 mjeseca

# Verificirane viralne niše
- GenRescue (US Reddit niche, $280K/godinu)
- Zhiphyr (gaming reaction, $234K)
- 217aep (faceless lifestyle, $199K)
- Inflationary (food prices, $8K/mj)
- Fresh Movies (movie recap, $147K)

# Audience hierarchy SideHustle premium grupe
1. **Dijaspora 25-45** (Njemačka, Austrija, Švicarska, US/CA) — najbolji CPM, dolar/euro budgeti, kupuju mentorstvo
2. **HR/BA/RS zaposleni 25-34** — žele bolje od plaće, imaju budget za 50€/mj Skool
3. **Studenti 18-24** — slab budget, ali dugi put, motivirani

# Skoring logika
- score 0-100 = "spremnost ulaska u side hustle game"
  - sati_tj 20+ + iskustvo + budget = 80-95
  - 5-10h + nikad probao = 30-50
  - manje 5h + 0 budget + ne_vjerujem = 15-30
- weaknesses: top 3 područja gdje user gubi vrijeme/novac. Format:
    [{label: "Konzistentnost (krećeš pa odustaneš)", percent: 85, color: "red"},
     {label: "Tehnika (AI alati)", percent: 60, color: "orange"},
     {label: "Niša fokus", percent: 40, color: "yellow"}]
  Color: red 70-100, orange 50-70, yellow 30-50, green <30
- matched_case_study: jedan od { tom_17k | matija_3k | vuk_5k | filmovi_30k | borna_doc }
  - face komfor + 10h+ + cilj 5K → tom_17k
  - ne kamere + ASMR/anonimno → matija_3k
  - YouTube longform + storytelling → vuk_5k
  - recap/sažeci + film/serija fan → filmovi_30k
  - početnik + dokumentari put → borna_doc

# Plan struktura (30 dana) — STROGO 4 tjedna, KRATKO
- TJEDAN 1: Setup (alati, niša lock-in, prvi 3 videa) — max 80 riječi
- TJEDAN 2: Konzistentnost (1 video/dan, hook iteration) — max 80 riječi
- TJEDAN 3: Skaliranje (analytics, najbolji video → 5 varijanti) — max 80 riječi
- TJEDAN 4: Monetizacija (SubStack/affiliate/digital product launch) — max 80 riječi

# CRITICAL: PLAN_MD MAX 500 RIJEČI UKUPNO
Plan_md je NA poantu, NE eseji. Korisnici skeniraju, ne čitaju. Bullet points + alati + vremenske brojke. Ako prelaziš 500 riječi — režeš.

# Stil teksta
- Ti se obraćaš useru osobno (npr. "Marko, na temelju tvojih odgovora...")
- Direktno, peer-level, NIKAD korporativno
- Specifični alati: ElevenLabs, CapCut, Midjourney, ChatGPT, Notion
- Hrvatski jezik, neformalan, bez kunskih cijena (sve €)
- weaknesses: točno 3 stavke, label max 6 riječi, diagnosis max 12 riječi
- case_study_pitch: max 50 riječi
- first_action: max 30 riječi (jedna konkretna stvar VEČERAS)
- skool_pitch: max 50 riječi

# OUTPUT — striktno JSON ovog oblika, bez markdown fence:
{
  "score": 67,
  "score_label": "Skok napred — imaš dobre temelje, samo treba fokus",
  "weaknesses": [
    {"label": "Konzistentnost", "percent": 85, "color": "red", "diagnosis": "Krećeš pa odustaneš nakon 2 tjedna"},
    {"label": "Niša fokus", "percent": 60, "color": "orange", "diagnosis": "Probavao si 3 niše, niti jednu nisi finišao"},
    {"label": "Tehnika", "percent": 35, "color": "yellow", "diagnosis": "Znaš osnove, ali AI alati ti spore"}
  ],
  "matched_case_study": "tom_17k",
  "case_study_pitch": "Marko, ti si točno gdje je Tom bio prije 6 mjeseci — zaposlen, htio izlaz, 10h tjedno. Tom je u 3 mjeseca napravio 17K€. Evo točnog plana koji je on koristio, prilagođen tebi:",
  "plan_md": "## Tjedan 1 — Setup (1-7. dan)\\n\\n**Cilj**: Otključaš tvoju nišu...\\n\\n[Markdown plan, 4 tjedna razbijena, specifične akcije, alati, vremenski blokovi]",
  "first_action": "Danas večeras: skini ElevenLabs trial + napravi prvi 30s voice-over na temu...",
  "skool_pitch": "Ako želiš da te ja vodim kroz ovaj plan tjedno + da imaš pristup community-u koji prolazi isto: SideHustle premium grupa €50/mj. Unutra je Tom, Matija, Vuk i 165 drugih koji već zarađuju online."
}`;

const VALID_CASE_STUDIES = [
  "tom_17k",
  "matija_3k",
  "vuk_5k",
  "filmovi_30k",
  "borna_doc",
];
const VALID_COLORS = ["red", "orange", "yellow", "green"];

// 3 different mock profiles — high/mid/low score, different case study match
const MOCK_PROFILES = [
  {
    name: "HIGH-SCORE — Marko, dijaspora, all-in",
    expectedScoreRange: [70, 95],
    expectedCaseStudyOptions: ["tom_17k", "vuk_5k"],
    responses: {
      trenutno_stanje: "zaposlen_dosadno",
      iskustvo: "vec_zaradio_malo",
      sati_tj: "20_plus",
      budget: "200_plus",
      blocker: ["ne_drzim_konzistentno", "tehnika"],
      cilj_zarade: "5000_plus",
      kamera: "da_komforno",
      platforma: "tiktok",
      lokacija: "dijaspora_eu",
      kontakt: { name: "Marko", email: "marko@test.hr", telegram: "@marko" },
    },
  },
  {
    name: "MID-SCORE — Iva, HR zaposlena, ASMR fit",
    expectedScoreRange: [40, 70],
    expectedCaseStudyOptions: ["matija_3k", "borna_doc"],
    responses: {
      trenutno_stanje: "zaposlen_full",
      iskustvo: "probao_par_mj",
      sati_tj: "5_10",
      budget: "do_50",
      blocker: ["kamera", "nemam_vremena", "ne_vjerujem_si"],
      cilj_zarade: "500_2000",
      kamera: "ne_nikako",
      platforma: "instagram",
      lokacija: "hr",
      kontakt: { name: "Iva", email: "iva@test.hr", telegram: "@iva" },
    },
  },
  {
    name: "LOW-SCORE — Filip, student, nula iskustva",
    expectedScoreRange: [15, 50],
    expectedCaseStudyOptions: ["borna_doc", "filmovi_30k", "matija_3k"],
    responses: {
      trenutno_stanje: "student",
      iskustvo: "nikad",
      sati_tj: "manje_5",
      budget: "0",
      blocker: ["ne_znam_pocet", "nemam_ideju", "nemam_novca", "ne_vjerujem_si"],
      cilj_zarade: "do_500",
      kamera: "samo_glas",
      platforma: "youtube",
      lokacija: "ba",
      kontakt: { name: "Filip", email: "filip@test.ba", telegram: "@filip" },
    },
  },
];

async function generatePlan(profile) {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const userMsg = `Korisnikovi odgovori (JSON):\n${JSON.stringify(profile.responses, null, 2)}\n\nGeneriraj osobni plan. Output striktno JSON.`;
  const start = Date.now();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: [{ type: "text", text: QUIZ_SCORING_SYSTEM }],
    messages: [{ role: "user", content: userMsg }],
  });
  const elapsed = Date.now() - start;
  const block = message.content.find((b) => b.type === "text");
  const raw = block?.type === "text" ? block.text.trim() : "{}";
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parseError = e.message;
  }
  const cost =
    (message.usage.input_tokens / 1_000_000) * 3 +
    (message.usage.output_tokens / 1_000_000) * 15;
  return {
    parsed,
    parseError,
    raw: raw.slice(0, 200),
    elapsed,
    cost,
    tokens: {
      in: message.usage.input_tokens,
      out: message.usage.output_tokens,
    },
  };
}

function validate(profile, result) {
  const issues = [];
  const p = result.parsed;
  if (!p) {
    issues.push(`PARSE: ${result.parseError}`);
    return issues;
  }
  if (typeof p.score !== "number" || p.score < 0 || p.score > 100) {
    issues.push(`score invalid: ${p.score}`);
  } else if (
    p.score < profile.expectedScoreRange[0] ||
    p.score > profile.expectedScoreRange[1]
  ) {
    issues.push(
      `score ${p.score} outside expected range ${profile.expectedScoreRange.join("-")}`,
    );
  }
  if (!p.score_label) issues.push("score_label missing");
  if (!Array.isArray(p.weaknesses) || p.weaknesses.length < 1) {
    issues.push(`weaknesses invalid (got ${typeof p.weaknesses})`);
  } else {
    p.weaknesses.forEach((w, i) => {
      if (!w.label) issues.push(`weakness[${i}].label missing`);
      if (typeof w.percent !== "number") issues.push(`weakness[${i}].percent not number`);
      if (!VALID_COLORS.includes(w.color)) issues.push(`weakness[${i}].color invalid: ${w.color}`);
    });
  }
  if (!p.matched_case_study || !VALID_CASE_STUDIES.includes(p.matched_case_study)) {
    issues.push(`matched_case_study invalid: ${p.matched_case_study}`);
  } else if (!profile.expectedCaseStudyOptions.includes(p.matched_case_study)) {
    issues.push(
      `matched_case_study ${p.matched_case_study} not in expected options ${profile.expectedCaseStudyOptions.join("|")}`,
    );
  }
  if (!p.case_study_pitch) issues.push("case_study_pitch missing");
  if (!p.plan_md) issues.push("plan_md missing");
  else {
    if (!p.plan_md.toLowerCase().includes("tjedan 1")) issues.push("plan_md missing 'Tjedan 1'");
    if (!p.plan_md.toLowerCase().includes("tjedan 4")) issues.push("plan_md missing 'Tjedan 4'");
  }
  if (!p.first_action) issues.push("first_action missing");
  if (!p.skool_pitch) issues.push("skool_pitch missing");
  // Check that name is personalized
  if (p.case_study_pitch && !p.case_study_pitch.includes(profile.responses.kontakt.name)) {
    issues.push(`case_study_pitch not personalized — missing name "${profile.responses.kontakt.name}"`);
  }
  return issues;
}

async function main() {
  console.log("=".repeat(70));
  console.log("Quiz Claude Scoring — E2E test");
  console.log("=".repeat(70));

  let totalCost = 0;
  let passed = 0;
  let failed = 0;

  for (const profile of MOCK_PROFILES) {
    console.log(`\n[${profile.name}]`);
    process.stdout.write("  Generating... ");
    const result = await generatePlan(profile);
    totalCost += result.cost;
    console.log(
      `${result.elapsed}ms · ${result.tokens.in}+${result.tokens.out}t · $${result.cost.toFixed(4)}`,
    );

    const issues = validate(profile, result);
    if (issues.length === 0) {
      console.log("  ✅ PASS — all checks");
      console.log(`     score: ${result.parsed.score}, case: ${result.parsed.matched_case_study}`);
      console.log(`     score_label: "${result.parsed.score_label}"`);
      console.log(`     weaknesses: ${result.parsed.weaknesses.map((w) => `${w.label} (${w.percent}%)`).join(" · ")}`);
      passed++;
    } else {
      console.log("  ❌ FAIL");
      issues.forEach((i) => console.log(`     - ${i}`));
      console.log(`  Raw output (first 200 chars): ${result.raw}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Result: ${passed}/${MOCK_PROFILES.length} passed · total cost: $${totalCost.toFixed(4)}`);
  console.log("=".repeat(70));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
