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

import { useState, useEffect, useTransition } from "react";
import {
  Compass,
  Calendar as CalendarIcon,
  TrendingUp,
  PlayCircle,
  Sparkles,
  Clock,
  ArrowRight,
  Zap,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface NicheDrop {
  id: string;
  cycle_id: string;
  niche_name: string;
  niche_slug: string;
  why_viral_now: string;
  first_mover_signal: string | null;
  saturation_score: number | null;
  source_gurus: Array<{ name?: string; video_id?: string; url?: string; views?: number }>;
  source_video_count: number;
  hook_lines: string[];
  monetization_paths: string[];
  draft_skool_post: string;
  status: "pending_review" | "approved" | "published" | "rejected";
  generation_cost_usd: number;
  created_at: string;
}

interface NicheRun {
  id: string;
  cycle_id: string;
  started_at: string;
  finished_at: string | null;
  gurus_scanned: number;
  videos_fetched: number;
  transcripts_pulled: number;
  niches_extracted: number;
  total_cost_usd: number;
  status: "running" | "success" | "partial" | "failed";
}

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
  platform: "YouTube" | "Instagram";
  url: string;
  niche: string;
  whyTrack: string;
}

/*
 * Curated DEEP-DIVER guru list per Leonardov feedback 2026-05-14.
 * Previous list (Iman Gadzhi, Hamza Ahmed, Riley Brown, Steph Smith,
 * Ali Abdaal) was rejected as "generic mainstream" — not the audience
 * we need for SideHustle™ Balkan content. These are YouTube channel-
 * flipping / faceless YT business / AI content automation specialists
 * with smaller but tighter audiences (2-100K range), often from EU /
 * DACH region — perfect overlap with Balkan side-hustle audience.
 */
const STARTER_GURUS: SuggestedGuru[] = [
  {
    name: "Carl Faceless",
    handle: "Carl Faceless",
    platform: "YouTube",
    url: "https://www.youtube.com/channel/UC1MCxPRYsKGd30E3xHMHWwA",
    niche: "Faceless YouTube channels / AI content automation",
    whyTrack:
      "Direct overlap s tvojom audience-om — faceless YT je #1 ask u tvojim DM-ovima. Drops new niche videos weekly.",
  },
  {
    name: "Razvan Paraschiv",
    handle: "Razvan Paraschiv",
    platform: "YouTube",
    url: "https://www.youtube.com/channel/UCH7DG6XLOmhqZ5P0XUIU24g",
    niche: "YouTube biznis deep-dive · 76.5K subs",
    whyTrack:
      "EU/RO scena, deeper analiza monetizacije i niche-discovery method-a. Manji audience = svaki post ima više detalja.",
  },
  {
    name: "Steffen Miro Extended",
    handle: "Steffen Miro Extended",
    platform: "YouTube",
    url: "https://www.youtube.com/channel/UCp6SQfLshj-4NaykhtAF0sA",
    niche: "Channel-flipping / niche testing · 2.58K subs",
    whyTrack:
      "Small but specialized — često prikazuje konkretne niche testove i revenue breakdownove koje veliki kanali skrivaju.",
  },
  {
    name: "Tim Danilov Biz",
    handle: "@timdanilovhi",
    platform: "YouTube",
    url: "https://www.youtube.com/@timdanilovhi",
    niche: "YouTube biznis / channel-flipping (DE/RU)",
    whyTrack:
      "DACH / Eastern Europe audience — overlap s Balkan dijasporom. Pokriva niche-testing + channel sale flips.",
  },
  {
    name: "adav1a",
    handle: "@adav1a",
    platform: "Instagram",
    url: "https://www.instagram.com/adav1a/",
    niche: "YT biznis insights (IG short-form)",
    whyTrack:
      "Reference iz Leonardove curated liste — IG short-form format daje brze signale o novim niche-evima.",
  },
  {
    name: "shindy.mp4",
    handle: "@shindy.mp4",
    platform: "Instagram",
    url: "https://www.instagram.com/shindy.mp4/",
    niche: "AI content + YT automation",
    whyTrack:
      "Reference iz Leonardove curated liste — kreativan IG handle (.mp4) sugerira video-first content creator.",
  },
];

