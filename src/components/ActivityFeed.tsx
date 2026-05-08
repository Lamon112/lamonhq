"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import {
  Activity,
  X,
  Send,
  UserPlus,
  Target,
  CalendarCheck,
  Trophy,
  FileText,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getRecentActivity, type ActivityRow } from "@/app/actions/activityLog";
import { formatEuro } from "@/lib/format";

const FILTERS = [
  { id: "all", label: "Sve", room: null },
  { id: "outreach", label: "Outreach", room: "outreach" },
  { id: "lead_scorer", label: "Leads", room: "lead_scorer" },
  { id: "discovery", label: "Discovery", room: "discovery" },
  { id: "closing", label: "Closing", room: "closing" },
  { id: "clients", label: "Klijenti", room: "clients" },
  { id: "reports", label: "Reports", room: "reports" },
] as const;

const ICON_FOR_ACTION: Record<
  string,
  { icon: React.ComponentType<{ size?: number }>; tone: string }
> = {
  outreach_sent: { icon: Send, tone: "text-gold" },
  client_added: { icon: UserPlus, tone: "text-success" },
  lead_scored: { icon: Target, tone: "text-blue-400" },
  discovery_booked: { icon: CalendarCheck, tone: "text-purple-400" },
  calendly_booking_created: { icon: CalendarCheck, tone: "text-purple-400" },
  calendly_booking_canceled: { icon: CalendarCheck, tone: "text-text-muted" },
  deal_won: { icon: Trophy, tone: "text-warning" },
  report_sent: { icon: FileText, tone: "text-cyan-400" },
  task_done: { icon: Sparkles, tone: "text-success" },
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "upravo";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

function rowTitle(row: ActivityRow): string {
  if (row.metadata?.title) return row.metadata.title;
  // Calendly fallback
  const m = row.metadata as Record<string, unknown> | null;
  if (row.action === "calendly_booking_created" && m) {
    return `Discovery booked: ${m.invitee ?? m.email ?? "?"}`;
  }
  if (row.action === "calendly_booking_canceled" && m) {
    return `Discovery canceled: ${m.invitee ?? m.email ?? "?"}`;
  }
  return row.action.replace(/_/g, " ");
}

function rowSummary(row: ActivityRow): string | null {
  if (row.metadata?.summary) return row.metadata.summary;
  const m = row.metadata as Record<string, unknown> | null;
  if (m?.event_name) return String(m.event_name);
  if (m?.reason) return String(m.reason);
  return null;
}

export function ActivityFeed({
  initialRows,
}: {
  initialRows: ActivityRow[];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const fresh = await getRecentActivity(40);
      setRows(fresh);
    });
  }

  useEffect(() => {
    if (!open) return;
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [open]);

  const filtered =
    filter === "all"
      ? rows
      : rows.filter((r) => {
          const f = FILTERS.find((x) => x.id === filter);
          return f && r.room === f.room;
        });

  const newCount = rows.filter((r) => {
    const sec = (Date.now() - new Date(r.created_at).getTime()) / 1000;
    return sec < 60 * 60 * 24; // < 24h
  }).length;

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-bg-elevated/90 text-gold shadow-lg backdrop-blur-md hover:border-gold/70 hover:bg-gold/10"
        aria-label="Activity Feed"
      >
        <Activity size={18} />
        {newCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-bg bg-gold px-1 text-[10px] font-bold text-bg"
          >
            {newCount > 99 ? "99+" : newCount}
          </motion.span>
        )}
      </motion.button>

      {/* Slide-out drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l border-border-strong bg-bg-elevated/98 backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-border-strong px-4 py-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-gold" />
                  <h3 className="text-sm font-semibold text-text">
                    Activity Feed
                  </h3>
                  <span className="text-[10px] text-text-muted">
                    · {rows.length} eventa
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={refresh}
                    disabled={pending}
                    className="rounded-md p-1.5 text-text-muted hover:bg-bg-card hover:text-text disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw
                      size={14}
                      className={pending ? "animate-spin" : ""}
                    />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-bg-card hover:text-text"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-border-strong px-3 py-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={
                      "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors " +
                      (filter === f.id
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-border bg-bg-card/60 text-text-muted hover:border-border-strong hover:text-text-dim")
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2">
                {filtered.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div className="text-xs text-text-muted">
                      Još nema eventa za ovaj filter.
                      <br />
                      Pokreni outreach ili dodaj lead 👇
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {filtered.map((row, i) => {
                      const config = ICON_FOR_ACTION[row.action] ?? {
                        icon: Sparkles,
                        tone: "text-text-muted",
                      };
                      const Icon = config.icon;
                      const summary = rowSummary(row);
                      const amount = row.metadata?.amountEur;
                      return (
                        <motion.li
                          key={row.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          className="rounded-lg border border-border bg-bg-card/40 px-3 py-2 hover:border-gold/30"
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-bg/40 ${config.tone}`}
                            >
                              <Icon size={12} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="truncate text-xs font-medium text-text">
                                  {rowTitle(row)}
                                </p>
                                <span className="shrink-0 text-[10px] text-text-muted">
                                  {timeAgo(row.created_at)}
                                </span>
                              </div>
                              {summary && (
                                <p className="mt-0.5 truncate text-[11px] text-text-dim">
                                  {summary}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-1.5">
                                {row.room && (
                                  <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted">
                                    {row.room}
                                  </span>
                                )}
                                {typeof amount === "number" && amount > 0 && (
                                  <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                                    {formatEuro(amount * 100, {
                                      compact: true,
                                    })}
                                  </span>
                                )}
                                {row.metadata?.tags?.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] text-text-muted"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="border-t border-border-strong px-3 py-2 text-center text-[10px] text-text-muted">
                Auto-refresh svakih 20s · zadnjih {rows.length} eventa
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
