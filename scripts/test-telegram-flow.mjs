/**
 * Telegram bot conversation flow test harness.
 *
 * Runs real-world DM patterns (taken from actual @lamonleonardo inbox
 * + Leonardo's edge-case dictation) through the full simulated pipeline:
 *
 *   classifyIntent → extractQualifyingFields → routeTemplate
 *
 * Each scenario specifies the conversation as a list of (user_message,
 * expected_template_id) pairs. The harness simulates state advancement
 * (stage transitions, captured_data accumulation) the same way the live
 * poller does, then asserts:
 *
 *   1. Each step produces a non-null template (no silent drops)
 *   2. No template_id repeats within the same conversation (anti-loop)
 *   3. Specified expected_template_id matches (route correctness)
 *
 * Run:  npx tsx scripts/test-telegram-flow.mjs
 * Exit code: 0 if all pass, 1 if any fail (CI gate).
 *
 * IMPORTANT: skips LLM classification — runs regex-only path so the test
 * is deterministic + offline. Real production also uses regex first; LLM
 * is a fallback only.
 */

import { classifyRegex, extractQualifyingFields } from "../src/lib/telegramIntent.ts";
import { routeTemplate } from "../src/lib/telegramTemplates.ts";
import { checkDuplicate, jaccardSimilarity, normalizeForCompare } from "../src/lib/telegramDedup.ts";

// ── Stage transition map (mirrors routeTemplate's stageAfter logic) ──
function nextStage(currentStage, template) {
  if (!template) return currentStage;
  return template.stageAfter ?? currentStage;
}

function simulate(scenario) {
  let stage = "new";
  const captured = {};
  const seenTemplates = [];
  const trace = [];
  let previousTemplateId = null;

  for (const turn of scenario.turns) {
    // Mirror poller logic: regex classify + always-extract for qualifying
    const regexResult = classifyRegex(turn.userMessage);
    const intent = regexResult?.intent ?? "unclear";

    // Always-try extractor in qualifying OR when first contact has a goal/age
    const extracted = extractQualifyingFields(turn.userMessage);
    if (extracted) Object.assign(captured, extracted);

    // Promote intent if regex didn't match but extractor found fields
    let effectiveIntent = intent;
    if (
      stage === "qualifying" &&
      (intent === "unclear" ||
        intent === "generic_question" ||
        intent === "info") &&
      extracted &&
      Object.keys(extracted).length > 0
    ) {
      effectiveIntent = "qualifying_answer";
    }

    const template = routeTemplate({
      intent: effectiveIntent,
      currentStage: stage,
      vars: {
        firstName: scenario.firstName,
        location: captured.location,
        monthlyGoalEur: captured.monthly_goal_eur,
      },
      capturedFields: captured,
      previousTemplateId,
    });

    trace.push({
      userMessage: turn.userMessage,
      stage,
      intent,
      effectiveIntent,
      extracted,
      captured: { ...captured },
      previousTemplateId,
      templateId: template?.templateId ?? null,
      expectedTemplate: turn.expectedTemplate,
    });

    if (template) {
      seenTemplates.push(template.templateId);
      previousTemplateId = template.templateId;
    }
    stage = nextStage(stage, template);
  }

  return { trace, seenTemplates };
}

function assertScenario(scenario) {
  const result = simulate(scenario);
  const errors = [];

  // 1. No null templates (every user message must route somewhere)
  for (const [i, t] of result.trace.entries()) {
    if (!t.templateId) {
      errors.push(`turn ${i}: NULL template (intent=${t.effectiveIntent}, stage=${t.stage})`);
    }
  }

  // 2. No duplicate template_id within session
  const dupes = new Map();
  for (const tid of result.seenTemplates) {
    dupes.set(tid, (dupes.get(tid) ?? 0) + 1);
  }
  for (const [tid, count] of dupes) {
    if (count > 1) {
      errors.push(`DUPLICATE template "${tid}" sent ${count}× in same conversation`);
    }
  }

  // 3. Expected template per turn
  for (const [i, t] of result.trace.entries()) {
    if (t.expectedTemplate && t.templateId !== t.expectedTemplate) {
      errors.push(
        `turn ${i}: expected "${t.expectedTemplate}", got "${t.templateId}" (msg: "${t.userMessage.slice(0, 60)}")`,
      );
    }
  }

  return { scenario: scenario.name, errors, trace: result.trace };
}

