"use client";

/**
 * Niche Hunter — bi-weekly viral niche generator for SideHustle™
 * Skool members.
 *
 * Leonardo's standing promise to the community: every 2 weeks a NEW
 * viral niche drop. Manual previously meant Leonardo himself doomscrolling
 * YouTube guru content. This room (+ its Inngest cron — Phase 2)
 * automates the whole pipeline:
 *
 *   1. YT search top channels for "AI side hustle", "YouTube
 *      automation", "TikTok creativity", "viral niche 2026", etc.
 *   2. For top creators (Iman Gadzhi, Hamza Ahmed, Riley Brown,
 *      Steph Smith, etc.) fetch latest 3-5 videos from last 14 days
 *   3. Pull transcripts via YouTube Transcript API
 *   4. Claude analyzes — extracts EMERGING niches (mentioned by 3+
 *      gurus in the same window, not yet saturated on TT/Shorts)
 *   5. Generates Skool post draft with: niche name + why viral now +
 *      first-mover-advantage signal + 5 video idea hooks +
 *      monetization path (YT Shorts revenue, TT Creativity, affiliate)
 *   6. Drafts land in `niche_drops` table → Leonardo reviews → publish
 *
 * v1 (this file): scaffolding panel showing pipeline stages, latest
 * drop preview slot, manual "Generate now" button (returns coming soon).
 * v2: Inngest cron + YouTube API + transcript fetch + Claude extraction.
 * v3: auto-publish to Skool + content kalendar slotting.
 */

import { useState } from "react";
import {
  Compass,
  Calendar as CalendarIcon,
  TrendingUp,
  PlayCircle,
  Sparkles,
  Clock,
  ArrowRight,
} from "lucide-react";

interface PipelineStage {
  id: string;
  emoji: string;
  title: string;
  description: string;
  status: "soon" | "shipping" | "live";
}

const PIPELINE: PipelineStage[] = [
  {
    id: "guru-discovery",
    emoji: "🔍",
    title: "Guru Discovery",
    description:
      "YT search top kanale za 'AI side hustle', 'YouTube automation', 'TikTok creativity', 'viral niche 2026'. Identificira top 10-15 aktivnih kreatora.",
    status: "soon",
  },
  {
    id: "video-fetch",
    emoji: "📹",
    title: "Video Fetch",
    description:
      "Za svaki guru, vuče zadnjih 3-5 videa iz 14d window-a (uses YouTube Data API v3 + channel ID + uploadsPlaylist).",
    status: "soon",
  },
  {
    id: "transcript-pull",
    emoji: "📝",
    title: "Transcript Pull",
    description:
      "Pull transkripata kroz YouTube Transcript API (free, no key required). Multi-jezik fallback: en → hr → ru → de.",
    status: "soon",
  },
  {
    id: "niche-extraction",
    emoji: "💡",
    title: "Niche Extraction",
    description:
      "Claude analizira transkripte zajedno → extracts EMERGING niše (spomenute od 3+ gurua u istom 14d window-u, nisu yet saturated na TT/Shorts).",
    status: "soon",
  },
  {
    id: "post-draft",
    emoji: "✍",
    title: "Skool Post Draft",
    description:
      "Generates draft za Skool community post: niche name + zašto viral sad + first-mover-advantage signal + 5 video ideja + monetizacija (YT Shorts / TT Creativity / affiliate).",
    status: "soon",
  },
  {
    id: "review-publish",
    emoji: "🚀",
    title: "Review & Publish",
    description:
      "Drafts landaju u `niche_drops` table → Leonardo review → 1-click publish u Skool community feed (Phase 3).",
    status: "soon",
  },
];

interface SuggestedGuru {
  name: string;
  handle: string;
  niche: string;
  whyTrack: string;
}

const STARTER_GURUS: SuggestedGuru[] = [
  {
    name: "Iman Gadzhi",
    handle: "@ImanGadzhi",
    niche: "Agency / SMMA",
    whyTrack: "Mentions emerging niches every 2-4 weeks, large EU/Balkan audience overlap",
  },
  {
    name: "Hamza Ahmed",
    handle: "@adonisXfitness",
    niche: "Self-improvement + AI side hustles",
    whyTrack: "Cross-pollinates fitness + biz, strong faceless YT angles",
  },
  {
    name: "Riley Brown",
    handle: "@rileybrownai",
    niche: "AI tooling + content automation",
    whyTrack: "Catches new AI tool drops same week — ideal early signal",
  },
  {
    name: "Steph Smith",
    handle: "@stephsmithio",
    niche: "Trend research + niche analysis",
    whyTrack: "Literally publishes 'emerging trends' newsletter — pure signal",
  },
  {
    name: "Ali Abdaal",
    handle: "@AliAbdaal",
    niche: "Productive YouTube + productized education",
    whyTrack: "EU influence, monetization-focused",
  },
];

