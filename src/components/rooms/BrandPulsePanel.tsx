"use client";

/**
 * Brand Pulse — per-client social media tracker.
 *
 * For each ACTIVE client, surface:
 *   - Current snapshot per platform (followers, views, posts count, last post)
 *   - WoW delta (deltas calculated from snapshots stored in client.notes
 *     JSON field — manual entry for MVP, automated API pull later)
 *   - Comment sentiment summary (paste comments → AI returns sentiment +
 *     action items)
 *   - "Next move" recommendations (AI based on delta + sentiment)
 *
 * For Phase 1 the room is a paste-and-analyze tool — Leonardo manually
 * pastes follower counts / a few comments / recent post URLs, hits
 * "Analyze", gets a structured analysis back. Later: hook to IG Graph
 * + TikTok + YouTube APIs for automated snapshots.
 */

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AtSign, // IG icon stand-in
  Music2, // TikTok
  Play, // YouTube icon stand-in
  Users as Facebook, // FB icon stand-in (lucide-react doesn't ship Facebook)
  Loader2,
} from "lucide-react";
import type { ClientRow } from "@/lib/queries";

interface Props {
  initialClients: ClientRow[];
}

type Platform = "instagram" | "tiktok" | "youtube" | "facebook";

interface PlatformSnapshot {
  platform: Platform;
  handle?: string;
  followers?: number;
  followersDelta?: number; // 7d delta
  views?: number; // last 7d views/impressions
  viewsDelta?: number;
  postsCount?: number;
  lastPostAt?: string;
  topComment?: { text: string; sentiment: "positive" | "neutral" | "negative" };
}

interface ClientPulse {
  clientId: string;
  clientName: string;
  snapshots: PlatformSnapshot[];
  /** Free-form comment block — Leonardo pastes recent comments for analysis. */
  recentComments?: string;
  /** AI-generated analysis + recommendations from last analyze run. */
  analysis?: {
    headline: string;
    trend: "up" | "flat" | "down";
    actionItems: string[];
    sentimentSummary: string;
    generatedAt: string;
  };
}

const PLATFORM_META: Record<
  Platform,
  { label: string; Icon: typeof AtSign; tone: string; bg: string }
> = {
  instagram: {
    label: "Instagram",
    Icon: AtSign,
    tone: "text-pink-300",
    bg: "border-pink-400/40 bg-pink-500/10",
  },
  tiktok: {
    label: "TikTok",
    Icon: Music2,
    tone: "text-fuchsia-300",
    bg: "border-fuchsia-400/40 bg-fuchsia-500/10",
  },
  youtube: {
    label: "YouTube",
    Icon: Play,
    tone: "text-red-300",
    bg: "border-red-400/40 bg-red-500/10",
  },
  facebook: {
    label: "Facebook",
    Icon: Facebook,
    tone: "text-blue-300",
    bg: "border-blue-400/40 bg-blue-500/10",
  },
};

function formatNumber(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

function DeltaPill({ delta }: { delta: number | undefined }) {
  if (delta == null) return <span className="text-text-dim">—</span>;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color =
    delta > 0
      ? "text-emerald-300"
      : delta < 0
        ? "text-rose-300"
        : "text-text-muted";
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={"flex items-center gap-0.5 " + color}>
      <Icon size={10} />
      <span className="font-mono text-[10px]">
        {sign}
        {formatNumber(Math.abs(delta))}
      </span>
    </span>
  );
}

