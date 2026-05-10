/**
 * Raid catalog — Fallout-Shelter style threat system for Lamon HQ.
 *
 * Each raid archetype has:
 *   - title / icon / emoji         shown in incoming raid card
 *   - severity                     drives color + Jarvis push priority
 *   - target room                  which Vault room the raid attacks
 *   - ttlMinutes                   how long until auto-expire (= ignored)
 *   - story                        flavor text shown in defense modal
 *   - defenses[]                   2-4 player choices, each with cost,
 *                                  win probability, reward, penalty
 *
 * The actual side-effects (cash_ledger debit, lead status update, XP
 * grant) are applied by `applyRaidOutcome()` in src/app/actions/raids.ts.
 * This file is pure data — safe to import client-side.
 */
import type { AgentId } from "@/lib/vault";

export type RaidType =
  | "counter_scout"
  | "churn_wraith"
  | "vendor_swarm"
  | "bad_review"
  | "outage_beast"
  | "gdpr_probe";

export type RaidSeverity = "low" | "medium" | "high" | "critical";
export type RaidScope = "b2b" | "b2c" | "all";

export interface RaidDefense {
  id: string;
  /** Button label */
  label: string;
  /** One-line tradeoff hint shown under the button */
  hint: string;
  /** EUR cost charged immediately when chosen (0 = free) */
  costEur: number;
  /** 0–1, probability the defense succeeds */
  winChance: number;
  /** Lucide icon name (string for serializability) */
  icon: "shield" | "sword" | "smile" | "ghost" | "zap" | "wallet" | "phone" | "mail" | "ban" | "eye-off" | "scroll" | "sparkles";
  /** Human-readable summary of WIN side-effects (used in activity feed) */
  rewardLabel: string;
  /** Human-readable summary of LOSE side-effects */
  penaltyLabel: string;
  /** Reward XP granted on win */
  xpOnWin: number;
  /** Numeric MRR/cash impact if any (negative = cost). Applied via cash_ledger. */
  cashOnWin?: number;
  cashOnLose?: number;
  /**
   * Agent action that AI runs in background when this defense is chosen.
   * Matches an entry in src/lib/agentActions.ts ACTION_CATALOG. Null/
   * undefined = manual/op-sec defense, no AI work spawned. The defendRaid
   * server action inserts an agent_actions row + sends Inngest event;
   * the UI surfaces a "AI radi…" link to the running result drawer.
   */
  aiActionId?: string;
}

export interface RaidArchetype {
  type: RaidType;
  title: string;
  emoji: string;
  /** 1-line teaser shown on the room badge tooltip */
  blurb: string;
  /** 2-3 sentence flavor story for the defense modal */
  story: (ctx: Record<string, unknown>) => string;
  severity: RaidSeverity;
  /** Default target room — which vault room the raid lands on */
  targetRoom: AgentId;
  /** Time-to-live in minutes from spawn until auto-expire */
  ttlMinutes: number;
  /** Tailwind accent for the badge */
  accent: "rose" | "amber" | "violet" | "cyan" | "emerald" | "sky";
  /** 2-4 defense options the player can choose */
  defenses: RaidDefense[];
}

const COUNTER_SCOUT: RaidArchetype = {
  type: "counter_scout",
  title: "Counter-Scout",
  emoji: "🕵️",
  blurb: "Konkurent je primijetio tvoje izviđanje i šalje uzvratni napad.",
  story: (ctx) => {
    const target = (ctx.competitor_name as string | undefined) ?? "konkurent";
    return `Holmes je upravo izviđao **${target}**. Njihov tim je primijetio i sad pokušava scrape-ati tvoj prospect list preko fake DM-ova i social engineeringa. Ako ne reagiraš za 24h, otkrit će tvoj outreach pipeline.`;
  },
  severity: "medium",
  targetRoom: "holmes",
  ttlMinutes: 24 * 60,
  accent: "amber",
  defenses: [
    {
      id: "burn_cookies",
      label: "Burn cookies & rotiraj VPN",
      hint: "Sigurno, ali košta. 90% uspjeh.",
      costEur: 2,
      winChance: 0.9,
      icon: "shield",
      rewardLabel: "Trag obrisan, leadovi safe.",
      penaltyLabel: "VPN je failao, otkriveni leadovi.",
      xpOnWin: 30,
      cashOnLose: -5,
    },
    {
      id: "counter_dm_bait",
      label: "Counter-DM bait",
      hint: "50/50. Ako winneš, kradeš njihov pipeline.",
      costEur: 0,
      winChance: 0.5,
      icon: "sword",
      rewardLabel: "+5 hot leadova ukradeno iz njihovog funnel-a.",
      penaltyLabel: "Bait failao — otkriveni i 1 hot lead burned.",
      xpOnWin: 80,
      aiActionId: "holmes.counter_dm_bait",
    },
    {
      id: "ignore_scout",
      label: "Ignoriraj",
      hint: "70% chance da izgubiš 1 burned lead.",
      costEur: 0,
      winChance: 0.3,
      icon: "eye-off",
      rewardLabel: "Pretjerao si — nije bila prava prijetnja.",
      penaltyLabel: "Burned lead. Pipeline shrunk.",
      xpOnWin: 5,
    },
  ],
};

