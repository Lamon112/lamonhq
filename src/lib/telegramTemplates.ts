/**
 * Telegram DM reply templates for the @lamonleonardo userbot.
 *
 * All templates written per Leonardov 2026-05-14 directives:
 *   - PREMIUM (not "Skool tier" / "Advanced") — single paid tier
 *   - REVERSE-FUNNEL — mentorstvo NEVER pushed cold; only when user
 *     is already PREMIUM or explicitly asks for 5K+/mj path
 *   - 3 qualifying questions FIRST, PDF only AFTER answers
 *   - Tone: peer-level Croatian, assumptive close, no submissive lang,
 *     "$15K social proof" style, segmentation framing
 *
 * Personalization: each template accepts a `vars` object. The userbot
 * fills in known fields (first_name, captured location/age/goal, etc.)
 * before sending. Missing vars degrade gracefully ("Hej!" instead of
 * "Hej Marko!" when name unknown).
 */

import type { TelegramIntent } from "./telegramIntent";

export interface TemplateVars {
  firstName?: string;
  location?: string;
  monthlyGoalEur?: string | number;
  // Free-form notes for template-specific personalization
  context?: string;
}

export interface RenderedTemplate {
  /** Stable template ID for analytics + auditor learning loop */
  templateId: string;
  /** Plain-text body (Telegram supports basic markdown but we keep it simple) */
  body: string;
  /** Optional attachment — PDF link, image URL, or button label */
  attachments?: Array<{
    type: "url" | "image";
    url: string;
    label?: string;
  }>;
  /** Stage transition this template triggers */
  stageAfter?:
    | "qualifying"
    | "pitch"
    | "awaiting"
    | "member"
    | "handover"
    | "nurture";
}

/* =====================================================================
 * TEMPLATE 1 — Opening (any cold CTA trigger)
 *
 * Sent when a user FIRST DMs Leonardo with any of:
 * "Zlatna knjiga", "YT", "Info", or unclear-but-sounds-interested.
 *
 * Per Leonardo's directive: 3 qualifying questions FIRST, knjiga ne
 * ide odmah. Closing line uses Option B (segmentation, assumptive):
 * "...da odmah vidim koja od dvije priče je tvoja — 1-2K/mj side
 * income ili 5-15K/mj zamjena plaće"
 *
 * (Leonardo can override closing line by editing this template; the
 * learning loop will capture the diff and propagate.)
 * ===================================================================== */
export function tplOpening(vars: TemplateVars): RenderedTemplate {
  const greeting = vars.firstName ? `Hej ${vars.firstName}!` : "Hej!";
  return {
    templateId: "opening_v1",
    stageAfter: "qualifying",
    body: `${greeting} 🙏

Šaljem ti odmah PDF s 10 zlatnih pravila — ali prvo 3 brza pitanja da odmah vidim koja od dvije priče je tvoja: 1-2K/mj side income ili 5-15K/mj zamjena plaće.

1) Odakle si i koliko godina imaš?
2) Već radiš na YT/TT/AI biznisu ili tek krećeš + koliko sati tjedno možeš dati?
3) Realan cilj — koliko želiš zaraditi mjesečno za sljedećih 6 mj?`,
  };
}

/* =====================================================================
 * TEMPLATE 2 — Qualifying nudge (user replied but partial answer)
 *
 * Sent when user gave 1-2 answers but not all 3. Asks for the missing
 * gap explicitly. Avoid restating questions they already answered —
 * cite back what they said for personal touch.
 * ===================================================================== */
export function tplQualifyingNudge(args: {
  vars: TemplateVars;
  missingFields: string[]; // e.g., ["hours_per_week", "monthly_goal_eur"]
}): RenderedTemplate {
  const fieldLabels: Record<string, string> = {
    location: "odakle si",
    age: "koliko godina imaš",
    experience: "već radiš na YT/TT ili tek krećeš",
    hours_per_week: "koliko sati tjedno možeš",
    monthly_goal_eur: "realan cilj zarade za 6 mj",
  };
  const askList = args.missingFields
    .map((f) => fieldLabels[f] ?? f)
    .join(" + ");
  return {
    templateId: "qualifying_nudge_v1",
    stageAfter: "qualifying",
    body: `Top, jedna stvar još — ${askList}? Onda šaljem PDF + custom plan.`,
  };
}

