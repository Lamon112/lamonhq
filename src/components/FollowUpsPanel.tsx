"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  MessageCircleHeart,
  Send,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Save,
} from "lucide-react";
import {
  generateFollowUps,
  sendFollowUp,
  dismissFollowUp,
  type PendingDraft,
} from "@/app/actions/followUps";

const STAGE_LABEL: Record<string, string> = {
  discovery: "Discovery",
  pricing: "Pricing",
  financing: "Financing",
  booking: "Booking",
};

export function FollowUpsPanel({
  initialDrafts,
}: {
  initialDrafts: PendingDraft[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [open, setOpen] = useState(initialDrafts.length > 0);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateFollowUps();
      if (!res.ok) setError(res.error ?? "Greška pri generiranju");
      // Force a refresh by reloading; the server action revalidatePath
      // already invalidated, but we need fresh client state.
      window.location.reload();
    });
  }

  function startEdit(d: PendingDraft) {
    setEditing(d.id);
    setEditText(d.draft_text);
  }

  function cancelEdit() {
    setEditing(null);
    setEditText("");
  }

  function saveEdit() {
    if (!editing) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === editing ? { ...d, draft_text: editText } : d,
      ),
    );
    setEditing(null);
  }

  function send(d: PendingDraft) {
    setError(null);
    setBusyId(d.id);
    const text =
      editing === d.id ? editText : d.draft_text;
    startTransition(async () => {
      const res = await sendFollowUp(d.id, text);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error ?? "Greška pri slanju");
        return;
      }
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
      setEditing(null);
    });
  }

  function skip(d: PendingDraft) {
    setBusyId(d.id);
    startTransition(async () => {
      await dismissFollowUp(d.id);
      setBusyId(null);
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
    });
  }

  if (drafts.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-4 max-w-7xl px-4 lg:px-8"
      >
        <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 via-bg-elevated to-purple-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <MessageCircleHeart size={18} className="text-cyan-400" />
            <div>
              <div className="text-sm font-semibold text-text">
                Auto Follow-ups
              </div>
              <div className="text-[11px] text-text-muted">
                Nema tihih leadova trenutno. Cron radi sutra u 06:30 — generira
                drafte za sve koji nisu touched 4+ dana.
              </div>
            </div>
          </div>
          <button
            onClick={regenerate}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-500/70 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {pending ? "Generiram…" : "Generiraj sad"}
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

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mb-4 max-w-7xl px-4 lg:px-8"
    >
      <div className="overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-bg-elevated/80 to-purple-500/5 backdrop-blur">
        <button
          onClick={() => setOpen((s) => !s)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10">
              <MessageCircleHeart size={16} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  Auto Follow-ups
                </span>
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                  {drafts.length} ready
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-text-dim">
                AI je pripremio nudge poruke za leadove tihe 4+ dana — review &
                send u 1 klik.
              </p>
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
                <Sparkles size={14} />
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
              <ul className="space-y-2 border-t border-cyan-500/20 px-4 py-3">
                {drafts.map((d) => {
                  const ctx = d.context_payload ?? {};
                  const stage = ctx.stage ?? "?";
                  const isEditing = editing === d.id;
                  const busy = busyId === d.id;
                  return (
                    <motion.li
                      key={d.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="rounded-lg border border-border bg-bg-card/40 p-3 hover:border-cyan-500/40"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text">
                          {ctx.leadName ?? "?"}
                        </span>
                        <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted">
                          {STAGE_LABEL[stage] ?? stage}
                        </span>
                        {typeof ctx.score === "number" && (
                          <span className="rounded border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] font-medium text-gold">
                            ICP {ctx.score}/20
                          </span>
                        )}
                        {typeof ctx.daysSilent === "number" && (
                          <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                            {ctx.daysSilent}d silent
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={5}
                          className="input mb-2 text-xs"
                          autoFocus
                        />
                      ) : (
                        <pre className="mb-2 whitespace-pre-wrap rounded-md border border-border bg-bg/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-text">
                          {d.draft_text}
                        </pre>
                      )}

                      {d.reasoning && !isEditing && (
                        <div className="mb-2 text-[10px] italic text-text-dim">
                          💡 {d.reasoning}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={cancelEdit}
                              className="rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-muted hover:border-border-strong hover:text-text-dim"
                              type="button"
                              disabled={busy}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEdit}
                              className="flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/10 px-2 py-1 text-[11px] text-purple-300 hover:border-purple-500/70"
                              type="button"
                            >
                              <Save size={10} />
                              Save edit
                            </button>
                            <button
                              onClick={() => send(d)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1 text-[11px] font-medium text-success hover:border-success/70 disabled:opacity-50"
                              type="button"
                            >
                              {busy ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Send size={10} />
                              )}
                              Send edited
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => skip(d)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-muted hover:border-border-strong hover:text-text-dim disabled:opacity-50"
                              type="button"
                            >
                              <X size={10} />
                              Skip
                            </button>
                            <button
                              onClick={() => startEdit(d)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-dim hover:border-purple-500/40 hover:text-purple-300 disabled:opacity-50"
                              type="button"
                            >
                              <Pencil size={10} />
                              Edit
                            </button>
                            <button
                              onClick={() => send(d)}
                              disabled={busy}
                              className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1 text-[11px] font-medium text-success hover:border-success/70 disabled:opacity-50"
                              type="button"
                            >
                              {busy ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Send size={10} />
                              )}
                              Send
                            </button>
                          </>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="border-t border-cyan-500/20 px-4 py-2 text-[10px] text-text-muted">
                Auto-cron 06:30 svako jutro · Send odmah upisuje outreach + bumpaj
                touchpoint + +5 XP.
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
