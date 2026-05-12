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
  | "brief";

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

export const FLOORS: Floor[] = [
  {
    id: "operations",
    number: 3,
    name: "Operations Hub",
    subtitle: "Klijenti, kalendar, brief",
    rooms: [clients, calendar, brief],
  },
  {
    id: "intelligence",
    number: 2,
    name: "Intelligence Bay",
    subtitle: "Score · Holmes · analytics · competitor watch",
    rooms: [leadScorer, holmes, strateg, analytics, competitor],
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