export function NicheHunterPanel() {
  const [showAddGuru, setShowAddGuru] = useState(false);
  const [drops, setDrops] = useState<NicheDrop[]>([]);
  const [runs, setRuns] = useState<NicheRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function refresh() {
    try {
      const r = await fetch("/api/niche-hunter/list");
      const d = await r.json();
      setDrops(d.drops ?? []);
      setRuns(d.runs ?? []);
    } catch (e) {
      console.warn("[niche-hunter] load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // Auto-refresh every 30s while a run is in progress
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  function triggerRunNow() {
    setTriggerStatus("Pokrećem...");
    startTransition(async () => {
      try {
        const r = await fetch("/api/niche-hunter/trigger", { method: "POST" });
        const d = await r.json();
        if (d.ok) {
          setTriggerStatus(`✓ Pokrenuto (event ${d.eventId?.slice(0, 8) ?? "?"}). Rezultat ~2 min.`);
          refresh();
        } else {
          setTriggerStatus(`✗ ${d.error ?? "trigger failed"}`);
        }
      } catch (e) {
        setTriggerStatus(`✗ ${e instanceof Error ? e.message : "failed"}`);
      }
    });
  }

  const today = new Date("2026-05-14");
  const nextDrop = new Date("2026-05-28");
  const daysUntil = Math.ceil(
    (nextDrop.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const latestRun = runs[0] ?? null;
  const isRunning = latestRun?.status === "running";

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
                Cron: every 14 days · 02:00 Zagreb
              </span>
              <button
                onClick={triggerRunNow}
                disabled={isPending || isRunning}
                className="ml-auto flex items-center gap-1.5 rounded-md border-2 border-amber-400/50 bg-amber-500/20 px-3 py-1 font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
              >
                {isPending || isRunning ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Zap size={12} />
                )}
                {isRunning ? "Pokrenut..." : "Run NOW"}
              </button>
            </div>
            {triggerStatus && (
              <p className="mt-2 text-[11px] text-amber-200/80">{triggerStatus}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Live niche drops ── */}
      {loading ? (
        <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
          Učitavam niche drops...
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              <Sparkles size={11} className="mr-1 inline" />
              Aktualne niše · {drops.length} {drops.length === 1 ? "drop" : "dropova"}
            </h4>
            {latestRun && (
              <span className="text-[10px] text-text-muted">
                Last run: {latestRun.transcripts_pulled}/{latestRun.videos_fetched} transkripata · ${latestRun.total_cost_usd?.toFixed(3) ?? "0.000"}
              </span>
            )}
          </div>
          {drops.length === 0 ? (
            <div className="rounded border border-dashed border-emerald-400/30 bg-bg-card/40 p-4 text-center text-xs text-text-muted">
              Još nijedna niše nije generirana. Klikni{" "}
              <strong className="text-amber-300">Run NOW</strong> da pokreneš
              prvi ciklus (~2 min).
            </div>
          ) : (
            <div className="space-y-2">
              {drops.map((d) => {
                const isOpen = expanded.has(d.id);
                return (
                  <div
                    key={d.id}
                    className="rounded-md border border-border bg-bg-card/50 p-3"
                  >
                    <button
                      onClick={() => {
                        const next = new Set(expanded);
                        if (next.has(d.id)) next.delete(d.id);
                        else next.add(d.id);
                        setExpanded(next);
                      }}
                      className="flex w-full items-start justify-between gap-2 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text">{d.niche_name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] italic text-text-muted">
                          {d.why_viral_now}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[10px]">
                        <span
                          className={
                            "rounded px-1.5 py-0.5 font-bold " +
                            ((d.saturation_score ?? 5) <= 3
                              ? "bg-emerald-500/20 text-emerald-200"
                              : (d.saturation_score ?? 5) <= 6
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-rose-500/20 text-rose-200")
                          }
                        >
                          sat {d.saturation_score ?? "?"}/10
                        </span>
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-200">
                          {d.status}
                        </span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                        {d.first_mover_signal && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-text-muted">
                              First-mover signal
                            </p>
                            <p className="text-emerald-200">{d.first_mover_signal}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-text-muted">
                            Hook ideje (HR)
                          </p>
                          <ul className="ml-3 list-disc text-text">
                            {(d.hook_lines ?? []).map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-text-muted">
                            Monetizacija
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(d.monetization_paths ?? []).map((m) => (
                              <span
                                key={m}
                                className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-200"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-text-muted">
                            Skool post draft
                          </p>
                          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded bg-bg-elevated/50 p-2 font-mono text-[11px] text-text">
                            {d.draft_skool_post}
                          </pre>
                        </div>
                        {d.source_gurus?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-text-muted">
                              Source videa ({d.source_gurus.length})
                            </p>
                            <ul className="space-y-0.5 text-[11px]">
                              {d.source_gurus.map((s, i) => (
                                <li key={i}>
                                  {s.url ? (
                                    <a
                                      href={s.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sky-300 hover:underline"
                                    >
                                      {s.name} · {s.views?.toLocaleString() ?? "?"} views
                                    </a>
                                  ) : (
                                    <span>{s.name}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
            Curated deep-diver watchlist (6 channels · YT + IG)
          </h4>
          <button
            onClick={() => setShowAddGuru((s) => !s)}
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20"
          >
            + Dodaj guru-a (Phase 2)
          </button>
        </div>

        <p className="mb-3 text-[11px] text-text-muted">
          Pre-seeded curated lista — DEEP-DIVERI o YT biznisu, channel-
          flipping, AI content automation. <strong>Ne mainstream</strong>
          (Iman/Hamza/MrBeast tipa) — manje subscribera ali tighter signal
          + više konkretnih taktika koje overlap-aju s Balkan side-hustle
          audience-om. Phase 2: dynamic discovery proširuje listu kroz
          subscriptions graph i sličan-creator cross-reference.
        </p>

        <div className="space-y-1.5">
          {STARTER_GURUS.map((g) => (
            <a
              key={g.url}
              href={g.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2 transition-colors hover:border-emerald-400/40"
            >
              <span
                className={
                  "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider " +
                  (g.platform === "YouTube"
                    ? "border border-rose-400/40 bg-rose-500/10 text-rose-300"
                    : "border border-pink-400/40 bg-pink-500/10 text-pink-300")
                }
              >
                {g.platform === "YouTube" ? "YT" : "IG"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{g.name}</p>
                <p className="text-[10px] font-mono text-text-dim">
                  {g.niche}
                </p>
              </div>
              <p className="hidden max-w-xs text-[10px] italic text-text-muted lg:block">
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
