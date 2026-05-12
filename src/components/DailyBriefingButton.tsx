"use client";

/**
 * Compact Daily Briefing trigger — lives inline in ResourceBar.
 *
 * Renders as a small tile that fits beside the other stat tiles. Shows
 * a sun icon, "Briefing" label, and a "N/M done" badge. Click → opens a
 * popover with the full briefing (greeting, top actions, motivational
 * hook). Replaces the old full-width DailyBriefing section that took up
 * a whole row above the HQ viewport.
 *
 * State + actions logic mirrored from DailyBriefing.tsx (kept that file
 * for backwards compat if anything else imports it).
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition, useEffect, useRef } from "react";
import {
  Sun,
  Sparkles,
  ChevronUp,
  Check,
  Circle,
  Loader2,
  RotateCw,
  X,
} from "lucide-react";
import {
  generateBriefing,
  toggleBriefingAction,
  type BriefingAction,
  type DailyBriefing as Briefing,
} from "@/app/actions/briefing";
import type { RoomId } from "@/lib/rooms";

export function DailyBriefingButton({
  initialBriefing,
}: {
  initialBriefing: Briefing | null;
}) {
  const [briefing, setBriefing] = useState<Briefing | null>(initialBriefing);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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
    setOpen(false);
  }

  const completed = briefing
    ? briefing.top_actions.filter((a) => a.done).length
    : 0;
  const total = briefing ? briefing.top_actions.length : 0;
  const allDone = completed === total && total > 0;

  // Empty state — render compact "Generiraj" button
  if (!briefing) {
    return (
      <div className="relative">
        <button
          onClick={regenerate}
          disabled={pending}
          className="flex min-w-[140px] flex-1 items-center gap-3 rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-bg-card/60 px-3 py-2 transition-colors hover:border-purple-500/50 disabled:opacity-50"
          title="Generiraj današnji briefing"
        >
          <span className="text-xl">
            {pending ? (
              <Loader2 size={20} className="animate-spin text-purple-300" />
            ) : (
              <Sun size={20} className="text-gold" />
            )}
          </span>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              Briefing
            </div>
            <div className="text-sm font-semibold text-text">
              {pending ? "Generiram…" : "Generiraj"}
            </div>
            <div className="text-[10px] text-text-dim">još nema današnji</div>
          </div>
        </button>
        {error && (
          <div className="absolute right-0 top-full mt-1 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[10px] text-danger">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className={
          "flex min-w-[140px] flex-1 items-center gap-3 rounded-lg border px-3 py-2 transition-colors " +
          (allDone
            ? "border-success/40 bg-success/5 hover:border-success/60"
            : "border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-bg-card/60 hover:border-purple-500/50")
        }
        title={briefing.greeting ?? "Daily Briefing"}
      >
        <span className="text-xl">
          {allDone ? "🎉" : <Sun size={20} className="text-gold" />}
        </span>
        <div className="leading-tight text-left">
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            Briefing
          </div>
          <div className="text-base font-semibold text-text">
            {completed}/{total}{" "}
            <span className="text-[10px] font-normal text-text-dim">done</span>
          </div>
          <div className="text-[10px] text-text-dim">klik za detalje</div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-purple-500/30 bg-bg-elevated/95 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-cyan-500/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <Sun size={14} className="text-gold" />
                <span className="text-xs font-semibold text-text">
                  Daily Briefing
                </span>
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                  {completed}/{total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    regenerate();
                  }}
                  disabled={pending}
                  className="rounded-md p-1.5 text-text-muted hover:bg-bg-card hover:text-text disabled:opacity-50"
                  title="Regenerate"
                  type="button"
                >
                  {pending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCw size={12} />
                  )}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-text-muted hover:bg-bg-card hover:text-text"
                  type="button"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-3 py-3">
              {briefing.greeting && (
                <p className="text-xs text-text-dim">{briefing.greeting}</p>
              )}
              {briefing.context_summary && (
                <p className="text-[11px] text-text-dim">
                  {briefing.context_summary}
                </p>
              )}

              <ol className="space-y-1.5">
                {briefing.top_actions.map((action, i) => (
                  <li
                    key={i}
                    className={
                      "flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-all " +
                      (action.done
                        ? "border-success/20 bg-success/5 opacity-60"
                        : "border-border bg-bg-card/40")
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
                          size={14}
                          className="rounded-full bg-success/20 p-0.5 text-success"
                        />
                      ) : (
                        <Circle size={14} className="text-text-muted" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gold">
                          #{i + 1}
                        </span>
                        <span
                          className={
                            "text-xs " +
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
                            className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted hover:border-gold/40 hover:text-gold"
                            type="button"
                          >
                            → {action.room}
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-text-dim">
                        {action.why}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {briefing.motivational_hook && (
                <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1.5 text-[11px] italic text-cyan-300">
                  💪 {briefing.motivational_hook}
                </div>
              )}

              <div className="text-[9px] text-text-muted">
                Generirano{" "}
                {new Date(briefing.generated_at).toLocaleString("hr-HR")}
                {" · "}
                Sljedeći cron 07:00
              </div>
            </div>

            {error && (
              <div className="border-t border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {allDone && (
        <ChevronUp className="absolute right-2 top-2 h-3 w-3 text-success/60" />
      )}
    </div>
  );
}
