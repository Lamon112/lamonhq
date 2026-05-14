"use client";

/**
 * Skool Ops — B2C SideHustle™ ops surface.
 *
 * Parallel to Plima (B2B clinic agency) per the b2b/b2c split rule.
 * Tracks Skool community MRR, mentorship pipeline, DM inbox across
 * IG @sidequestshr / TikTok @sidehustlebalkan / Telegram t.me/
 * sidehustlehr / Skool community feed.
 *
 * v1 (this file) is a static dashboard with hardcoded baseline stats
 * (€2.6K MRR, 165 paid, etc.) so the room is browsable + the system
 * has a place to surface findings as they ship. v2 will pull live
 * stats from:
 *   - Skool API (member count, daily new joins, churn) — once we
 *     figure out access (Skool platform doesn't have a public API,
 *     might need scrape or Stripe webhook)
 *   - Telegram Bot API (DM count, member count for t.me/sidehustlehr)
 *   - Meta Business Suite (IG @sidequestshr DMs + insights)
 *   - Stripe (mentorship payments, MRR breakdown)
 *
 * For now: Leonardo can update baseline numbers manually via memory
 * file → next deploy → renders here. v2 wires real-time API.
 */

import { useState } from "react";
import {
  TrendingUp,
  Users,
  GraduationCap,
  MessageCircle,
  Send,
  Award,
  Calendar as CalendarIcon,
  Target,
  DollarSign,
  Zap,
} from "lucide-react";

interface ChannelStat {
  platform: string;
  handle: string;
  emoji: string;
  followers: string;
  unanswered: number;
  url: string;
}

const CHANNELS: ChannelStat[] = [
  {
    platform: "Telegram",
    handle: "t.me/sidehustlehr",
    emoji: "💬",
    followers: "5,000+",
    unanswered: 30,
    url: "https://t.me/sidehustlehr",
  },
  {
    platform: "Instagram",
    handle: "@sidequestshr",
    emoji: "📷",
    followers: "3,263",
    unanswered: 20,
    url: "https://instagram.com/sidequestshr",
  },
  {
    platform: "TikTok",
    handle: "@sidehustlebalkan",
    emoji: "🎵",
    followers: "7,866",
    unanswered: 0,
    url: "https://tiktok.com/@sidehustlebalkan",
  },
  {
    platform: "Skool",
    handle: "skool.com/sidehustlebalkan",
    emoji: "🎓",
    followers: "165 paid",
    unanswered: 0,
    url: "https://skool.com/sidehustlebalkan",
  },
];

interface MentorshipSlot {
  status: "filled" | "fit-check" | "open";
  studentName?: string;
  startDate?: string;
  monthsLeft?: number;
}

const MENTORSHIP_SLOTS: MentorshipSlot[] = [
  {
    status: "filled",
    studentName: "Prvi student (€500/mj)",
    startDate: "2026-05-13",
    monthsLeft: 3,
  },
  { status: "open" },
  { status: "open" },
  { status: "open" },
  { status: "open" },
];