export function NicheHunterPanel() {
  const [showAddGuru, setShowAddGuru] = useState(false);

  // Hardcoded "next drop date" — bi-weekly from a fixed anchor (May 14).
  // v2 reads this from the Inngest cron schedule.
  const today = new Date("2026-05-14");
  const nextDrop = new Date("2026-05-28");
  const daysUntil = Math.ceil(
    (nextDrop.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-4">
      {/* ── Hero ── */}
      <div className="rounded-lg border border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 via-bg-card/60 to-bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-500/15">
            <Compass size={22} className="text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text">Niche Hunter</h3>
            <p className="mt-1 text-sm text-text-muted">
              Leonardov standing commit Skool community-ju:{" "}
              <strong className="text-emerald-300">
                svaka 2 tjedna novi viralni niche drop
              </strong>
              . Ovaj agent automatizira cijeli pipeline od guru-research-a do
              draft post-a.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                <CalendarIcon size={12} />
                Sljedeći drop: {nextDrop.toISOString().slice(0, 10)} (za{" "}
                {daysUntil} dana)
              </span>
              <span className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                <Clock size={12} />
                Cron: every 14 days · 02:00 Zagreb (Phase 2)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pipeline visualizer ── */}
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            <TrendingUp size={11} className="mr-1 inline" />
            Pipeline (6 stages)
          </h4>
          <span className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
            STATUS: SCAFFOLDING (Phase 1) · build u tijeku
          </span>
        </div>

        <div className="space-y-2">
          {PIPELINE.map((stage, i) => (
            <div
              key={stage.id}
              className="flex items-start gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-[10px] font-mono font-bold text-emerald-300">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">
                  {stage.emoji} {stage.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                  {stage.description}
                </p>
              </div>
              <span
                className={
                  "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider " +
                  (stage.status === "live"
                    ? "border-success/40 bg-success/10 text-success"
                    : stage.status === "shipping"
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                      : "border-stone-400/30 bg-stone-500/10 text-stone-300")
                }
              >
                {stage.status === "live"
                  ? "✅ live"
                  : stage.status === "shipping"
                    ? "⏳ shipping"
                    : "○ soon"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Guru watchlist ── */}
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            <PlayCircle size={11} className="mr-1 inline" />
            Starter guru watchlist (5 channels)
          </h4>
          <button
            onClick={() => setShowAddGuru((s) => !s)}
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20"
          >
            + Dodaj guru-a (Phase 2)
          </button>
        </div>

        <p className="mb-3 text-[11px] text-text-muted">
          Pre-seeded watchlist. Hunter cron skenira ove kanale svaka 2
          tjedna. Phase 2: dynamic discovery (search za nove kanale po
          keyword-u +&nbsp;cross-reference s view velocity).
        </p>

        <div className="space-y-1.5">
          {STARTER_GURUS.map((g) => (
            <a
              key={g.handle}
              href={`https://www.youtube.com/${g.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2 transition-colors hover:border-emerald-400/40"
            >
              <PlayCircle
                size={14}
                className="shrink-0 text-rose-400"
                strokeWidth={2.5}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{g.name}</p>
                <p className="text-[10px] font-mono text-text-dim">
                  {g.handle} · {g.niche}
                </p>
              </div>
              <p className="hidden max-w-xs text-[10px] italic text-text-muted sm:block">
                {g.whyTrack}
              </p>
              <ArrowRight size={12} className="shrink-0 text-text-dim" />
            </a>
          ))}
        </div>

        {showAddGuru && (
          <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-[11px] text-amber-200">
            ⚠ Manual guru add ships in Phase 2 zajedno s YouTube API
            integration. Trenutno: hardcoded watchlist u kodu — javi
            ako želiš dodati guru ili Slack-aj mi naziv kanala i ja
            dopišem u STARTER_GURUS array.
          </div>
        )}
      </div>

      {/* ── Latest drop preview slot ── */}
      <div className="rounded-lg border border-dashed border-border bg-bg-card/20 p-6 text-center">
        <Sparkles
          size={32}
          className="mx-auto mb-2 text-emerald-300/50"
          strokeWidth={1.5}
        />
        <p className="text-sm font-semibold text-text">
          Još nema niche drop-ova
        </p>
        <p className="mt-1 max-w-md mx-auto text-[11px] text-text-muted">
          Prvi automatski drop kreće{" "}
          <strong>2026-05-28</strong> kad Inngest cron stigne (Phase 2
          ship). Do tada: Leonardo manualno svake 2 tjedna, Hunter agent
          učio iz tih primjera.
        </p>
      </div>
    </div>
  );
}