export function BrandPulsePanel({ initialClients }: Props) {
  // Filter to active clients only
  const activeClients = useMemo(
    () => initialClients.filter((c) => c.status === "active"),
    [initialClients],
  );

  // For Phase 1, mock snapshots are derived from client.notes — Leonardo
  // pastes JSON or plain text. Later: load from a `client_social_snapshots`
  // table populated by Inngest cron + social APIs.
  //
  // For now, just present the active clients with empty/placeholder
  // snapshots and a "Snimi snapshot" CTA that opens a paste form.
  const pulses: ClientPulse[] = useMemo(
    () =>
      activeClients.map((c) => ({
        clientId: c.id,
        clientName: c.name,
        snapshots: [],
      })),
    [activeClients],
  );

  const [expandedId, setExpandedId] = useState<string | null>(
    pulses[0]?.clientId ?? null,
  );

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-cyan-300">
            Brand Pulse · {activeClients.length} aktivn
            {activeClients.length === 1 ? "i klijent" : "ih klijenata"}
          </h3>
          <p className="text-xs text-text-muted">
            Praćenje IG/TT/YT po klijentu · weekly delta · AI savjeti za sljedeći potez
          </p>
        </div>
      </div>

      {/* ── Active clients ── */}
      {pulses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-card/40 px-6 py-8 text-center text-sm">
          <p className="mb-2 text-text">
            Još nema aktivnih klijenata.
          </p>
          <p className="text-xs text-text-muted">
            Kad onboardaš prvog klijenta, ovdje će automatski stići karta s
            social tracking-om.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pulses.map((p) => (
            <ClientPulseCard
              key={p.clientId}
              pulse={p}
              expanded={expandedId === p.clientId}
              onToggle={() =>
                setExpandedId((id) => (id === p.clientId ? null : p.clientId))
              }
            />
          ))}
        </div>
      )}

      {/* Future hookup note */}
      <p className="mt-4 text-[10px] text-text-dim">
        v1: paste-and-analyze (manual). v2: auto-snapshots svakih 24h kroz IG
        Graph + TikTok + YouTube API → Inngest cron.
      </p>
    </div>
  );
}