const CHURN_WRAITH: RaidArchetype = {
  type: "churn_wraith",
  title: "Churn Wraith",
  emoji: "💀",
  blurb: "Klijent pokazuje signale otkazivanja — udari prije nego ode.",
  story: (ctx) => {
    const client = (ctx.client_name as string | undefined) ?? "klijent";
    const score = (ctx.churn_score as number | undefined) ?? 75;
    return `Aegis churn-radar je flag-ao **${client}** (score ${score}/100). Booking volume pao 22%, missed escalation prošli tjedan, last touchpoint > 14 dana. Ako ne reagiraš za 12h, prijetnja se materializira u otkaz.`;
  },
  severity: "high",
  targetRoom: "aegis",
  ttlMinutes: 12 * 60,
  accent: "violet",
  defenses: [
    {
      id: "personal_call",
      label: "Osobni poziv vlasniku",
      hint: "−30 min focus, 80% retention.",
      costEur: 0,
      winChance: 0.8,
      icon: "phone",
      rewardLabel: "Klijent ostao, +trust badge.",
      penaltyLabel: "Vlasnik nije imao vremena, situacija eskalira.",
      xpOnWin: 100,
      aiActionId: "comms.churn_rescue_call",
    },
    {
      id: "discount_concession",
      label: "Ponudi −€50/mj na 3 mjeseca",
      hint: "Skup ali safe. 95% uspjeh.",
      costEur: 0,
      winChance: 0.95,
      icon: "wallet",
      rewardLabel: "Klijent ostao, ali MRR pao €150 cumulative.",
      penaltyLabel: "Klijent je htio i više, MRR pao €150 svejedno.",
      xpOnWin: 60,
      cashOnWin: -150,
      cashOnLose: -150,
      aiActionId: "comms.churn_discount_email",
    },
    {
      id: "loyalty_gift",
      label: "Pošalji loyalty gift (vino + ručno pismo)",
      hint: "−€30, 60% uspjeh, +brand.",
      costEur: 30,
      winChance: 0.6,
      icon: "sparkles",
      rewardLabel: "Klijent oduševljen, +referral potencijal.",
      penaltyLabel: "Gift stigao prekasno, klijent već u procesu otkaza.",
      xpOnWin: 80,
      aiActionId: "comms.churn_loyalty_gift",
    },
    {
      id: "ignore_churn",
      label: "Ignoriraj",
      hint: "50% klijent ode sljedeći ciklus.",
      costEur: 0,
      winChance: 0.5,
      icon: "eye-off",
      rewardLabel: "Lažna uzbuna — klijent ostao sam od sebe.",
      penaltyLabel: "Klijent → at_risk, MRR risk.",
      xpOnWin: 0,
    },
  ],
};

const VENDOR_SWARM: RaidArchetype = {
  type: "vendor_swarm",
  title: "Vendor Swarm",
  emoji: "🦂",
  blurb: "SaaS i agency cold outreach blokira tvoj inbox.",
  story: () => {
    return `Comms inbox je primio 4 cold sales pitcha u zadnjih 24h. "Hey Leonardo, we help agencies scale to $100K MRR..." spam ti jede focus time. Svaki novi pitch izgubi ti dodatnih 5min ako ne uspostaviš filter.`;
  },
  severity: "low",
  targetRoom: "comms",
  ttlMinutes: 6 * 60,
  accent: "sky",
  defenses: [
    {
      id: "block_report",
      label: "Block & report svih 4",
      hint: "−5 min, brza pobjeda.",
      costEur: 0,
      winChance: 0.95,
      icon: "ban",
      rewardLabel: "Inbox čist. Kratak rad ali efikasan.",
      penaltyLabel: "1 pitch je legit business contact, propustio si ga.",
      xpOnWin: 20,
    },
    {
      id: "sarcastic_reply",
      label: "Sarkastičan odgovor",
      hint: "1% ih postane klijent. Većina = 10min wasted.",
      costEur: 0,
      winChance: 0.05,
      icon: "smile",
      rewardLabel: "Jedan se predomislio i postao paying klijent (+€500 setup).",
      penaltyLabel: "10 min potrošeno bez rezultata.",
      xpOnWin: 50,
      cashOnWin: 500,
      aiActionId: "comms.sarcastic_pitch_reply",
    },
    {
      id: "auto_filter_rule",
      label: "Postavi Gmail auto-filter",
      hint: "−30 min jednom, +imunitet 7 dana.",
      costEur: 0,
      winChance: 0.9,
      icon: "shield",
      rewardLabel: "Filter radi. Sljedeća 2 swarma auto-blokirana.",
      penaltyLabel: "Filter previše agresivan — propustio si Apollo notifikaciju.",
      xpOnWin: 60,
      aiActionId: "comms.vendor_filter_setup",
    },
    {
      id: "ignore_swarm",
      label: "Ignoriraj",
      hint: "Sljedeći ciklus +10 min wasted.",
      costEur: 0,
      winChance: 0.4,
      icon: "eye-off",
      rewardLabel: "Spam stao sam od sebe.",
      penaltyLabel: "Inbox još zatrpaniji idući ciklus.",
      xpOnWin: 5,
    },
  ],
};

