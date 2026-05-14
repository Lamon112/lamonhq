/**
 * Vault — the Fallout-Shelter-style alternate view of Lamon HQ.
 *
 * Defines the AI agent roster, their rooms, and the cross-section
 * floor layout. Each room is mapped to an existing data source from
 * the classic HQ side (Holmes report, Revenue Engine, Brand Reach,
 * Client Manager, etc.) so we don't duplicate state — the vault is
 * a strategic visualization layer on top of the same data.
 */

import type { LucideIcon } from "lucide-react";
import {
  Search,
  Bot,
  Telescope,
  Hammer,
  Inbox,
  Banknote,
  Trophy,
  Users,
  Brain,
  Shield,
  MessageSquare,
  TrendingUp,
  Mic,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

export type AgentId =
  | "holmes"
  | "jarvis"
  | "nova"
  | "forge"
  | "comms"
  | "treasury"
  | "atlas"
  | "steward"
  | "aegis"
  | "mentat"
  | "strateg"
  | "pulse"
  | "riva"
  | "auditor"
  | "scholar";

export interface Agent {
  id: AgentId;
  /** Display name of the AI agent persona */
  name: string;
  /** Room name shown on the floor card */
  room: string;
  /** One-line role description */
  role: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** Persona emoji used in chat / standups */
  emoji: string;
  /** Vault floor (1 top → N bottom). Lower floors = deeper specialty. */
  floor: number;
  /** Order within floor (left to right) */
  slot: number;
  /** Minimum HQ level (XP-based) before room unlocks */
  unlockLevel: number;
  /**
   * Status of the room. "online" = wired up, "soon" = scaffolded but
   * still placeholder, "locked" = below unlockLevel.
   */
  status: "online" | "soon" | "locked";
  /** Accent color (Tailwind class fragment) for the room frame */
  accent: "amber" | "cyan" | "emerald" | "violet" | "rose" | "gold" | "sky";
  /** Bottom-of-card hint (one line). Shown when expanded too. */
  hint: string;
}

const AGENTS: Agent[] = [
  // FLOOR 1 — Command (top)
  {
    id: "jarvis",
    name: "Jarvis",
    room: "Command Center",
    role: "Daily briefing · Telegram push · butler",
    icon: Bot,
    emoji: "🤵",
    floor: 1,
    slot: 0,
    unlockLevel: 1,
    status: "online",
    accent: "gold",
    hint: "Šalje jutarnji brief + Top 3 actions svaki dan.",
  },
  {
    id: "mentat",
    name: "Mentat",
    room: "War Room",
    role: "Strategic standup · weekly review",
    icon: Brain,
    emoji: "🧠",
    floor: 1,
    slot: 1,
    unlockLevel: 1,
    status: "soon",
    accent: "violet",
    hint: "Daily agent standup + nedjelja strategy session.",
  },

  // FLOOR 2 — Intelligence
  {
    id: "holmes",
    name: "Holmes",
    room: "Detective Bureau",
    role: "Lead recon · org structure · channel drafts",
    icon: Search,
    emoji: "🕵️",
    floor: 2,
    slot: 0,
    unlockLevel: 1,
    status: "online",
    accent: "amber",
    hint: "12 Hot leadova investigated, V3/I0/S9/D0.",
  },
  {
    /*
     * Auditor — programmatic QA across every AI draft. Codifies every
     * failure pattern Leonardo's flagged (pricing leak, hallucinated
     * numbers, kune, lowball ROI, submissive lang, sign-off, lang
     * mash, regex debris). Surfaces failing leads with severity +
     * exact snippet + suggested fix. Self-refreshes overnight.
     */
    id: "auditor",
    name: "Auditor",
    room: "Audit Lab",
    role: "Auto-QA svih AI drafts · self-heals · uči iz tvojih edita",
    icon: ShieldCheck,
    emoji: "🛡",
    floor: 2,
    slot: 1,
    unlockLevel: 1,
    status: "online",
    accent: "rose",
    hint: "Ulovi sve buggy drafts prije nego što ih pošalješ.",
  },
  {
    id: "nova",
    name: "Nova",
    room: "Research Lab",
    role: "Competitor watch · industry intel · Bolutions track",
    icon: Telescope,
    emoji: "📡",
    floor: 2,
    slot: 2,
    unlockLevel: 1,
    status: "soon",
    accent: "cyan",
    hint: "Skenira konkurenciju + AI news feed.",
  },
  {
    id: "comms",
    name: "Comms",
    room: "Communications Hub",
    role: "Inbox triage · DM aggregator · reply queue",
    icon: Inbox,
    emoji: "📬",
    floor: 2,
    slot: 3,
    unlockLevel: 1,
    status: "online",
    accent: "sky",
    hint: "Sve DM-ove, mailove, replies u jednom mjestu.",
  },
  {
    id: "strateg",
    name: "Strateg",
    room: "Reply Analyst",
    role: "Auto-triage replies · sentiment · next-best-action",
    icon: MessageSquare,
    emoji: "🧠",
    floor: 2,
    slot: 4,
    unlockLevel: 1,
    status: "online",
    accent: "violet",
    hint: "Gmail poller svakih 5 min · 2 draftova replyja po inbound.",
  },
  {
    id: "pulse",
    name: "Pulse",
    room: "Brand Pulse",
    role: "Klijent social tracker · followers · komentari · AI savjeti",
    icon: TrendingUp,
    emoji: "📈",
    floor: 3,
    slot: 4,
    unlockLevel: 1,
    status: "online",
    accent: "cyan",
    hint: "Praća IG/TT/YT za svakog aktivnog klijenta · weekly delta + comment sentiment.",
  },
  {
    id: "riva",
    name: "Riva",
    room: "Riva Ops",
    role: "Što Riva radi sada po klinici · pozivi · transcripts · alerts",
    icon: Mic,
    emoji: "🎙",
    floor: 3,
    slot: 5,
    unlockLevel: 1,
    status: "online",
    accent: "rose",
    hint: "Real-time Riva voice agent monitor · per-clinic call log + config.",
  },
  {
    /*
     * Scholar — B2C SideHustle™ Ops agent. Tracks Skool MRR, DM
     * inbox across IG/TikTok/Telegram, mentorship pipeline, content
     * kalendar. Parallel to Steward (clients) but for the B2C side.
     */
    id: "scholar",
    name: "Scholar",
    room: "Skool Ops",
    role: "SideHustle™ B2C · Skool MRR · DM inbox · mentorship pipeline",
    icon: GraduationCap,
    emoji: "🎓",
    floor: 3,
    slot: 6,
    unlockLevel: 1,
    status: "online",
    accent: "sky",
    hint: "165 paid · €2.6K/mj → €5K cilj · 5 mentor mjesta · 50 unanswered DMs.",
  },

  // FLOOR 3 — Operations
  {
    id: "treasury",
    name: "Treasury",
    room: "Treasury Vault",
    role: "MRR · cost · runway · API kredit",
    icon: Banknote,
    emoji: "🏦",
    floor: 3,
    slot: 0,
    unlockLevel: 1,
    status: "online",
    accent: "emerald",
    hint: "Money in / out · monthly burn · runway alerts.",
  },
  {
    id: "steward",
    name: "Steward",
    room: "Client HQ",
    role: "Klijent retention · churn risk · weekly reports",
    icon: Users,
    emoji: "👥",
    floor: 3,
    slot: 1,
    unlockLevel: 1,
    status: "online",
    accent: "emerald",
    hint: "Aktivni klijenti šeću ovdje. Onboarding → Med Bay.",
  },
  {
    id: "atlas",
    name: "Atlas",
    room: "Brand Tower",
    role: "Personal brand · YT/TT/IG · sponsorships",
    icon: Trophy,
    emoji: "🎯",
    floor: 3,
    slot: 2,
    unlockLevel: 1,
    status: "online",
    accent: "rose",
    hint: "87.1K YT · 633K TT · suradnje koje stignu.",
  },
  {
    id: "aegis",
    name: "Aegis",
    room: "Concierge Wing",
    role: "Klijent nurturing · QBR · churn radar · upsell",
    icon: Shield,
    emoji: "🛡",
    floor: 3,
    slot: 3,
    unlockLevel: 1,
    status: "online",
    accent: "violet",
    hint: "Steward = onboarding (T+0 → T+30). Aegis = ongoing (T+30+).",
  },

  // FLOOR 4 — Production (locked initially)
  {
    id: "forge",
    name: "Forge",
    room: "Content Foundry",
    role: "TT/YT/IG content generation · skripte · repurposing",
    icon: Hammer,
    emoji: "🔨",
    floor: 4,
    slot: 0,
    unlockLevel: 5,
    status: "locked",
    accent: "amber",
    hint: "Unlock na Lvl 5. Pumpa content na auto-pilot.",
  },
];

export const VAULT_AGENTS = AGENTS;

export function agentById(id: AgentId): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function vaultFloors(): Array<{ number: number; rooms: Agent[] }> {
  const map = new Map<number, Agent[]>();
  for (const a of AGENTS) {
    const arr = map.get(a.floor) ?? [];
    arr.push(a);
    map.set(a.floor, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([number, rooms]) => ({
      number,
      rooms: rooms.sort((a, b) => a.slot - b.slot),
    }));
}

export const FLOOR_LABEL: Record<number, string> = {
  1: "Command Deck",
  2: "Intelligence Bay",
  3: "Operations Hub",
  4: "Production Wing",
  5: "Expansion Wing",
};
