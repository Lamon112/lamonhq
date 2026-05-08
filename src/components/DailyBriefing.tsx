"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  Sun,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Circle,
  Loader2,
  RotateCw,
} from "lucide-react";
import {
  generateBriefing,
  toggleBriefingAction,
  type BriefingAction,
  type DailyBriefing as Briefing,
} from "@/app/actions/briefing";
import type { RoomId } from "@/lib/rooms";

export function DailyBriefing({
  initialBriefing,
}: {
  initialBriefing: Briefing | null;
}) {
  const [briefing, setBriefing] = useState<Briefing | null>(initialBriefing);
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateBriefing();
      if (!res.ok || !res.briefing) {
        setError(res.error ?? "Greška pri generiranju");
        return;
      }
      setBriefing(res.briefing);
    });
  }

  function toggle(index: number) {
    if (!briefing) return;
    const updatedActions = [...briefing.top_actions];
    updatedActions[index] = {
      ...updatedActions[index],
      done: !updatedActions[index].done,
    };
    setBriefing({ ...briefing, top_actions: updatedActions });
    startTransition(async () => {
      await toggleBriefingAction(briefing.id, index);
    });
  }

  function openRoom(action: BriefingAction) {
    if (!action.room) return;
    const roomMap: Record<string, RoomId> = {
      outreach: "outreach",
      lead_scorer: "lead_scorer",
      clients: "clients",
      discovery: "discovery",
      closing: "closing",
      reports: "reports",
      tasks: "calendar",
      content: "analytics",
      analytics: "analytics",
      competitor: "competitor",
      calendar: "calendar",
    };
    const roomId = roomMap[action.room];
    if (!roomId) return;
    window.dispatchEvent(
      new CustomEvent("hq:open-room", { detail: { roomId } }),
    );
  }

  if (!briefing) {
    return (
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-4 max-w-7xl px-4 lg:px-8"
      >
        <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/5 via-bg-elevated to-cyan-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Sun size={18} className="text-gold" />
            <div>
              <div className="text-sm font-semibold text-text">
                Daily Briefing
              </div>
              <div className="text-[11px] text-text-muted">
                Još nema današnjeg briefing-a — generiraj ga sad ili pričekaj
                jutarnji cron (07:00).
              </div>
            </div>
          </div>
          <button
            onClick={regenerate}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:border-purple-500/70 hover:bg-purple-500/20 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {pending ? "Generiram…" : "Generiraj briefing"}
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
      </motion.section>
    );
  }

  const completed = briefing.top_actions.filter((a) => a.done).length;
  const total = briefing.top_actions.length;
  const allDone = completed === total && total > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mb-4 max-w-7xl px-4 lg:px-8"
    >
      <div className="overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-bg-elevated/80 to-cyan-500/5 backdrop-blur">
        <button
          onClick={() => setOpen((s) => !s)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 bg-gold/10">
              <Sun size={16} className="text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  Daily Briefing
                </span>
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                  {completed}/{total} done
                </span>
                {allDone && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success"
                  >
                    🎉 Day cleared
                  </motion.span>
                )}
              </div>
              {briefing.greeting && (
                <p className="mt-0.5 truncate text-[12px] text-text-dim">
                  {briefing.greeting}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                regenerate();
              }}
              disabled={pending}
              className="rounded-md p-1.5 text-text-muted hover:bg-bg-card hover:text-text disabled:opacity-50"
              title="Regenerate"
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCw size={14} />
              )}
            </button>
            {open ? (
              <ChevronUp size={16} className="text-text-muted" />
            ) : (
              <ChevronDown size={16} className="text-text-muted" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-purple-500/20 px-4 py-3">
                {briefing.context_summary && (
                  <p className="text-xs text-text-dim">
                    {briefing.context_summary}
                  </p>
                )}

                <ol className="space-y-1.5">
                  {briefing.top_actions.map((action, i) => (
                    <li
                      key={i}
                      className={
                        "flex items-start gap-3 rounded-lg border px-3 py-2 transition-all " +
                        (action.done
                          ? "border-success/20 bg-success/5 opacity-60"
                          : "border-border bg-bg-card/40 hover:border-purple-500/40")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        className="mt-0.5 shrink-0"
                        aria-label={action.done ? "Mark undone" : "Mark done"}
                      >
                        {action.done ? (
                          <Check
                            size={16}
                            className="rounded-full bg-success/20 p-0.5 text-success"
                          />
                        ) : (
                          <Circle size={16} className="text-text-muted" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gold">
                            #{i + 1}
                          </span>
                          <span
                            className={
                              "text-sm " +
                              (action.done
                                ? "line-through text-text-muted"
                                : "font-medium text-text")
                            }
                          >
                            {action.title}
                          </span>
                          {action.room && (
                            <button
                              onClick={() => openRoom(action)}
                              className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted transition-colors hover:border-gold/40 hover:text-gold"
                              type="button"
                            >
                              → {action.room}
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-text-dim">
                          {action.why}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                {briefing.motivational_hook && (
                  <div className="mt-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs italic text-cyan-300">
                    💪 {briefing.motivational_hook}
                  </div>
                )}

                <div className="text-[10px] text-text-muted">
                  Generirano {new Date(briefing.generated_at).toLocaleString("hr-HR")}
                  {" · "}
                  Sljedeći auto-briefing 07:00 sutra
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
    </motion.section>
  );
}