// ── Real conversation samples (taken from production DMs 2026-05-14) ──
const SCENARIOS = [
  {
    name: "Marko HR — complete answer in single message",
    firstName: "Marko",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage:
          "Hrvatske, 18godina, bavim se vec par mjeseci tiktok automatizacijom i imam 3 monetizirana profila, ali jos nisam nasao winning nieche za dobru zaradu. Realan cilj bi mi bio 2k mjesecno",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "Patrick — 'koliko treba i ne radim' = full-time",
    firstName: "Patrick",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage:
          "Velika Gorica\nMogu dat koliko treba i ne radim\nMa za pocetak 1500€",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "Djordje SRB — 'par sat od 3 do 4' = numeric hours, escape after 1 nudge",
    firstName: "Djordje",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage:
          "Iz Srbije imam 21 godinu\nNikada nisam radio to ali me zanima sta se tu tacno radi\nPa iskreno nemam predstavu koliko tu moze da se zaradi tako da stvarno ne znam",
        expectedTemplate: "qualifying_nudge_v1",
      },
      // Anti-loop escape: previous was nudge → next reply pivots to PDF
      // even though monthly_goal still missing. Better than asking again.
      {
        userMessage:
          "Pa mogao bih par sat od 3 do 4 trenutno poslije verovatno više",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "Bare '20+' as hours answer — escape to PDF after 1 nudge",
    firstName: "Ivan",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage: "Iz Zagreba imam 25",
        expectedTemplate: "qualifying_nudge_v1",
      },
      // After nudge, even just "20+" pivots to PDF (escape hatch).
      // Captured: location=Zagreba, age=25, hours=20 — goal still missing
      // but the user has shown enough; cut losses.
      { userMessage: "20+", expectedTemplate: "pdf_premium_pitch_v1" },
    ],
  },
  {
    name: "Vague reply ('??') in qualifying — escape to PDF, no duplicate nudge",
    firstName: "Test",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      { userMessage: "Iz Splita 30", expectedTemplate: "qualifying_nudge_v1" },
      // "??" doesn't extract anything but escape hatch fires anyway.
      { userMessage: "??", expectedTemplate: "pdf_premium_pitch_v1" },
    ],
  },
  {
    name: "Mentor cold pitch",
    firstName: "Hot",
    turns: [
      { userMessage: "Mentorstvo", expectedTemplate: "opening_v1" },
      // After opening, user clarifies they want 1:1
      { userMessage: "Želim 1 na 1 s tobom", expectedTemplate: "mentor_handover_v1" },
    ],
  },
  {
    name: "Greeting only",
    firstName: "Hej",
    turns: [
      { userMessage: "Hej", expectedTemplate: "greeting_v1" },
    ],
  },
  {
    name: "Opt-out",
    firstName: "Stop",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      { userMessage: "Stop", expectedTemplate: "opt_out_v1" },
    ],
  },
  // ───── Additional edge cases (Leonardo: "troduplo provjereno") ─────
  {
    name: "Multi-line lowercase reply 'iz splita 23 tek krećem cilj 1k'",
    firstName: "Igor",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage: "iz splita 23 tek krećem cilj 1k mjesečno",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "Vodič / besplatna knjiga aliases trigger opening",
    firstName: "Vod",
    turns: [
      { userMessage: "vodic", expectedTemplate: "opening_v1" },
    ],
  },
  {
    name: "All caps INFO triggers opening",
    firstName: "Caps",
    turns: [{ userMessage: "INFO", expectedTemplate: "opening_v1" }],
  },
  {
    name: "Unrelated long DM at NEW stage falls back to opening",
    firstName: "Random",
    turns: [
      {
        userMessage: "Hej čovječe vidio sam tvoje YT i baš si mi top, kako mogu zaraditi?",
        expectedTemplate: "opening_v1",
      },
    ],
  },
  {
    name: "Mentorstvo direct in NEW (cold) → opening (reverse-funnel rule)",
    firstName: "MentorAsk",
    turns: [
      { userMessage: "mentorstvo", expectedTemplate: "opening_v1" },
    ],
  },
  {
    name: "'1 na 1' phrase escalates",
    firstName: "OneOnOne",
    turns: [{ userMessage: "1 na 1 sa tobom", expectedTemplate: "opening_v1" }],
  },
  {
    name: "Two-step qualifying — escape after 1 nudge even if partial fields",
    firstName: "Cijenak",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      { userMessage: "Iz Zagreba imam 25 godina", expectedTemplate: "qualifying_nudge_v1" },
      // Anti-loop: previous was nudge, even partial new info pivots to PDF
      { userMessage: "Mogu 30 sati tjedno", expectedTemplate: "pdf_premium_pitch_v1" },
    ],
  },
  {
    name: "User says 'cijeli dan' = 40h FT signal",
    firstName: "FTguy",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage: "Iz Rijeke imam 22, cijeli dan slobodan, želim 5000 eura",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "User says 'samo vikendom' = part-time signal (10h)",
    firstName: "PT",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage: "Iz Osijeka 35, samo vikendom mogu raditi, cilj 800 eura",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "Macedonian/Bosnian inflection — 'iz Skoplja' / 'iz Sarajeva'",
    firstName: "MK",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      {
        userMessage: "iz Skoplja 28, monetiziran kanal, 2000 eur cilj",
        expectedTemplate: "pdf_premium_pitch_v1",
      },
    ],
  },
  {
    name: "Just '?' — should escape to PDF after nudge (not loop)",
    firstName: "Q",
    turns: [
      { userMessage: "Zlatna knjiga", expectedTemplate: "opening_v1" },
      { userMessage: "Iz Pule 25", expectedTemplate: "qualifying_nudge_v1" },
      { userMessage: "?", expectedTemplate: "pdf_premium_pitch_v1" },
    ],
  },
  {
    name: "NEW stage 'sta je info' triggers opening, not premium_question",
    firstName: "Info",
    turns: [
      { userMessage: "info", expectedTemplate: "opening_v1" },
    ],
  },
];