const BAD_REVIEW: RaidArchetype = {
  type: "bad_review",
  title: "Bad-Review Goblin",
  emoji: "📉",
  blurb: "1-star review se pojavio na Google/social — reputation pod prijetnjom.",
  story: (ctx) => {
    const platform = (ctx.platform as string | undefined) ?? "Google Maps";
    return `Anonymous user je upravo ostavio 1-zvjezdičnu recenziju na **${platform}**: "AI je hladan i nikad ne daje cijene, gubitak vremena." Ako ne odgovoriš pametno za 48h, recenzija će dominirati first impression novih prospect-a.`;
  },
  severity: "medium",
  targetRoom: "atlas",
  ttlMinutes: 48 * 60,
  accent: "rose",
  defenses: [
    {
      id: "public_response",
      label: "Public response (profesionalan, empatičan)",
      hint: "Visok upside. Ako loše, eskalira.",
      costEur: 0,
      winChance: 0.7,
      icon: "scroll",
      rewardLabel: "+5 brand reputation, drugi prospect-i vide profesionalan response.",
      penaltyLabel: "Reviewer je odgovorio gore — thread otišao u krivom smjeru.",
      xpOnWin: 70,
      aiActionId: "atlas.review_public_response",
    },
    {
      id: "personal_dm",
      label: "Direct DM reviewer-u",
      hint: "−15 min, 70% uklone recenziju.",
      costEur: 0,
      winChance: 0.7,
      icon: "mail",
      rewardLabel: "Reviewer je uklonio recenziju, problem solved.",
      penaltyLabel: "Reviewer je javno screenshotao tvoj DM. Damage doubled.",
      xpOnWin: 80,
      aiActionId: "atlas.review_dm_outreach",
    },
    {
      id: "drown_in_good_reviews",
      label: "Push happy klijente da ostave 5★",
      hint: "−€20 (small ad budget), prosjek se vraća.",
      costEur: 20,
      winChance: 0.85,
      icon: "sparkles",
      rewardLabel: "5 novih 5★ recenzija, prosjek vraćen na 4.8.",
      penaltyLabel: "Samo 1 klijent reagirao, prosjek još pao.",
      xpOnWin: 50,
      aiActionId: "steward.review_5star_request",
    },
    {
      id: "ignore_review",
      label: "Ignoriraj",
      hint: "−1 brand reputation point.",
      costEur: 0,
      winChance: 0.2,
      icon: "eye-off",
      rewardLabel: "Recenzija je pala niže u rezultatima sama od sebe.",
      penaltyLabel: "−1 brand reputation, prospect-i je vide kao prvu.",
      xpOnWin: 0,
    },
  ],
};

const OUTAGE_BEAST: RaidArchetype = {
  type: "outage_beast",
  title: "Outage Beast",
  emoji: "🔥",
  blurb: "Vapi/Supabase health drop — production prijetnja.",
  story: (ctx) => {
    const service = (ctx.service as string | undefined) ?? "Vapi";
    return `**${service}** je počeo failati health check-ove. 3 active calls od Riva u zadnjih 5 min su droppale. Ako ne reagiraš za 2h, klijenti će primijetiti i izgubit ćeš trust.`;
  },
  severity: "critical",
  targetRoom: "jarvis",
  ttlMinutes: 2 * 60,
  accent: "rose",
  defenses: [
    {
      id: "failover_script",
      label: "Aktiviraj failover (forward → mobitel)",
      hint: "−30 min setup, +Riva uptime saved.",
      costEur: 0,
      winChance: 0.9,
      icon: "zap",
      rewardLabel: "Pozivi forward-ani na mobitel, klijenti misle da je sve normalno.",
      penaltyLabel: "Forwarding setup pogriješio — još više call drop-ova.",
      xpOnWin: 120,
      aiActionId: "jarvis.outage_failover_runbook",
    },
    {
      id: "notify_clients_proactive",
      label: "Notify klijente proaktivno",
      hint: "Trust win, ali admin overhead.",
      costEur: 0,
      winChance: 0.85,
      icon: "mail",
      rewardLabel: "Klijenti pohvalili transparentnost, +trust badge.",
      penaltyLabel: "Klijent #1 je shvatio kao incompetenciju.",
      xpOnWin: 100,
      aiActionId: "comms.outage_proactive_notify",
    },
    {
      id: "ignore_outage",
      label: "Ignoriraj — možda prođe samo",
      hint: "Visok rizik, srušit će ti mjesec.",
      costEur: 0,
      winChance: 0.15,
      icon: "eye-off",
      rewardLabel: "Outage trajao samo 8 min, nitko nije primijetio.",
      penaltyLabel: "Klijent #2 cancellation incoming.",
      xpOnWin: 0,
      cashOnLose: -1497,
    },
  ],
};