export function SkoolOpsPanel() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "inbox" | "mentorship" | "content"
  >("overview");

  const totalUnanswered = CHANNELS.reduce(
    (sum, c) => sum + c.unanswered,
    0,
  );
  const filledMentorSlots = MENTORSHIP_SLOTS.filter(
    (s) => s.status === "filled",
  ).length;

  // Hardcoded baseline as of 2026-05-14. v2 wires live Stripe/Skool API.
  const skoolMrr = 2600;
  const skoolMrrTarget = 5000;
  const mrrProgress = Math.min(100, Math.round((skoolMrr / skoolMrrTarget) * 100));

  return (
    <div className="space-y-4">
      {/* ── Hero stat row ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox
          icon={<DollarSign size={14} />}
          label="Skool MRR"
          value={`€${skoolMrr.toLocaleString()}`}
          hint={`/ €${skoolMrrTarget.toLocaleString()} M6`}
          tone="success"
        />
        <StatBox
          icon={<Users size={14} />}
          label="Paid članovi"
          value="165"
          hint="@€50/mj single tier"
          tone="neutral"
        />
        <StatBox
          icon={<Award size={14} />}
          label="Mentorstvo"
          value={`${filledMentorSlots}/5`}
          hint={`mjesta filled`}
          tone={filledMentorSlots > 0 ? "success" : "warning"}
        />
        <StatBox
          icon={<MessageCircle size={14} />}
          label="DM unanswered"
          value={totalUnanswered.toString()}
          hint="P0 — auto-responder gradi"
          tone={totalUnanswered > 10 ? "danger" : "neutral"}
        />
      </div>

      {/* ── MRR progress bar ── */}
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-text-muted">
            <Target size={11} className="mr-1 inline" />
            MRR put do €5K (M6 cilj — Q4 2026)
          </span>
          <span className="font-mono text-text">{mrrProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all"
            style={{ width: `${mrrProgress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-text-muted">
          Path C strategija: 3 nova mentorstva (+€1,500) + 18 novih €50 članova
          (+€900) = €2,400 → cilj €5K. Path D (B2B Growth Operator) OFF
          jer Rijeka grad pipeline propao.
        </p>
      </div>

      {/* ── Tab nav ── */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        <TabBtn
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </TabBtn>
        <TabBtn
          active={activeTab === "inbox"}
          onClick={() => setActiveTab("inbox")}
        >
          💬 DM Inbox · {totalUnanswered}
        </TabBtn>
        <TabBtn
          active={activeTab === "mentorship"}
          onClick={() => setActiveTab("mentorship")}
        >
          🎓 Mentorship · {filledMentorSlots}/5
        </TabBtn>
        <TabBtn
          active={activeTab === "content"}
          onClick={() => setActiveTab("content")}
        >
          📅 Content kalendar
        </TabBtn>
      </div>

      {activeTab === "overview" && <OverviewTab channels={CHANNELS} />}
      {activeTab === "inbox" && <InboxTab channels={CHANNELS} />}
      {activeTab === "mentorship" && <MentorshipTab slots={MENTORSHIP_SLOTS} />}
      {activeTab === "content" && <ContentTab />}
    </div>
  );
}

function OverviewTab({ channels }: { channels: ChannelStat[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          🎯 Brand
        </h4>
        <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-3">
          <p className="text-sm font-semibold text-sky-100">SideHustle™</p>
          <p className="mt-1 text-xs italic text-sky-200/80">
            &ldquo;Živite život iz snova radeći jedva 2 sata dnevno&rdquo;
          </p>
          <p className="mt-2 text-[11px] text-text-muted">
            Avatar: 18-34 yo Balkan, side income tražitelj ili student bez
            prihoda · 2 modela: YouTube Shorts + TikTok Creativity Program
          </p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          📱 Distribution kanali (793K+ ukupno)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {channels.map((c) => (
            <a
              key={c.platform}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-border bg-bg-card/40 p-2 transition-colors hover:border-sky-400/50"
            >
              <span className="text-lg">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text">{c.platform}</p>
                <p className="truncate text-[10px] font-mono text-text-dim">
                  {c.handle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-text">{c.followers}</p>
                {c.unanswered > 0 && (
                  <p className="text-[10px] text-rose-300">
                    {c.unanswered} unanswered
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          🚧 Sljedeći build-ovi (po Leonardovom prioritetu)
        </h4>
        <ul className="space-y-1 text-xs text-text">
          <li className="rounded border border-rose-400/30 bg-rose-500/5 px-2 py-1.5">
            <span className="font-bold text-rose-300">P0</span> · IG +
            Telegram DM auto-responder za sve CTA triggere (pun video
            scan u tijeku za inventory)
          </li>
          <li className="rounded border border-amber-400/30 bg-amber-500/5 px-2 py-1.5">
            <span className="font-bold text-amber-300">P1</span> · Live
            Skool MRR via Stripe/Skool integration (sad hardcoded)
          </li>
          <li className="rounded border border-sky-400/30 bg-sky-500/5 px-2 py-1.5">
            <span className="font-bold text-sky-300">P2</span> · Auditor
            cross-domain: Skool DM replies kroz isti auditor lib
          </li>
          <li className="rounded border border-stone-400/30 bg-stone-500/5 px-2 py-1.5">
            <span className="font-bold text-text-dim">P3</span> · Affiliate
            program tracker (€25/close + 1mo gratis @3 closes)
          </li>
        </ul>
      </div>
    </div>
  );
}

function InboxTab({ channels }: { channels: ChannelStat[] }) {
  const channelsWithInbox = channels.filter((c) => c.unanswered > 0);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3">
        <p className="text-xs font-semibold text-rose-100">
          🚨 50 unanswered DMs = direktan revenue leak
        </p>
        <p className="mt-1 text-[11px] text-rose-200/80">
          Math: 50 unanswered × 30% close rate × €50/mj entry = ~€750/mj
          propušteno trenutno + sve buduće DMs koje ne stigneš odgovoriti.
          Auto-responder (P0) gasi ovaj leak.
        </p>
      </div>

      <div className="space-y-2">
        {channelsWithInbox.map((c) => (
          <div
            key={c.platform}
            className="rounded-md border border-border bg-bg-card/40 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{c.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-text">
                    {c.platform}
                  </p>
                  <p className="text-[10px] font-mono text-text-dim">
                    {c.handle}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-rose-200">
                  {c.unanswered}
                </p>
                <p className="text-[10px] text-text-dim">unanswered</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          🤖 Auto-responder triggeri (radi se inventory + build)
        </h4>
        <ul className="space-y-1 text-xs text-text">
          <li>
            <span className="font-mono text-amber-300">ZLATNA KNJIGA</span>{" "}
            → free PDF (SideHustle_Free_Vodic.pdf) + soft Skool join CTA
          </li>
          <li>
            <span className="font-mono text-amber-300">INFO</span> →
            Skool tier (€50/mj) + community link + mentor option mention
          </li>
          <li>
            <span className="font-mono text-amber-300">MENTORSTVO</span>{" "}
            → onboarding form (Google Forms) + 24h fit-check timeline
          </li>
          <li className="text-text-dim italic">
            + dodatni CTA triggeri se identificiraju iz video scan-a
            (180 dana inventory)
          </li>
        </ul>
      </div>
    </div>
  );
}

function MentorshipTab({ slots }: { slots: MentorshipSlot[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <h4 className="text-xs font-semibold text-text">
          🎓 Mentorship offer · €500/mj × 3-mj minimum
        </h4>
        <p className="mt-1 text-[11px] text-text-muted">
          5 mjesta otvorenih · DM &ldquo;MENTORSTVO&rdquo; → onboarding
          form → fit check (24h) → start. Calls cadence po Leonardovoj
          procjeni (1×/tj ili 1×/mj per student need).
        </p>
      </div>

      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={
              "rounded-md border p-3 " +
              (slot.status === "filled"
                ? "border-emerald-400/40 bg-emerald-500/10"
                : slot.status === "fit-check"
                  ? "border-amber-400/40 bg-amber-500/10"
                  : "border-stone-400/30 bg-stone-500/5")
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Slot {i + 1}
                </p>
                <p className="mt-0.5 text-sm font-bold text-text">
                  {slot.status === "filled"
                    ? slot.studentName
                    : slot.status === "fit-check"
                      ? `${slot.studentName} (in fit-check)`
                      : "OPEN"}
                </p>
                {slot.startDate && (
                  <p className="text-[10px] text-text-dim">
                    Start: {slot.startDate} · {slot.monthsLeft}mj preostalo
                  </p>
                )}
              </div>
              <span
                className={
                  "rounded-full px-2 py-1 text-[10px] font-bold uppercase " +
                  (slot.status === "filled"
                    ? "bg-emerald-500/30 text-emerald-100"
                    : slot.status === "fit-check"
                      ? "bg-amber-500/30 text-amber-100"
                      : "bg-stone-500/20 text-stone-300")
                }
              >
                {slot.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-3">
        <p className="text-[11px] text-sky-200">
          <strong>Case studies (social proof za pitch):</strong> Tom (€17K
          u 3mj, 114.9M views, +167K subs) · Matija (€3K/mj u 2mj, prvi
          video €500+) · Poseidon (€15-20K/mj stable, putuje 365 dana,
          prvi student ever).
        </p>
      </div>
    </div>
  );
}

function ContentTab() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <h4 className="text-xs font-semibold text-text">
          📅 Tjedni content kalendar (iz Ekspanzija masterplana)
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DayCard day="PON" label="Edukativni Short" hint='Hook: "Napravio sam X za 10 min"' />
        <DayCard day="UTO" label="Skool Live (FREE)" hint="30 min · pitch zadnjih 5 min" />
        <DayCard day="SRI" label="B2B Case Study" hint="Baywash / klijent rad" />
        <DayCard day="ČET" label="Testimonial / Win" hint="Member screenshot + reel" />
        <DayCard day="PET" label="Community shoutout" hint="Top diskusija tjedna" />
      </div>

      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <p className="text-[11px] text-text-muted">
          <CalendarIcon size={11} className="mr-1 inline" />
          Content kalendar generator + auto-scheduling se gradi u sljedećoj
          fazi (P3). Trenutno je referenca iz tvog Ekspanzija masterplana
          (April 2026 strategija).
        </p>
      </div>
    </div>
  );
}

function DayCard({ day, label, hint }: { day: string; label: string; hint: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-card/40 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
        {day}
      </p>
      <p className="mt-1 text-xs font-semibold text-text">{label}</p>
      <p className="mt-0.5 text-[10px] italic text-text-muted">{hint}</p>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "border-rose-400/50 bg-rose-500/10"
      : tone === "warning"
        ? "border-amber-400/50 bg-amber-500/10"
        : tone === "success"
          ? "border-success/40 bg-success/10"
          : "border-border bg-bg-card/50";
  return (
    <div className={"rounded-lg border px-3 py-2 " + toneCls}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </p>
      <p className="text-lg font-bold text-text">{value}</p>
      {hint && <p className="text-[10px] text-text-dim">{hint}</p>}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md border-2 px-2.5 py-1.5 text-xs font-medium transition-all " +
        (active
          ? "border-sky-400/60 bg-sky-500/15 text-sky-200"
          : "border-border bg-bg-card/40 text-text-muted hover:border-border-strong")
      }
    >
      {children}
    </button>
  );
}