/* =====================================================================
 * TEMPLATE 3 — PDF + PREMIUM pitch (qualifying complete)
 *
 * Sent when user gave all 3 answers. Bot has captured their goal +
 * experience. Now: deliver PDF + book cover + soft PREMIUM pitch.
 * Mentorship NOT mentioned here — only at higher decision stage.
 *
 * The €50/mj price is OK to mention here (B2C, public Skool listing
 * shows it anyway — not protected like Plima B2B pricing).
 * ===================================================================== */
export function tplPdfAndPremiumPitch(vars: TemplateVars): RenderedTemplate {
  const name = vars.firstName ? ` ${vars.firstName}` : "";
  const goalLine = vars.monthlyGoalEur
    ? `tvojih ${vars.monthlyGoalEur}€/mj`
    : "tvog cilja";
  return {
    templateId: "pdf_premium_pitch_v1",
    stageAfter: "awaiting",
    body: `Top${name}! Šaljem ti PDF — 10 Zlatnih Pravila (Viralni Content Framework):

Iskren odgovor — PDF je 5% posla. 95% je SAMOSTALNA primjena.

Najbrže ćeš stići do ${goalLine} unutar PREMIUM grupe gdje radimo svaki tjedan na ovome konkretno. Trenutno €50/mj — već 165 ljudi unutra, neki zarađuju i $15K+/mj.

→ Pridruži se: https://www.skool.com/sidehustlebalkan

Imaš li bilo kakvo pitanje prije nego se prijaviš?`,
    // NOTE: no image attachment — Drive image URLs return HTML wrapper,
    // not raw bytes, so Telegram rejects them with WEBPAGE_MEDIA_EMPTY.
    // PDF URL works because Telegram link-previews it from the Drive
    // file page even without raw bytes.
    attachments: [
      {
        type: "url",
        url: "https://drive.google.com/file/d/1cT2CkPLGrf2SOKguRAc1Tf1u1hZEpwm2/view?usp=drivesdk",
        label: "📄 10 Zlatnih Pravila Vodic.pdf",
      },
    ],
  };
}

/* =====================================================================
 * TEMPLATE 4 — PREMIUM tier detail (user asked "što je u PREMIUM-u")
 *
 * Reactive: user responded to pitch with question instead of joining.
 * Give concrete value breakdown. Still NO mentor pitch here (reverse-
 * funnel rule).
 * ===================================================================== */
export function tplPremiumDetail(_vars: TemplateVars): RenderedTemplate {
  return {
    templateId: "premium_detail_v1",
    stageAfter: "awaiting",
    body: `PREMIUM grupa ti uključuje:

• Sve kurseve (YT Shorts, TikTok, AI alati, niche-finder framework)
• Tjedne live pozive sa mnom — direktna pitanja, direktni odgovori
• 165 ljudi koji rade isto — collab, motivacija, brza pomoć
• Discount na monetizirane YT/TT kanale
• Bi-weekly viralni niche drop (svaka 2 tjedna novi)

Krećeš = 50€. Otkažeš kad god hoćeš, bez papirologije.

→ Pridruži se: https://www.skool.com/sidehustlebalkan`,
  };
}

/* =====================================================================
 * TEMPLATE 5 — Mentor handover (user explicitly asks for 5K+/mj path
 * OR is already PREMIUM and wants 1:1)
 *
 * THIS is the only place mentorstvo gets pitched. Sent when:
 *   - User in HANDOVER stage (escalate_to_leo intent)
 *   - User in MEMBER stage and asks for next level
 *   - User's qualifying answer mentioned 5K+/mj cilj
 *
 * Bot stops auto-replying after this — Leonardo manually takes over
 * via Telegram from his account. Push notification fires.
 * ===================================================================== */
