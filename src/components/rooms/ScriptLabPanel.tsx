"use client";

/**
 * Script Lab — surface for the weekly script generator output.
 *
 * Shows pending_review scripts at top, approved/shot/published below.
 * Each card: hook 3sec, slot label, target_platform, viral_prediction,
 * full script body (collapsed by default), borrowed_from refs.
 *
 * v1: reads from video_scripts table via server action. Approve/reject
 * actions ship in v1.1 (need the action server-side too).
 */

import { useEffect, useState } from "react";
import {
  Film,
  TrendingUp,
  Sparkles,
  PlayCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface VideoScript {
  id: string;
  cycle_id: string;
  target_platform: string;
  target_account: string | null;
  slot_label: string | null;
  title: string;
  hook_3sec: string;
  body_structure: string;
  full_script: string;
  cta: string;
  duration_estimate_sec: number | null;
  hashtags: string[];
  viral_prediction: number | null;
  conversion_prediction: number | null;
  rationale: string | null;
  status: "pending_review" | "approved" | "shot" | "published" | "rejected";
  created_at: string;
}

export function ScriptLabPanel() {
  const [scripts, setScripts] = useState<VideoScript[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/script-lab/list")
      .then((r) => r.json())
      .then((d) => setScripts(d.scripts ?? []))
      .catch(() => setScripts([]));
  }, []);

  if (scripts === null) {
    return (
      <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-xs text-text-muted">
        Učitavam Script Lab...
      </div>
    );
  }

  const byStatus = {
    pending: scripts.filter((s) => s.status === "pending_review"),
    approved: scripts.filter((s) => s.status === "approved"),
    shot: scripts.filter((s) => s.status === "shot"),
    published: scripts.filter((s) => s.status === "published"),
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-lg border border-violet-400/40 bg-gradient-to-br from-violet-500/10 via-bg-card/60 to-bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-violet-400/50 bg-violet-500/15">
            <Film size={22} className="text-violet-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text">Script Lab</h3>
            <p className="mt-1 text-sm text-text-muted">
              Tjedni AI video skripta generator. Cron svake nedjelje 22:00 UTC
              (= ponedjeljak 00:00 Zagreb). Pull-a top-10x performere iz
              video_intel + niche drops, generira 5-7 skripti za sljedeći
              tjedan po cadence (PON/UTO/SRI/ČET/PET).
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge color="amber">
                {byStatus.pending.length} pending review
              </Badge>
              <Badge color="emerald">{byStatus.approved.length} approved</Badge>
              <Badge color="sky">{byStatus.shot.length} shot</Badge>
              <Badge color="violet">{byStatus.published.length} published</Badge>
            </div>
          </div>
        </div>
      </div>

      {scripts.length === 0 && (
        <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
          Još nijedna skripta nije generirana. Sljedeći cron tick: nedjelja
          22:00 UTC (ili ručno triggeraj iz Inngest dashboard-a).
        </div>
      )}

      <div className="space-y-2">
        {scripts.map((s) => {
          const isOpen = expanded.has(s.id);
          return (
            <div
              key={s.id}
              className={
                "rounded-lg border p-3 transition-all " +
                statusBorder(s.status)
              }
            >
              <button
                onClick={() => {
                  const next = new Set(expanded);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  setExpanded(next);
                }}
                className="flex w-full items-start justify-between gap-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-violet-200">
                      {s.slot_label ?? s.target_platform}
                    </span>
                    {s.target_account && (
                      <span className="text-text-dim">{s.target_account}</span>
                    )}
                    {s.duration_estimate_sec && (
                      <span className="text-text-dim">
                        {s.duration_estimate_sec}s
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold text-text">{s.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs italic text-amber-200">
                    🎯 {s.hook_3sec}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase " +
                      statusBadge(s.status)
                    }
                  >
                    {s.status.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <Sparkles size={10} className="text-violet-300" />
                    <span className="font-mono text-violet-200">
                      v{s.viral_prediction?.toFixed(1) ?? "?"}
                    </span>
                    <TrendingUp size={10} className="text-emerald-300" />
                    <span className="font-mono text-emerald-200">
                      c{s.conversion_prediction?.toFixed(1) ?? "?"}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">
                      Body structure
                    </p>
                    <p className="font-mono text-amber-200">{s.body_structure}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">
                      Full script (voiceover)
                    </p>
                    <pre className="whitespace-pre-wrap rounded bg-bg-elevated/50 p-2 font-mono text-[11px] text-text">
                      {s.full_script}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">
                      CTA
                    </p>
                    <p className="text-text">{s.cta}</p>
                  </div>
                  {s.rationale && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">
                        Rationale
                      </p>
                      <p className="italic text-text-muted">{s.rationale}</p>
                    </div>
                  )}
                  {s.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.hashtags.map((h) => (
                        <span
                          key={h}
                          className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-200"
                        >
                          #{h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-md border border-${color}-400/40 bg-${color}-500/10 px-2.5 py-1 text-${color}-200`}
    >
      {children}
    </span>
  );
}

function statusBorder(s: string): string {
  switch (s) {
    case "pending_review":
      return "border-amber-400/40 bg-amber-500/5";
    case "approved":
      return "border-emerald-400/40 bg-emerald-500/5";
    case "shot":
      return "border-sky-400/40 bg-sky-500/5";
    case "published":
      return "border-violet-400/40 bg-violet-500/5";
    default:
      return "border-stone-400/30 bg-stone-500/5";
  }
}

function statusBadge(s: string): string {
  switch (s) {
    case "pending_review":
      return "bg-amber-500/20 text-amber-200";
    case "approved":
      return "bg-emerald-500/20 text-emerald-200";
    case "shot":
      return "bg-sky-500/20 text-sky-200";
    case "published":
      return "bg-violet-500/20 text-violet-200";
    default:
      return "bg-stone-500/20 text-stone-300";
  }
}