const GDPR_PROBE: RaidArchetype = {
  type: "gdpr_probe",
  title: "GDPR Probe",
  emoji: "🐍",
  blurb: "Random compliance probe — dokaži da Riva consent flow radi.",
  story: () => {
    return `Hrvatska AZOP agencija je poslala spot-check email tražeći dokaz da Riva flow ima pravilan GDPR consent disclaimer. Imaš 72h za odgovor. Ako ne reagiraš, eskalira u formal audit.`;
  },
  severity: "high",
  targetRoom: "aegis",
  ttlMinutes: 72 * 60,
  accent: "emerald",
  defenses: [
    {
      id: "compile_dossier",
      label: "Sam compile-aj compliance dossier",
      hint: "−2h focus, +permanent GDPR badge.",
      costEur: 0,
      winChance: 0.85,
      icon: "scroll",
      rewardLabel: "Dossier prihvaćen, GDPR badge stalan, future probes auto-resolve.",
      penaltyLabel: "Dossier nepotpun, AZOP traži dodatne dokumente.",
      xpOnWin: 150,
      aiActionId: "aegis.gdpr_dossier",
    },
    {
      id: "engage_lawyer",
      label: "Angažiraj lawyera (−€200)",
      hint: "Brzo i sigurno.",
      costEur: 200,
      winChance: 0.98,
      icon: "wallet",
      rewardLabel: "Lawyer riješio, AZOP zatvorila probe.",
      penaltyLabel: "Lawyer je propustio detalj, escalation na sljedeći level.",
      xpOnWin: 60,
      aiActionId: "comms.gdpr_lawyer_engagement",
    },
    {
      id: "ignore_gdpr",
      label: "Ignoriraj",
      hint: "Eskalira u formal audit (−€500 + sat vremena).",
      costEur: 0,
      winChance: 0.1,
      icon: "eye-off",
      rewardLabel: "Probe se zatvorio sam od sebe (lucky).",
      penaltyLabel: "Formal audit pokrenut, −€500 fee + 4h dokumentacije.",
      xpOnWin: 0,
      cashOnLose: -500,
    },
  ],
};

export const RAID_ARCHETYPES: Record<RaidType, RaidArchetype> = {
  counter_scout: COUNTER_SCOUT,
  churn_wraith: CHURN_WRAITH,
  vendor_swarm: VENDOR_SWARM,
  bad_review: BAD_REVIEW,
  outage_beast: OUTAGE_BEAST,
  gdpr_probe: GDPR_PROBE,
};

export function raidArchetype(type: RaidType): RaidArchetype {
  return RAID_ARCHETYPES[type];
}

export const RAID_TYPES_LIST: RaidType[] = [
  "counter_scout",
  "churn_wraith",
  "vendor_swarm",
  "bad_review",
  "outage_beast",
  "gdpr_probe",
];

/** Severity → border / glow color used on the room badge. */
export const SEVERITY_COLOR: Record<RaidSeverity, { border: string; bg: string; text: string; pulse: string }> = {
  low: {
    border: "border-sky-500",
    bg: "bg-sky-500/20",
    text: "text-sky-200",
    pulse: "bg-sky-400",
  },
  medium: {
    border: "border-amber-500",
    bg: "bg-amber-500/20",
    text: "text-amber-200",
    pulse: "bg-amber-400",
  },
  high: {
    border: "border-orange-500",
    bg: "bg-orange-500/20",
    text: "text-orange-200",
    pulse: "bg-orange-400",
  },
  critical: {
    border: "border-rose-500",
    bg: "bg-rose-500/30",
    text: "text-rose-100",
    pulse: "bg-rose-500",
  },
};

/** Roll the dice given a defense's winChance. Pure for test predictability. */
export function rollDefense(winChance: number, rng: () => number = Math.random): boolean {
  return rng() < winChance;
}
