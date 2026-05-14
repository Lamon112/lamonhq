import type { LucideIcon } from "lucide-react";
import {
  Target,
  Handshake,
  Briefcase,
  Brain,
  Activity,
  Eye,
  Users,
  Calendar,
  FileText,
  Sparkles,
  Search,
  Archive,
  MessageSquare,
  TrendingUp,
  Mic,
  ShieldCheck,
} from "lucide-react";

export type FloorId = "operations" | "intelligence" | "revenue";

export type RoomId =
  | "outreach"
  | "sent_archive"
  | "discovery"
  | "closing"
  | "lead_scorer"
  | "holmes"
  | "strateg"
  | "analytics"
  | "competitor"
  | "clients"
  | "calendar"
  | "reports"
  | "brief"
  | "brand_pulse"
  | "riva_ops"
  | "audit";

export interface Room {
  id: RoomId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  emoji: string;
  floor: FloorId;
}

export interface Floor {
  id: FloorId;
  number: number;
  name: string;
  subtitle: string;
  rooms: Room[];
}

const outreach: Room = {
  id: "outreach",
  name: "Outreach Lab",
  tagline: "Ručna i AI poruka prema lead-u",
  icon: Target,
  emoji: "🎯",
  floor: "revenue",
};

const sentArchive: Room = {
  id: "sent_archive",
  name: "Sent Archive",
  tagline: "Povijest poslanih outreach poruka",
  icon: Archive,
  emoji: "📤",
  floor: "revenue",
};

const discovery: Room = {
  id: "discovery",
  name: "Discovery Bay",
  tagline: "Calendly bookings & call notes",
  icon: Handshake,
  emoji: "🤝",
  floor: "revenue",
};

const closing: Room = {
  id: "closing",
  name: "Closing Room",
  tagline: "Otvoreni deals u final stage",
  icon: Briefcase,
  emoji: "💼",
  floor: "revenue",
};

const leadScorer: Room = {
  id: "lead_scorer",
  name: "Lead Scorer",
  tagline: "ICP score 0–20 po lead-u",
  icon: Brain,
  emoji: "🧠",
  floor: "intelligence",
};

const analytics: Room = {
  id: "analytics",
  name: "Revenue Engine",
  tagline: "Daily health · pace · funnel · stuck deals",
  icon: Activity,
  emoji: "💚",
  floor: "intelligence",
};

const holmes: Room = {
  id: "holmes",
  name: "Holmes Bureau",
  tagline: "AI detektiv: vlasnik · social depth · best angle",
  icon: Search,
  emoji: "🕵️",
  floor: "intelligence",
};

const strateg: Room = {
  id: "strateg",
  name: "Strateg",
  tagline: "Auto-reply triage · sentiment · next-best-action po lead-u",
  icon: MessageSquare,
  emoji: "🧠",
  floor: "intelligence",
};

const competitor: Room = {
  id: "competitor",
  name: "Competitor Watch",
  tagline: "Bolutions & ostale agencije",
  icon: Eye,
  emoji: "👁",
  floor: "intelligence",
};

const clients: Room = {
  id: "clients",
  name: "Client Manager",
  tagline: "Aktivni klijenti & churn risk",
  icon: Users,
  emoji: "👥",
  floor: "operations",
};

const calendar: Room = {
  id: "calendar",
  name: "Calendar / Tasks",
  tagline: "Today · Week · Month",
  icon: Calendar,
  emoji: "📅",
  floor: "operations",
};

const reports: Room = {
  id: "reports",
  name: "Weekly Reports",
  tagline: "Generate & track izvješća",
  icon: FileText,
  emoji: "📋",
  floor: "operations",
};

const brief: Room = {
  id: "brief",
  name: "Brief Room",
  tagline: "AI prep za nadolazeće sastanke",
  icon: Sparkles,
  emoji: "🧭",
  floor: "operations",
};

const brandPulse: Room = {
  id: "brand_pulse",
  name: "Brand Pulse",
  tagline: "Praćenje social media-a klijenata · followers · komentari · AI savjeti",
  icon: TrendingUp,
  emoji: "📈",
  floor: "operations",
};

const rivaOps: Room = {
  id: "riva_ops",
  name: "Riva Ops",
  tagline: "Što Riva radi sada · pozivi · transcripts · alerts po klinici",
  icon: Mic,
  emoji: "🎙",
  floor: "operations",
};

/*
 * Audit Lab — cross-domain auto-QA for every AI draft we generate
 * (Holmes outreach, Skool IG/Telegram replies, Brand Pulse comments,
 * Reply Analyst drafts, etc.). Surfaces failing drafts with severity-
 * sorted issues + auto-refresh / auto-fix action. Replaces Leonardo's
 * manual character-by-character review loop.
 *
 * Lives on Intelligence Bay floor (next to Holmes) because audit is
 * fundamentally QA of intelligence outputs.
 */
const auditLab: Room = {
  id: "audit",
  name: "Audit Lab",
  tagline:
    "Auto-QA svih AI drafts · failing leads + checks breakdown · self-heals · uči iz tvojih edita",
  icon: ShieldCheck,
  emoji: "🛡",
  floor: "intelligence",
};

export const FLOORS: Floor[] = [
  {
    id: "operations",
    number: 3,
    name: "Operations Hub",
    subtitle: "Klijenti, kalendar, brief",
    rooms: [clients, brandPulse, rivaOps, calendar, brief],
  },
  {
    id: "intelligence",
    number: 2,
    name: "Intelligence Bay",
    subtitle: "Score · Holmes · audit · analytics · competitor watch",
    rooms: [leadScorer, holmes, auditLab, strateg, analytics, competitor],
  },
  {
    id: "revenue",
    number: 1,
    name: "B2B Revenue Factory",
    subtitle: "Outreach → Discovery → Close",
    rooms: [outreach, sentArchive, discovery, closing],
  },
];

export const ALL_ROOMS: Room[] = FLOORS.flatMap((f) => f.rooms);