export function tplMentorHandover(vars: TemplateVars): RenderedTemplate {
  const name = vars.firstName ? ` ${vars.firstName}` : "";
  return {
    templateId: "mentor_handover_v1",
    stageAfter: "handover",
    body: `Razumijem${name} — za tu razinu obično idem 1:1 mentorstvo, 3 mjeseca, €500/mj.

Imam 5 mjesta otvoreno. Ako te interesira, ispuni kratki onboarding form (24h fit-check):

→ https://docs.google.com/forms/d/1J6A8958uPRfPFNa_x4-AdesfJf-oPQd3R4BuFdQvAjs/viewform

Inače: PREMIUM grupa (€50/mj) je perfect prvi korak — uđeš, vidiš materiale, ako kasnije osjetiš da želiš 1:1 → upgrade.

Javim ti se osobno za par sati ako ispuniš form.`,
  };
}

/* =====================================================================
 * TEMPLATE 6 — Member welcome (user joined PREMIUM)
 *
 * Sent when user replies "joined" / "in" / "pridružio sam se" or we
 * detect their email in a Stripe webhook (Phase 2 — Stripe integration).
 *
 * Ask for first action confirmation, set expectations, hand-off to
 * Leonardo for first live call.
 * ===================================================================== */
export function tplMemberWelcome(vars: TemplateVars): RenderedTemplate {
  const name = vars.firstName ? ` ${vars.firstName}` : "";
  return {
    templateId: "member_welcome_v1",
    stageAfter: "member",
    body: `Vidimo se unutra${name}! 🎉

Pošalji 'IN' ovdje kad se prijaviš pa ti šaljem prvi action koji rade SVI novi članovi prvi tjedan. Ne komplicirano — jedan video framework koji si već vidio u 10 Pravila, samo applied za TVOJ niche.

Sljedeći live call: srijeda 20:00 (Zagreb time). Vidimo se tamo, JS pripreme za pitanja prije.`,
  };
}

/* =====================================================================
 * TEMPLATE 7 — Greeting-only response (just "Hej" with no other context)
 *
 * Most "greeting" DMs are people warming up before sending real CTA.
 * Light prompt to encourage them to share what brought them.
 * ===================================================================== */
export function tplGreetingResponse(vars: TemplateVars): RenderedTemplate {
  const name = vars.firstName ? `, ${vars.firstName}` : "";
  return {
    templateId: "greeting_v1",
    stageAfter: "qualifying",
    body: `Pozdrav${name}! 🙏 Što te dovodi — došao si po 10 Zlatnih Pravila, info o PREMIUM grupi, ili nešto treće? Reci mi u jednoj rečenici, prilagodit ću follow-up.`,
  };
}

/* =====================================================================
 * TEMPLATE 8 — Opt-out confirmation
 *
 * User said "stop" / "ne piši mi". Confirm + close conversation.
 * ===================================================================== */
export function tplOptOut(_vars: TemplateVars): RenderedTemplate {
  return {
    templateId: "opt_out_v1",
    stageAfter: "nurture", // technically "dead" but bot stops auto-replying anyway
    body: `Razumijem 🙏 nećeš dobivati više poruka. Ako se predomisliš — samo pošalji bilo koju riječ.`,
  };
}

/* =====================================================================
 * TEMPLATE 9 — Ghost nurture bump (24h-72h since last user reply)
 *
 * Sent ONCE if user got pitch but didn't respond for 24-72h. After
 * one nurture, conversation moves to NURTURE stage and bot stops
 * auto-bumping (preserves Telegram TOS — no spam).
 * ===================================================================== */
export function tplGhostNurge(vars: TemplateVars): RenderedTemplate {
  const name = vars.firstName ? ` ${vars.firstName}` : "";
  return {
    templateId: "ghost_nudge_v1",
    stageAfter: "nurture",
    body: `Ej${name}, samo da provjerim — jesi li imao priliku pogledati PDF? Koje pravilo te najviše udarilo (ako si pročitao)?`,
  };
}

/* =====================================================================
 * Routing — given an intent + current stage, which template to send?
 * ===================================================================== */
