"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Activity,
  Filter,
  Radio,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  refreshYouTubeStats,
  refreshTikTokStats,
} from "@/app/actions/analytics";
import {
  StatTile,
  TabButton,
  Badge,
} from "@/components/ui/common";
import { formatRelative } from "@/lib/format";
import type {
  ChannelStatsView,
  RevenueHealth,
} from "@/lib/queries";

type Tab = "health" | "funnel" | "reach";
type ChannelPlatform = "youtube" | "instagram" | "tiktok" | "linkedin";

interface RevenueEnginePanelProps {
  initialHealth: RevenueHealth;
  initialYoutube: ChannelStatsView;
  initialTiktok: Array<{ handle: string; view: ChannelStatsView }>;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatEur(cents: number): string {
  if (cents === 0) return "€0";
  if (cents >= 100_000_00) return `€${(cents / 100_00).toFixed(0)}K`;
  return `€${(cents / 100).toLocaleString("hr-HR", {
    maximumFractionDigits: 0,
  })}`;
}

function scoreColor(pct: number): string {
  if (pct >= 0.75) return "text-success";
  if (pct >= 0.5) return "text-gold";
  if (pct >= 0.25) return "text-warning";
  return "text-danger";
}

function scoreRing(pct: number): string {
  if (pct >= 0.75) return "stroke-success";
  if (pct >= 0.5) return "stroke-gold";
  if (pct >= 0.25) return "stroke-warning";
  return "stroke-danger";
}

const STAGE_LABEL: Record<string, string> = {
  discovery: "Discovery",
  pricing: "Pricing",
  financing: "Financing",
  booking: "Booking",
  closed_won: "Won",
  closed_lost: "Lost",
};

export function RevenueEnginePanel({
  initialHealth,
  initialYoutube,
  initialTiktok,
}: RevenueEnginePanelProps) {
  const [tab, setTab] = useState<Tab>("health");
  const [health] = useState(initialHealth);

  const [youtube, setYoutube] = useState(initialYoutube);
  const [ytRefreshing, setYtRefreshing] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

  const [tiktok, setTiktok] = useState(initialTiktok);
  const [ttRefreshing, setTtRefreshing] = useState(false);
  const [ttError, setTtError] = useState<string | null>(null);

  const ytLatest = youtube.latest;
  const ytStale =
    !ytLatest ||
    Date.now() - new Date(ytLatest.fetched_at).getTime() > 10 * 60 * 1000;
  const ttStale = tiktok.some(
    (t) =>
      !t.view.latest ||
      Date.now() - new Date(t.view.latest.fetched_at).getTime() >
        10 * 60 * 1000,
  );

  async function refreshYoutube(force = false) {
    setYtRefreshing(true);
    setYtError(null);
    const res = await refreshYouTubeStats({ force });
    if (!res.ok) setYtError(res.error ?? "YouTube refresh failed");
    if (res.ok && res.stats && res.fetchedAt) {
      setYoutube((prev) =>
        buildView(
          prev,
          {
            handle: res.stats!.handle,
            channel_id: res.stats!.channelId,
            subscribers: res.stats!.subscribers,
            total_views: res.stats!.totalViews,
            video_count: res.stats!.videoCount,
            fetched_at: res.fetchedAt!,
          },
          "youtube",
        ),
      );
    }
    setYtRefreshing(false);
  }

  async function refreshTiktok(force = false) {
    setTtRefreshing(true);
    setTtError(null);
    const res = await refreshTikTokStats({ force });
    const errors = res.results.filter((r) => !r.ok);
    if (errors.length)
      setTtError(
        errors.map((e) => `${e.handle}: ${e.error ?? "fail"}`).join(" · "),
      );
    setTiktok((prev) =>
      prev.map((entry) => {
        const r = res.results.find((x) => x.handle === entry.handle);
        if (!r || !r.ok || !r.stats || !r.fetchedAt) return entry;
        return {
          handle: entry.handle,
          view: buildView(
            entry.view,
            {
              handle: r.stats.handle,
              channel_id: r.stats.uniqueId,
              subscribers: r.stats.followers,
              total_views: r.stats.hearts,
              video_count: r.stats.videoCount,
              fetched_at: r.fetchedAt,
            },
            "tiktok",
          ),
        };
      }),
    );
    setTtRefreshing(false);
  }

  useEffect(() => {
    if (tab === "reach") {
      if (ytStale && !ytRefreshing) void refreshYoutube(false);
      if (ttStale && !ttRefreshing) void refreshTiktok(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const scorePct = health.score / 100;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "health"} onClick={() => setTab("health")}>
          <Activity size={14} /> Health · {health.score}
        </TabButton>
        <TabButton active={tab === "funnel"} onClick={() => setTab("funnel")}>
          <Filter size={14} /> Funnel
        </TabButton>
        <TabButton active={tab === "reach"} onClick={() => setTab("reach")}>
          <Radio size={14} /> Brand reach
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "health" && (
          <motion.div
            key="health"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            {/* Score hero */}
            <div className="rounded-lg border border-border bg-bg-card/60 p-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={health.score} pct={scorePct} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    Sales Health Score
                  </div>
                  <div
                    className={`text-2xl font-bold ${scoreColor(scorePct)}`}
                  >
                    {health.score}/100
                  </div>
                  {health.topLeak && (
                    <div className="mt-1 flex items-start gap-1.5 text-xs text-danger">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <span>{health.topLeak}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-5">
                {health.components.map((c) => {
                  const p = c.got / c.max;
                  return (
                    <div
                      key={c.key}
                      className="rounded border border-border bg-bg-card/40 px-2 py-1.5"
                    >
                      <div className="text-[9px] uppercase tracking-wider text-text-muted">
                        {c.label}
                      </div>
                      <div
                        className={`text-xs font-semibold ${scoreColor(p)}`}
                      >
                        {c.got}/{c.max}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trajectory */}
            <div className="rounded-lg border border-border bg-bg-card/60 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    €30K/mj trajectory
                  </div>
                  <div className="mt-0.5 text-sm">
                    Trenutno{" "}
                    <span className="font-semibold text-text">
                      {formatEur(health.trajectory.currentMrrCents)}
                    </span>{" "}
                    · Goal{" "}
                    <span className="font-semibold text-gold">
                      {formatEur(health.trajectory.goalMrrCents)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    Goal date
                  </div>
                  <div className="text-xs font-medium text-text">
                    {health.trajectory.goalDate}
                  </div>
                  <div className="text-[10px] text-text-dim">
                    {health.trajectory.daysToGoal}d left
                  </div>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg-card/80">
                <div
                  className="h-full rounded-full bg-gold transition-all"
                  style={{
                    width: `${Math.max(0.5, health.trajectory.pctToGoal * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-dim">
                <span>
                  Treba{" "}
                  <span className="text-text">
                    {health.trajectory.clientsNeeded}
                  </span>{" "}
                  novih klijenata
                </span>
                <span>
                  ≈{" "}
                  <span className="text-text">
                    {health.trajectory.newClientsPerWeekRequired}
                  </span>{" "}
                  /tj
                </span>
                <span>
                  ≈{" "}
                  <span className="text-text">
                    {health.trajectory.paceRequired.discoveries}
                  </span>{" "}
                  discoveryja /tj
                </span>
                <span>
                  ≈{" "}
                  <span className="text-text">
                    {health.trajectory.paceRequired.outreach}
                  </span>{" "}
                  outreach /tj
                </span>
              </div>
            </div>

            {/* This week */}
            <div className="rounded-lg border border-border bg-bg-card/60 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  Ovaj tjedan vs pace
                </div>
                <div className="text-[11px] text-text-dim">
                  Streak{" "}
                  <span
                    className={
                      health.thisWeek.outreachStreakDays > 0
                        ? "text-gold font-semibold"
                        : "text-danger"
                    }
                  >
                    {health.thisWeek.outreachStreakDays}d
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <PaceTile
                  label="Outreach"
                  current={health.thisWeek.outreach}
                  goal={health.thisWeek.outreachGoal}
                />
                <PaceTile
                  label="Discoveries"
                  current={health.thisWeek.discoveries}
                  goal={health.thisWeek.discoveriesGoal}
                />
                <StatTile
                  label="Reply rate"
                  value={
                    health.thisWeek.outreach
                      ? `${(health.thisWeek.replyRate * 100).toFixed(1)}%`
                      : "—"
                  }
                  hint={`${health.thisWeek.replies} reply`}
                  accent={
                    health.thisWeek.replyRate >= 0.08 ? "success" : "warning"
                  }
                />
              </div>
            </div>

            {/* Top actions */}
            <div className="rounded-lg border border-border bg-bg-card/60 p-4">
              <div className="mb-3 text-[10px] uppercase tracking-wider text-text-muted">
                Top 3 akcije danas
              </div>
              {health.topActions.length === 0 ? (
                <div className="rounded border border-dashed border-border bg-bg-card/40 p-3 text-center text-xs text-text-muted">
                  Nema urgent-nih poteza. Ali to ne znači idle — pošalji 5
                  outreach.
                </div>
              ) : (
                <ul className="space-y-2">
                  {health.topActions.map((a, i) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 rounded border border-border bg-bg-card/40 p-2.5"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          a.priority >= 90
                            ? "bg-danger/20 text-danger"
                            : a.priority >= 70
                              ? "bg-gold/20 text-gold"
                              : "bg-bg-card/80 text-text-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-text-dim">
                          {a.reason}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Stuck deals */}
            {health.stuckDeals.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card/60 p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    Stuck deals
                  </div>
                  <div className="text-[11px] text-text-dim">
                    {health.stuckDeals.length} ukupno
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {health.stuckDeals.map((sd) => (
                    <li
                      key={sd.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge tone="danger">{sd.daysStuck}d</Badge>
                      <span className="font-medium text-text">{sd.name}</span>
                      <span className="text-[11px] text-text-dim">
                        {STAGE_LABEL[sd.stage] ?? sd.stage}
                      </span>
                      {sd.estimatedValue && sd.estimatedValue > 0 && (
                        <span className="ml-auto text-[11px] text-gold">
                          €{Math.round(sd.estimatedValue).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {tab === "funnel" && (
          <motion.div
            key="funnel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {health.funnel.map((step, i) => {
              const widthPct = Math.max(2, step.conversionFromTop * 100);
              const isLeak =
                step.conversionFromPrev != null &&
                step.conversionFromPrev < 0.05 &&
                i > 0 &&
                health.funnel[i - 1].count > 0;
              return (
                <div
                  key={step.key}
                  className="rounded-lg border border-border bg-bg-card/60 p-3"
                >
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {step.label}
                      </span>
                      {isLeak && <Badge tone="danger">LEAK</Badge>}
                    </div>
                    <div className="flex items-baseline gap-2 text-[11px]">
                      {step.conversionFromPrev != null && i > 0 && (
                        <span className="text-text-dim">
                          {(step.conversionFromPrev * 100).toFixed(1)}% ↓
                        </span>
                      )}
                      <span className="text-base font-semibold text-text">
                        {step.count}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg-card/80">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLeak ? "bg-danger/70" : "bg-gold/70"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="rounded border border-dashed border-border bg-bg-card/30 p-2 text-[11px] text-text-dim">
              Cold = leadovi u stage:discovery bez bookanog poziva.
              Stope su industrijski prosjek (8% reply, 50% reply→disc, 25%
              disc→close).
            </div>
          </motion.div>
        )}

        {tab === "reach" && (
          <motion.div
            key="reach"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <ChannelHero
              emoji="🎬"
              platformLabel="YouTube"
              view={youtube}
              defaultHandle="@LeonardoLamonOfficial"
              subsLabel="Subscribers"
              viewsLabel="Total views"
              videosLabel="Videos"
              refreshing={ytRefreshing}
              error={ytError}
              onRefresh={() => void refreshYoutube(true)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tiktok.map((entry, idx) => (
                <ChannelHero
                  key={entry.handle}
                  emoji="🎵"
                  platformLabel="TikTok"
                  view={entry.view}
                  defaultHandle={entry.handle}
                  subsLabel="Followers"
                  viewsLabel="Total likes"
                  videosLabel="Videos"
                  refreshing={ttRefreshing}
                  error={idx === 0 ? ttError : null}
                  onRefresh={() => void refreshTiktok(true)}
                  compact
                />
              ))}
            </div>
            <div className="rounded border border-dashed border-border bg-bg-card/30 p-2 text-[11px] text-text-dim">
              Brand reach radi auto u pozadini — to je marketing leverage,
              ne dnevni odlučujući signal. Health tab je tvoj jutarnji ekran.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaceTile({
  label,
  current,
  goal,
}: {
  label: string;
  current: number;
  goal: number;
}) {
  const pct = goal > 0 ? Math.min(1, current / goal) : 0;
  const accent: "success" | "gold" | "warning" | "danger" =
    pct >= 0.75
      ? "success"
      : pct >= 0.5
        ? "gold"
        : pct >= 0.25
          ? "warning"
          : "danger";
  const icon = pct >= 1 ? "✓" : pct >= 0.5 ? "→" : "✗";
  return (
    <StatTile
      label={label}
      value={`${current} / ${goal}`}
      hint={`${icon} ${(pct * 100).toFixed(0)}%`}
      accent={accent}
    />
  );
}

function ScoreRing({ score, pct }: { score: number; pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - pct * c;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle
        cx="36"
        cy="36"
        r={r}
        className="fill-none stroke-border"
        strokeWidth="6"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        className={`fill-none ${scoreRing(pct)} transition-all`}
        strokeWidth="6"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="42"
        textAnchor="middle"
        className={`fill-current text-base font-bold ${scoreColor(pct)}`}
      >
        {score}
      </text>
    </svg>
  );
}

function buildView(
  prev: ChannelStatsView,
  next: {
    handle: string | null;
    channel_id: string | null;
    subscribers: number;
    total_views: number;
    video_count: number;
    fetched_at: string;
  },
  platform: ChannelPlatform,
): ChannelStatsView {
  const newSnap = {
    id: crypto.randomUUID(),
    platform,
    handle: next.handle,
    channel_id: next.channel_id,
    subscribers: next.subscribers,
    total_views: next.total_views,
    video_count: next.video_count,
    fetched_at: next.fetched_at,
  };
  const prevSnap = prev.latest;
  const sub = (k: keyof typeof newSnap) =>
    prevSnap && newSnap[k] != null && prevSnap[k] != null
      ? (newSnap[k] as number) - (prevSnap[k] as number)
      : null;
  return {
    latest: newSnap,
    previous: prevSnap,
    deltaSubscribers: sub("subscribers"),
    deltaTotalViews: sub("total_views"),
    deltaVideoCount: sub("video_count"),
    deltaSinceDays: prevSnap
      ? Math.max(
          0,
          Math.round(
            (new Date(newSnap.fetched_at).getTime() -
              new Date(prevSnap.fetched_at).getTime()) /
              86_400_000,
          ),
        )
      : null,
  };
}

interface ChannelHeroProps {
  emoji: string;
  platformLabel: string;
  view: ChannelStatsView;
  defaultHandle: string;
  subsLabel: string;
  viewsLabel: string;
  videosLabel: string;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  compact?: boolean;
}

function ChannelHero({
  emoji,
  platformLabel,
  view,
  defaultHandle,
  subsLabel,
  viewsLabel,
  videosLabel,
  refreshing,
  error,
  onRefresh,
  compact,
}: ChannelHeroProps) {
  const latest = view.latest;
  return (
    <div
      className={
        "rounded-lg border border-border bg-bg-card/60 " +
        (compact ? "p-3" : "p-4")
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            {emoji} {platformLabel} · auto
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="truncate text-sm font-medium text-text">
              {latest?.handle ?? defaultHandle}
            </span>
            {latest?.fetched_at && (
              <span className="shrink-0 text-[10px] text-text-dim">
                {formatRelative(latest.fetched_at)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-text-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
          title="Force refresh"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Sync…" : "Sync"}
        </button>
      </div>
      {error && (
        <div className="mb-2 rounded border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] text-danger">
          {error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label={subsLabel}
          value={
            latest?.subscribers != null ? formatViews(latest.subscribers) : "—"
          }
          hint={
            view.deltaSubscribers != null && view.deltaSubscribers !== 0
              ? `${view.deltaSubscribers > 0 ? "+" : ""}${view.deltaSubscribers}${view.deltaSinceDays ? ` · ${view.deltaSinceDays}d` : ""}`
              : undefined
          }
          accent="gold"
        />
        <StatTile
          label={viewsLabel}
          value={
            latest?.total_views != null ? formatViews(latest.total_views) : "—"
          }
          hint={
            view.deltaTotalViews != null && view.deltaTotalViews !== 0
              ? `${view.deltaTotalViews > 0 ? "+" : ""}${formatViews(view.deltaTotalViews)}`
              : undefined
          }
        />
        <StatTile
          label={videosLabel}
          value={latest?.video_count?.toString() ?? "—"}
          hint={
            view.deltaVideoCount != null && view.deltaVideoCount !== 0
              ? `${view.deltaVideoCount > 0 ? "+" : ""}${view.deltaVideoCount}`
              : undefined
          }
        />
      </div>
    </div>
  );
}
