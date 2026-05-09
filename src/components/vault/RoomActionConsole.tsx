"use client";

/**
 * Modal that opens when a vault room is clicked. Shows:
 *   - List of available AI actions for this room (from agentActions catalog)
 *   - Past action runs (latest 10) with status pills + click-to-view
 *   - Click an action → triggers triggerAgentResearch server action which
 *     enqueues Inngest job; modal closes, room enters RESEARCHING mode
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import { Loader2, X, ExternalLink, CheckCircle2, AlertCircle, Hourglass } from "lucide-react";
import type { Agent } from "@/lib/vault";
import { getActionsForRoom, type AgentActionDef } from "@/lib/agentActions";
import {
  listRoomActions,
  triggerAgentResearch,
} from "@/app/actions/agentResearch";

interface RoomActionConsoleProps {
  agent: Agent | null;
  onClose: () => void;
  onActionStarted: (actionRowId: string, agentId: Agent["id"]) => void;
  onViewResult: (actionRowId: string) => void;
}

interface PastAction {
  id: string;
  action_type: string;
  title: string;
  status: string;
  progress_text: string | null;
  summary: string | null;
  notion_page_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export function RoomActionConsole({
  agent,
  onClose,
  onActionStarted,
  onViewResult,
}: RoomActionConsoleProps) {
  return (
    <AnimatePresence>
      {agent && (
        <ConsoleInner
          agent={agent}
          onClose={onClose}
          onActionStarted={onActionStarted}
          onViewResult={onViewResult}
        />
      )}
    </AnimatePresence>
  );
}

function ConsoleInner({
  agent,
  onClose,
  onActionStarted,
  onViewResult,
}: {
  agent: Agent;
  onClose: () => void;
  onActionStarted: (actionRowId: string, agentId: Agent["id"]) => void;
  onViewResult: (actionRowId: string) => void;
}) {
  const actions = getActionsForRoom(agent.id);
  const [past, setPast] = useState<PastAction[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Re-fetch when the modal is opened for a different room.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPast(true);
    listRoomActions(agent.id, 10).then((res) => {
      if (!alive) return;
      if (res.ok) setPast(res.rows as PastAction[]);
      setLoadingPast(false);
    });
    return () => {
      alive = false;
    };
  }, [agent.id]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function fire(action: AgentActionDef) {
    if (pendingId) return;
    setPendingId(action.id);
    setError(null);
    startTransition(async () => {
      const res = await triggerAgentResearch(action.id);
      setPendingId(null);
      if (!res.ok || !res.actionRowId) {
        setError(res.error ?? "Pokretanje akcije nije uspjelo.");
        return;
      }
      onActionStarted(res.actionRowId, agent.id);
      onClose();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />

      {/* Slide-up console */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t-2 border-amber-500/40 bg-bg-elevated/98 backdrop-blur-xl shadow-[0_-12px_60px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border-strong bg-bg-elevated/95 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-current bg-black/40 text-2xl">
              {agent.emoji}
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                Vault Console — {agent.name}
              </div>
              <h2 className="text-base font-semibold text-text">
                {agent.room}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md border border-border bg-bg-card p-1.5 text-text-muted hover:border-gold/50 hover:text-text"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-4xl px-4 py-5 space-y-6">
          {/* Action list */}
          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              ▾ Dostupne akcije
            </h3>
            {actions.length === 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                <p className="text-sm text-amber-200">
                  Akcije za {agent.name} stižu u sljedećoj fazi.
                </p>
                <p className="mt-1 text-[11px] text-text-muted">
                  Phase 1 ships only Nova akcije. Stay tuned.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {actions.map((a) => {
                  const Icon = a.icon;
                  const isPending = pendingId === a.id;
                  return (
                    <button
                      key={a.id}
                      disabled={!!pendingId}
                      onClick={() => fire(a)}
                      className={
                        "group relative flex flex-col gap-2 rounded-md border p-3 text-left transition-colors " +
                        (isPending
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-border bg-bg-card hover:border-gold/60 hover:bg-bg-card/80") +
                        (pendingId && !isPending ? " opacity-40" : "")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300">
                          {isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Icon size={14} />
                          )}
                        </div>
                        <span className="text-sm font-medium text-text">
                          {a.title}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-text-dim">
                        {a.description}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <Hourglass size={10} />
                        <span>~{Math.round(a.estimatedSec / 60)} min · max 5 web pretraga</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {error && (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-danger">
                <AlertCircle size={11} /> {error}
              </p>
            )}
          </section>

          {/* Past actions */}
          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              ▾ Povijest istraživanja
            </h3>
            {loadingPast ? (
              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : past.length === 0 ? (
              <p className="text-[11px] text-text-muted">
                Još nema pokrenute akcije za ovu sobu.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {past.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => onViewResult(p.id)}
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-bg-card p-2.5 text-left transition-colors hover:border-gold/40"
                    >
                      <StatusPill status={p.status} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-text">
                          {p.title}
                        </div>
                        <div className="truncate text-[10px] text-text-muted">
                          {p.summary ?? p.progress_text ?? p.action_type}
                        </div>
                      </div>
                      <div className="text-[10px] text-text-muted whitespace-nowrap">
                        {timeAgo(p.created_at)}
                      </div>
                      {p.notion_page_id && (
                        <a
                          href={`https://www.notion.so/${p.notion_page_id.replace(/-/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded p-1 text-text-muted hover:text-text"
                          title="Open in Notion"
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </motion.div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
        <CheckCircle2 size={9} /> done
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
        <Loader2 size={9} className="animate-spin" /> live
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-300">
        <AlertCircle size={9} /> fail
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded border border-stone-600 bg-stone-800/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-stone-400">
      <Hourglass size={9} /> queued
    </span>
  );
}

function timeAgo(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return `${Math.floor(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