function ClientPulseCard({
  pulse,
  expanded,
  onToggle,
}: {
  pulse: ClientPulse;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [pasted, setPasted] = useState("");
  const [analysis, setAnalysis] = useState<ClientPulse["analysis"]>();
  const [pending, startTransition] = useTransition();

  function analyze() {
    // For now, stub a synthetic analysis from the pasted text using
    // simple heuristics. Later: server action that calls Anthropic with
    // the full snapshot + comments and returns structured recommendations.
    startTransition(async () => {
      // Quick sentiment heuristic
      const lower = pasted.toLowerCase();
      const positiveWords = [
        "super",
        "odlič",
        "fant",
        "❤",
        "🔥",
        "love",
        "amazing",
        "preporu",
        "bravo",
        "👏",
        "hvala",
      ];
      const negativeWords = [
        "nikad",
        "nemoj",
        "razočar",
        "loše",
        "ne preporu",
        "👎",
        "fuj",
        "spam",
      ];
      const posCount = positiveWords.filter((w) => lower.includes(w)).length;
      const negCount = negativeWords.filter((w) => lower.includes(w)).length;
      const sentiment: "positive" | "neutral" | "negative" =
        posCount > negCount + 1
          ? "positive"
          : negCount > posCount
            ? "negative"
            : "neutral";

      const headline =
        sentiment === "positive"
          ? "Zajednica reagira pozitivno — kapitaliziraj momentum"
          : sentiment === "negative"
            ? "Postoji friction u komentarima — adresiraj proaktivno"
            : "Neutralan engagement — treba pojačati hook";

      const trend: "up" | "flat" | "down" =
        sentiment === "positive" ? "up" : sentiment === "negative" ? "down" : "flat";

      const actionItems =
        sentiment === "positive"
          ? [
              "Reply na top 3-5 pozitivna komentara unutar 24h da povećaš retention",
              "Repurpose najuspješniji post u 2-3 platforme (IG → TT short, YT short)",
              "Pin top komentar — social proof na novim posjetiteljima",
            ]
          : sentiment === "negative"
            ? [
                "Identificiraj specifičan friction (cijena? kvaliteta? servis?)",
                "Reply na negativan komentar empatski u 6h, ne defenzivno",
                "Sljedeći post = direktan answer na top zabrinutost (transparency wins)",
              ]
            : [
                "A/B test 2 hook varijante u sljedeća 2 posta (curiosity vs benefit)",
                "Povećaj CTA klikabilnost — 1 jasna akcija po postu, ne 3",
                "Story poll na top friction tema da ekstraktiraš signal",
              ];

      const result = {
        headline,
        trend,
        actionItems,
        sentimentSummary: `Sentiment heuristika: ${posCount} pozitivnih signala, ${negCount} negativnih. Procjena: ${sentiment}.`,
        generatedAt: new Date().toISOString(),
      };
      setAnalysis(result);
    });
  }

  return (
    <div
      className={
        "overflow-hidden rounded-lg border bg-bg-card/60 transition-all " +
        (expanded
          ? "border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          : "border-border hover:border-border-strong")
      }
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-500/10 text-cyan-200">
          <TrendingUp size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {pulse.clientName}
          </p>
          <p className="truncate text-[11px] text-text-muted">
            {pulse.snapshots.length > 0
              ? `${pulse.snapshots.length} platformi · zadnji snapshot`
              : "Nema snapshota — paste-aj komentare za analizu"}
          </p>
        </div>
        <span className="text-text-dim">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-cyan-400/20 px-4 py-3">
              {/* Platform snapshots grid (placeholder for now) */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["instagram", "tiktok", "youtube", "facebook"] as Platform[]).map(
                  (p) => {
                    const meta = PLATFORM_META[p];
                    const Icon = meta.Icon;
                    const snap = pulse.snapshots.find((s) => s.platform === p);
                    return (
                      <div
                        key={p}
                        className={"rounded-md border px-2 py-1.5 " + meta.bg}
                      >
                        <div className="flex items-center gap-1">
                          <Icon size={10} className={meta.tone} />
                          <span
                            className={
                              "font-mono text-[9px] uppercase tracking-wider " +
                              meta.tone
                            }
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="font-mono text-sm font-bold text-text">
                            {formatNumber(snap?.followers)}
                          </span>
                          <DeltaPill delta={snap?.followersDelta} />
                        </div>
                        <div className="font-mono text-[9px] text-text-dim">
                          followers
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Paste-and-analyze block */}
              <div>
                <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                  Paste recent comments (svi platformi)
                </label>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={4}
                  placeholder="Paste 10-20 najnovijih komentara iz IG/TT/YT — AI će napraviti sentiment analizu + 3 next-move savjeta."
                  className="w-full rounded-md border border-cyan-400/30 bg-bg-elevated/60 px-3 py-2 font-mono text-xs text-text placeholder:text-text-dim focus:border-cyan-400/70 focus:outline-none"
                />
                <button
                  onClick={analyze}
                  disabled={pending || !pasted.trim()}
                  className="mt-2 flex items-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {pending ? "Analiziram..." : "Analiziraj sentiment + next move"}
                </button>
              </div>

              {/* Analysis result */}
              {analysis && (
                <div className="rounded-md border border-cyan-400/30 bg-cyan-500/5 px-3 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                        (analysis.trend === "up"
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                          : analysis.trend === "down"
                            ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
                            : "border-amber-400/50 bg-amber-500/15 text-amber-200")
                      }
                    >
                      {analysis.trend === "up"
                        ? "▲ momentum"
                        : analysis.trend === "down"
                          ? "▼ friction"
                          : "→ neutralno"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-cyan-100">
                    {analysis.headline}
                  </p>
                  <p className="mt-1 text-[11px] text-text-dim">
                    {analysis.sentimentSummary}
                  </p>
                  <p className="mb-1 mt-2 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                    Next moves
                  </p>
                  <ol className="space-y-1">
                    {analysis.actionItems.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-text"
                      >
                        <span className="mt-px font-mono font-bold text-cyan-400">
                          {i + 1}.
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-1 text-[9px] text-text-dim">
                    Generirano{" "}
                    {new Date(analysis.generatedAt).toLocaleString("hr-HR")}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
