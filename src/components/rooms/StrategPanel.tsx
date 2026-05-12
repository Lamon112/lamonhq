"use client";

/**
 * Strateg room — Intelligence Bay
 *
 * What it shows:
 *   - Sync now: manually trigger inbox poll
 *   - Latest auto-triaged inbound messages with category + 2 reply drafts
 *   - Top-3 objections this week (counted via category)
 *   - Sentiment per active lead (warming if interested/scheduling,
 *     cooling if not_now/objection in past 14d)
 *
 * Read-only analytics for now; reply approval flow lives in the
 * existing InboxTriage panel (Smart Inbox card on home page).
 */

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Inbox,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { manualPollMyInbox } from "@/app/actions/autoReply";
import type { InboundMessage, InboundCategory } from "@/app/actions/inbound";

const CATEGORY_META: Record<
  InboundCategory,
  { label: string; tone: string; bg: string; emoji: string; sentiment: "warm" | "neutral" | "cool" }
> = {
  interested: {
    label: "Interested",
    tone: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-400/40",
    emoji: "✨",
    sentiment: "warm",
  },
  scheduling: {
    label: "Scheduling",
    tone: "text-cyan-300",
    bg: "bg-cyan-500/10 border-cyan-400/40",
    emoji: "📅",
    sentiment: "warm",
  },
  question: {
    label: "Question",
    tone: "text-blue-300",
    bg: "bg-blue-500/10 border-blue-400/40",
    emoji: "❓",
    sentiment: "neutral",
  },
  objection: {
    label: "Objection",
    tone: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-400/40",
    emoji: "⚠️",
    sentiment: "cool",
  },
  not_now: {
    label: "Not now",
    tone: "text-stone-300",
    bg: "bg-stone-500/10 border-stone-400/40",
    emoji: "⏸",
    sentiment: "cool",
  },
  unsubscribe: {
    label: "Unsub",
    tone: "text-rose-300",
    bg: "bg-rose-500/10 border-rose-400/40",
    emoji: "🚫",
    sentiment: "cool",
  },
  out_of_office: {
    label: "OOO",
    tone: "text-text-muted",
    bg: "bg-stone-500/10 border-stone-400/40",
    emoji: "🏖",
    sentiment: "neutral",
  },
  unclear: {
    label: "Unclear",
    tone: "text-text-dim",
    bg: "bg-stone-500/10 border-stone-400/40",
    emoji: "🤷",
    sentiment: "neutral",
  },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `prije ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `prije ${h}h`;
  const days = Math.round(h / 24);
  if (days < 14) return `prije ${days}d`;
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

interface Props {
  initialInbound: InboundMessage[];
}

export function StrategPanel({ initialInbound }: Props) {
  const [inbound] = useState<InboundMessage[]>(initialInbound);
  const [pending, startTransition] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function syncNow() {
    setSyncMsg(null);
    startTransition(async () => {
      const res = await manualPollMyInbox();
      if (!res.ok) {
        setSyncMsg(`❌ ${res.error ?? "Greška"}`);
        return;
      }
      setSyncMsg(
        `✓ ${res.processed} provjereno · ${res.triaged} novih triaged · ${res.skipped} preskočeno`,
      );
      // Hard reload to pull fresh inbound list — could be optimized with a
      // server action returning the new rows, kept simple for v1.
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  // Top 3 objections this week (last 7d)
  const objectionsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return inbound.filter(
      (m) =>
        m.category === "objection" &&
        new Date(m.received_at).getTime() >= cutoff,
    );
  }, [inbound]);

  // Sentiment per lead — group by lead_id, label warm/cool/neutral based
  // on most recent inbound's category.
  const sentimentByLead = useMemo(() => {
    const byLead = new Map<string, InboundMessage>();
    for (const m of inbound) {
      if (!m.lead_id) continue;
      const existing = byLead.get(m.lead_id);
      if (
        !existing ||
        new Date(m.received_at).getTime() >
          new Date(existing.received_at).getTime()
      ) {
        byLead.set(m.lead_id, m);
      }
    }
    return Array.from(byLead.values())
      .sort(
        (a, b) =>
          new Date(b.received_at).getTime() -
          new Date(a.received_at).getTime(),
      )
      .slice(0, 10);
  }, [inbound]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header + Sync ── */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-violet-300">
            Reply Analyst · {inbound.length} u arhivi
          </h3>
          <p className="text-xs text-text-muted">
            Auto-poller čita Gmail svakih 5 min · klikni Sync now za ručno
          </p>
          {syncMsg && (
            <p className="mt-1 text-[11px] text-cyan-300">{syncMsg}</p>
          )}
        </div>
        <button
          type="button"
          onClick={syncNow}
          disabled={pending}
          className={
            "flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all " +
            (pending
              ? "cursor-wait border-violet-400/30 bg-violet-500/5 text-violet-300/60"
              : "border-violet-400/40 bg-violet-500/10 text-violet-200 hover:border-violet-400/70 hover:bg-violet-500/20")
          }
        >
          {pending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {pending ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {/* ── Quick stats ── */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300">
            Warming up
          </div>
          <div className="text-2xl font-semibold text-emerald-200">
            {
              sentimentByLead.filter(
                (m) =>
                  m.category && CATEGORY_META[m.category].sentiment === "warm",
              ).length
            }
          </div>
          <div className="text-[10px] text-text-dim">lead-ova</div>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-amber-300">
            Objections (7d)
          </div>
          <div className="text-2xl font-semibold text-amber-200">
            {objectionsThisWeek.length}
          </div>
          <div className="text-[10px] text-text-dim">treba handled</div>
        </div>
        <div className="rounded-lg border border-stone-400/30 bg-stone-500/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-stone-300">
            Cooling
          </div>
          <div className="text-2xl font-semibold text-stone-200">
            {
              sentimentByLead.filter(
                (m) =>
                  m.category && CATEGORY_META[m.category].sentiment === "cool",
              ).length
            }
          </div>
          <div className="text-[10px] text-text-dim">not now / unsub</div>
        </div>
      </div>

      {/* ── Recent inbound list ── */}
      <div className="flex-1 space-y-2 overflow-y-auto pb-4">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Najnoviji odgovori (auto-triaged)
        </p>
        {inbound.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-card/40 px-6 py-8 text-center">
            <Inbox size={20} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text">Još nema inbound odgovora.</p>
            <p className="mt-1 text-xs text-text-muted">
              Auto-poller će ovdje surfacati svaki put kad klinika odgovori
              na cold outreach. Sync now za ručno triggeranje.
            </p>
          </div>
        ) : (
          inbound.slice(0, 30).map((m) => {
            const meta = m.category
              ? CATEGORY_META[m.category]
              : CATEGORY_META.unclear;
            const isExpanded = expandedId === m.id;
            return (
              <div
                key={m.id}
                className={
                  "overflow-hidden rounded-lg border bg-bg-card/60 transition-all hover:border-border-strong " +
                  (isExpanded ? "border-violet-400/40" : "border-border")
                }
              >
                <button
                  onClick={() =>
                    setExpandedId((id) => (id === m.id ? null : m.id))
                  }
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                >
                  <span
                    className={
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border " +
                      meta.bg
                    }
                  >
                    <span className="text-base">{meta.emoji}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text">
                        {m.sender_name ?? "?"}
                      </p>
                      <span
                        className={
                          "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                          meta.bg +
                          " " +
                          meta.tone
                        }
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {m.summary ?? m.raw_text.slice(0, 100)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[10px] text-text-dim">
                      {formatWhen(m.received_at)}
                    </span>
                    {m.reply_drafts && m.reply_drafts.length > 0 && (
                      <span className="font-mono text-[9px] uppercase text-violet-300">
                        {m.reply_drafts.length} draft
                        {m.reply_drafts.length === 1 ? "" : "ova"}
                      </span>
                    )}
                  </div>
                  <span className="ml-1 mt-0.5 shrink-0 text-text-dim">
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-border/50 bg-bg-elevated/30 px-3 py-3">
                        {/* Raw inbound */}
                        <div>
                          <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted">
                            Njihova poruka
                          </p>
                          <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-bg-card/60 px-3 py-2 font-mono text-xs leading-relaxed text-text-dim">
                            {m.raw_text.slice(0, 1500)}
                          </pre>
                        </div>

                        {/* Reply drafts */}
                        {m.reply_drafts && m.reply_drafts.length > 0 && (
                          <div>
                            <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-violet-300">
                              2 AI draft replyja
                            </p>
                            <div className="space-y-2">
                              {m.reply_drafts.map((d, i) => (
                                <div
                                  key={i}
                                  className="rounded-md border border-violet-400/20 bg-violet-500/5 px-3 py-2"
                                >
                                  <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-violet-300">
                                    Angle: {d.angle}
                                  </p>
                                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text">
                                    {d.text}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.reasoning && (
                          <p className="text-[10px] italic text-text-dim">
                            <span className="font-mono uppercase text-text-muted">
                              Reasoning:
                            </span>{" "}
                            {m.reasoning}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
