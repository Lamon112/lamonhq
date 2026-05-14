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
  GraduationCap,
  Compass,
  Film,
  BookOpen,
  PhoneCall,
  AtSign,
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
  | "audit"
  | "skool_ops"
  | "niche_hunter"
  | "script_lab"
  | "coach_lab"
  | "clinic_caller"
  | "linkedin_lab";

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
 * Skool Ops — B2C SideHustle™ business surface (parallel to Plima
 * B2B per the b2b/b2c split rule). Tracks Skool community MRR (€2.6K
 * → €5K M6 target), mentorship pipeline (5 slots, 1 filled), DM
 * inbox queue across IG @sidequestshr / TikTok @sidehustlebalkan /
 * Telegram t.me/sidehustlehr / Skool community feed.
 *
 * Lives on Operations Hub floor (alongside Client Manager, Brand
 * Pulse, Riva Ops) because it's a recurring-ops surface, not a
 * lead-gen pipeline.
 */
const skoolOps: Room = {
  id: "skool_ops",
  name: "Skool Ops",
  tagline:
    "B2C SideHustle™ PREMIUM · MRR €2.6K → €5K · DM inbox · mentorship pipeline · content kalendar",
  icon: GraduationCap,
  emoji: "🎓",
  floor: "operations",
};

/*
 * Niche Hunter — bi-weekly viral niche generator for SideHustle™
 * Skool members. Leonardo's standing promise to the community: every
 * 2 weeks a NEW viral niche drop.
 *
 * Method (cron driven):
 *   1. YT search top-1 channel for "AI side hustle", "YouTube
 *      automation", "TikTok creativity", "viral niche 2026" etc.
 *   2. For top creators (Iman, Hamza, Riley Brown, Steph Smith,
 *      etc.) fetch latest 3-5 videos
 *   3. Pull transcripts via YouTube Transcript API
 *   4. Claude analyzes — extracts EMERGING niches (mentioned 3+
 *      gurus in 14d window, not yet saturated on TikTok/Shorts)
 *   5. Generates Skool post draft: niche name + why it's viral +
 *      first-mover advantage + 5 video ideas + monetization path
 *   6. Drafts in `niche_drops` table awaiting Leonardo's review
 *
 * Lives on Intelligence Bay floor (alongside Holmes, Auditor, Lead
 * Scorer) because it's a recon/intelligence function for B2C Skool
 * content engine.
 */
const nicheHunter: Room = {
  id: "niche_hunter",
  name: "Niche Hunter",
  tagline:
    "Bi-weekly viral niche drop generator · YT guru transcript scan · automatska Skool post draft",
  icon: Compass,
  emoji: "🧭",
  floor: "intelligence",
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
/*
 * Script Lab — weekly Leonardo video script generator. Pulls top-10x
 * performers from video_intel (@lamon.leonardo + @sidequestshr), latest
 * approved niche drops, and generates 5-7 ready-to-shoot scripts every
 * Monday morning following PON/UTO/SRI/ČET/PET channel cadence.
 *
 * Each script: hook 3sek, body structure, full voiceover, CTA, hashtags,
 * burned subtitles, viral_prediction + conversion_prediction scores +
 * rationale + borrowed_from refs to the top-10x videos it copied.
 */
const scriptLab: Room = {
  id: "script_lab",
  name: "Script Lab",
  tagline:
    "Tjedna AI video skripta · top-10x performers analiza · viral + konverzija scoring",
  icon: Film,
  emoji: "🎬",
  floor: "intelligence",
};

/*
 * Coach Lab — AI YouTube biznis coach za Leonardove 1:1 studente.
 * Per-student: onboarding intake → 12-week roadmap (Opus) → weekly
 * check-in AI analysis (Sonnet) with Leonardo oversight (approve gate
 * before send). Cost ~$0.15/student/week.
 */
const coachLab: Room = {
  id: "coach_lab",
  name: "Coach Lab",
  tagline:
    "AI YT biznis coach za 1:1 studente · 12-tj roadmap · weekly check-in analiza · Leonardo oversight",
  icon: BookOpen,
  emoji: "📚",
  floor: "operations",
};

/*
 * Clinic Caller — AI voice agent (Vapi + ElevenLabs + Claude) calls
 * dental/aesthetic clinic queue with Leonardov 4-part outreach playbook.
 * Cron every 15 min, max 5 concurrent calls. Outcomes mapped to:
 * booked / gatekeeper / voicemail / not_interested / wrong_number /
 * no_answer / failed. Booked → push Jarvis.
 */
const clinicCaller: Room = {
  id: "clinic_caller",
  name: "Clinic Caller",
  tagline:
    "AI voice agent · automatski zove ordinacije · Vapi+ElevenLabs · Leonardov 4-part playbook",
  icon: PhoneCall,
  emoji: "📞",
  floor: "revenue",
};

/*
 * LinkedIn Lab — generator 3 varijante (hook/story/contrarian) po
 * temi. Leonardov B2B brand glas (peer-level, no submissive lang,
 * specific numbers, assumptive close). Workflow: pending_review →
 * approve → publish (manual to LinkedIn). Saved url for tracking.
 */
const linkedinLab: Room = {
  id: "linkedin_lab",
  name: "LinkedIn Lab",
  tagline:
    "AI 3-varijant generator za LinkedIn objave · Leonardo voice · viral + konverzija scoring",
  icon: AtSign,
  emoji: "💼",
  floor: "operations",
};

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
    subtitle: "Klijenti, Skool B2C, kalendar, brief",
    rooms: [clients, brandPulse, rivaOps, skoolOps, coachLab, linkedinLab, calendar, brief],
  },
  {
    id: "intelligence",
    number: 2,
    name: "Intelligence Bay",
    subtitle:
      "Score · Holmes · audit · niche hunter · analytics · competitor watch",
    rooms: [
      leadScorer,
      holmes,
      auditLab,
      nicheHunter,
      scriptLab,
      strateg,
      analytics,
      competitor,
    ],
  },
  {
    id: "revenue",
    number: 1,
    name: "B2B Revenue Factory",
    subtitle: "Outreach → Discovery → Close",
    rooms: [outreach, clinicCaller, sentArchive, discovery, closing],
  },
];

export const ALL_ROOMS: Room[] = FLOORS.flatMap((f) => f.rooms);
