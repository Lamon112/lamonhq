import type { LucideIcon } from "lucide-react";
import {
  Target,
  Handshake,
  Briefcase,
  Brain,
  ChartBar,
  Eye,
  Users,
  Calendar,
  FileText,
} from "lucide-react";

export type FloorId = "operations" | "intelligence" | "revenue";

export type RoomId =
  | "outreach"
  | "discovery"
  | "closing"
  | "lead_scorer"
  | "analytics"
  | "competitor"
  | "clients"
  | "calendar"
  | "reports";

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
  rooms: [Room, Room, Room];
}

const outreach: Room = {
  id: "outreach",
  name: "Outreach Lab",
  tagline: "Ručna i AI poruka prema lead-u",
  icon: Target,
  emoji: "🎯",
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
  name: "Performance Analytics",
  tagline: "TT · IG · YT · LinkedIn metrics",
  icon: ChartBar,
  emoji: "📊",
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

export const FLOORS: Floor[] = [
  {
    id: "operations",
    number: 3,
    name: "Operations Hub",
    subtitle: "Klijenti, kalendar, izvješća",
    rooms: [clients, calendar, reports],
  },
  {
    id: "intelligence",
    number: 2,
    name: "Intelligence Bay",
    subtitle: "Score · analytics · competitor watch",
    rooms: [leadScorer, analytics, competitor],
  },
  {
    id: "revenue",
    number: 1,
    name: "B2B Revenue Factory",
    subtitle: "Outreach → Discovery → Close",
    rooms: [outreach, discovery, closing],
  },
];

export const ALL_ROOMS: Room[] = FLOORS.flatMap((f) => f.rooms);