export interface RouteContext {
  intent: TelegramIntent;
  currentStage: string;
  vars: TemplateVars;
  capturedFields?: {
    location?: string;
    age?: number;
    experience?: string;
    hours_per_week?: number | string;
    monthly_goal_eur?: number | string;
  };
  /**
   * Template_id of the LAST outbound message in this conversation.
   * Used by the qualifying-stage anti-loop branch: if we'd send the
   * exact same template again, switch strategy (cut losses, send PDF
   * with whatever fields we have) instead of repeating the nudge.
   */
  previousTemplateId?: string | null;
}

export function routeTemplate(ctx: RouteContext): RenderedTemplate | null {
  const { intent, currentStage, vars, capturedFields, previousTemplateId } = ctx;

  // OPT-OUT — always wins
  if (intent === "ghost_unsubscribe") return tplOptOut(vars);

  // ESCALATE — high-intent, hand to Leonardo regardless of stage
  if (intent === "escalate_to_leo") return tplMentorHandover(vars);

  // STAGE: NEW — first contact
  if (currentStage === "new") {
    if (intent === "greeting") return tplGreetingResponse(vars);
    if (
      intent === "zlatna_knjiga" ||
      intent === "yt_youtube" ||
      intent === "info" ||
      intent === "generic_question" ||
      intent === "unclear"
    ) {
      return tplOpening(vars);
    }
    if (intent === "mentorstvo") {
      // Mentorstvo cold is unusual — give short response qualifying
      // before pitching €500/mj. Reverse-funnel rule.
      return tplOpening(vars);
    }
  }

  // STAGE: QUALIFYING — expecting answers to 3 questions
  if (currentStage === "qualifying") {
    if (intent === "mentorstvo") return tplMentorHandover(vars);
    // ghost_unsubscribe + escalate_to_leo already handled by the early
    // returns above. Everything else lands in the always-progress block.

    // For ANY other intent in qualifying stage we treat the message as
    // an attempt to answer. This includes unclear/generic_question/info —
    // people often answer in fragments ("ok", "?", "Ne razumijem što"),
    // and dropping them silently kills the funnel. Always nudge or pitch
    // based on what fields we have so far. Worst case: another nudge.
    const missing: string[] = [];
    if (!capturedFields?.location && !capturedFields?.age) missing.push("location");
    if (!capturedFields?.experience && !capturedFields?.hours_per_week)
      missing.push("hours_per_week");
    if (!capturedFields?.monthly_goal_eur) missing.push("monthly_goal_eur");

    if (missing.length === 0) {
      // All 3 answered — deliver PDF + PREMIUM pitch
      return tplPdfAndPremiumPitch(vars);
    }
    // Anti-loop escape hatch: if the last message we sent was already a
    // qualifying nudge, the user is clearly not playing along (Patrick
    // pattern: "20+", "??"). Cut losses — give them the PDF + PREMIUM
    // pitch with whatever fields we have. The pitch self-personalizes
    // around populated fields and degrades gracefully when missing.
    // After opening_v1, one nudge IS the right move; only escape when
    // the previous bot message was itself a nudge.
    if (previousTemplateId === "qualifying_nudge_v1") {
      return tplPdfAndPremiumPitch(vars);
    }
    return tplQualifyingNudge({ vars, missingFields: missing });
  }

  // STAGE: PITCH or AWAITING — user got the pitch, may ask details
  if (currentStage === "awaiting" || currentStage === "pitch") {
    if (intent === "premium_question" || intent === "info") {
      return tplPremiumDetail(vars);
    }
    if (intent === "premium_join") return tplMemberWelcome(vars);
    if (intent === "mentorstvo") return tplMentorHandover(vars);
  }

  // STAGE: MEMBER — already in PREMIUM
  if (currentStage === "member") {
    if (intent === "mentorstvo") return tplMentorHandover(vars);
    // Other intents handled by Leonardo manually for member-tier
    return null;
  }

  // STAGE: HANDOVER / NURTURE / DEAD — bot stops auto-replying
  if (currentStage === "handover" || currentStage === "dead") return null;

  // Fallback — unknown intent at unknown stage. Don't reply (avoid spam).
  return null;
}