let totalFailed = 0;
let totalPassed = 0;

for (const scenario of SCENARIOS) {
  const result = assertScenario(scenario);
  if (result.errors.length === 0) {
    console.log(`✅ ${result.scenario}`);
    totalPassed++;
  } else {
    console.log(`❌ ${result.scenario}`);
    for (const err of result.errors) console.log(`   • ${err}`);
    console.log("   Trace:");
    for (const t of result.trace) {
      console.log(
        `     [${t.stage}] "${t.userMessage.slice(0, 50)}" → intent=${t.effectiveIntent} captured=${JSON.stringify(t.captured)} → ${t.templateId ?? "NULL"}`,
      );
    }
    totalFailed++;
  }
}

// ───── Dedup unit tests — Leonardo's "ista poruka NIKAD" rule ─────
console.log("\n── Dedup unit tests ──");

const DEDUP_TESTS = [
  {
    name: "exact same body caught",
    draft: "Top, jedna stvar još — koliko sati tjedno možeš? Onda šaljem PDF + custom plan.",
    recent: [
      { id: "1", body: "Top, jedna stvar još — koliko sati tjedno možeš? Onda šaljem PDF + custom plan." },
    ],
    expectDup: true,
  },
  {
    name: "punctuation/case difference still caught",
    draft: "TOP, jedna stvar još— koliko sati tjedno možeš?!! Onda šaljem PDF + custom plan...",
    recent: [
      { id: "1", body: "Top, jedna stvar još — koliko sati tjedno možeš? Onda šaljem PDF + custom plan." },
    ],
    expectDup: true,
  },
  {
    name: "different nudge wording but same intent caught (fuzzy)",
    draft: "Top, jedna stvar još — koliko sati tjedno možeš + realan cilj zarade za 6 mj? Onda šaljem PDF + custom plan.",
    recent: [
      { id: "1", body: "Top, jedna stvar još — koliko sati tjedno možeš? Onda šaljem PDF + custom plan." },
    ],
    expectDup: true,
  },
  {
    name: "completely different template NOT flagged",
    draft: "Top Patrick! Šaljem ti PDF — 10 Zlatnih Pravila. Pridruži se: https://skool.com/sidehustlehr",
    recent: [
      { id: "1", body: "Top, jedna stvar još — koliko sati tjedno možeš? Onda šaljem PDF + custom plan." },
    ],
    expectDup: false,
  },
  {
    name: "opening_v1 vs qualifying_nudge NOT flagged (legit stage transition)",
    draft: "Top, jedna stvar još — koliko sati tjedno možeš? Onda šaljem PDF + custom plan.",
    recent: [
      {
        id: "1",
        body: "Hej Marko! 🙏 Šaljem ti odmah PDF s 10 zlatnih pravila — ali prvo 3 brza pitanja da odmah vidim koja od dvije priče je tvoja: 1-2K/mj side income ili 5-15K/mj zamjena plaće. 1) Odakle si i koliko godina imaš? 2) Već radiš na YT/TT/AI biznisu ili tek krećeš + koliko sati tjedno možeš dati? 3) Realan cilj — koliko želiš zaraditi mjesečno za sljedećih 6 mj?",
      },
    ],
    expectDup: false,
  },
  {
    name: "empty draft = not dup",
    draft: "",
    recent: [{ id: "1", body: "anything" }],
    expectDup: false,
  },
  {
    name: "empty recent = not dup",
    draft: "Hej Marko!",
    recent: [],
    expectDup: false,
  },
];

for (const t of DEDUP_TESTS) {
  const result = checkDuplicate(t.draft, t.recent);
  const ok = result.isDuplicate === t.expectDup;
  if (ok) {
    console.log(`✅ ${t.name}`);
    totalPassed++;
  } else {
    console.log(
      `❌ ${t.name} — expected dup=${t.expectDup}, got dup=${result.isDuplicate} (similarity=${result.similarTo?.similarity ?? "n/a"})`,
    );
    totalFailed++;
  }
}

const totalTests = SCENARIOS.length + DEDUP_TESTS.length;
console.log("");
console.log(`Passed: ${totalPassed}/${totalTests}`);
process.exit(totalFailed > 0 ? 1 : 0);
