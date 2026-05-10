"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  Inbox,
  Send,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Plus,
  Save,
  Tag,
} from "lucide-react";
import {
  triageInbound,
  replyToInbound,
  dismissInbound,
  searchLeads,
  type InboundMessage,
  type InboundChannel,
  type InboundCategory,
} from "@/app/actions/inbound";

const CATEGORY_STYLE: Record<
  InboundCategory,
  { label: string; tone: string; bg: string; border: string }
> = {
  interested: {
    label: "Interested",
    tone: "text-success",
    bg: "bg-success/10",
    border: "border-success/40",
  },
  scheduling: {
    label: "Scheduling",
    tone: "text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
  },
  question: {
    label: "Question",
    tone: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/40",
  },
  objection: {
    label: "Objection",
    tone: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/40",
  },
  not_now: {
    label: "Not now",
    tone: "text-text-muted",
    bg: "bg-bg-card/60",
    border: "border-border",
  },
  unsubscribe: {
    label: "Unsubscribe",
    tone: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/40",
  },
  out_of_office: {
    label: "OOO",
    tone: "text-text-muted",
    bg: "bg-bg-card/60",
    border: "border-border",
  },
  unclear: {
    label: "Unclear",
    tone: "text-text-dim",
    bg: "bg-bg-card/60",
    border: "border-border",
  },
};

const CHANNELS: { id: InboundChannel; label: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "email", label: "Email" },
  { id: "tiktok", label: "TikTok" },
  { id: "manual", label: "Other" },
];

export function InboxTriage({
  initialMessages,
}: {
  initialMessages: InboundMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [open, setOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [pasteChannel, setPasteChannel] = useState<InboundChannel>("linkedin");
  const [pasteSender, setPasteSender] = useState("");
  const [pasteLeadId, setPasteLeadId] = useState<string | null>(null);
  const [pasteLeadName, setPasteLeadName] = useState("");
  const [leadResults, setLeadResults] = useState<
    Array<{ id: string; name: string; stage: string | null }>
  >([]);

  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedDraftIdx, setSelectedDraftIdx] = useState<
    Record<string, number>
  >({});
  const [applyStage, setApplyStage] = useState<Record<string, boolean>>({});

  function pickDraft(msgId: string, idx: number) {
    setSelectedDraftIdx((prev) => ({ ...prev, [msgId]: idx }));
    setEditingId(null);
  }

  function startEdit(msg: InboundMessage) {
    const idx = selectedDraftIdx[msg.id] ?? 0;
    setEditingId(msg.id);
    setEditText(msg.reply_drafts[idx]?.text ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function searchLeadsDebounced(q: string) {
    setPasteLeadName(q);
    if (!q.trim()) {
      setLeadResults([]);
      setPasteLeadId(null);
      return;
    }
    startTransition(async () => {
      const r = await searchLeads(q);
      setLeadResults(r);
    });
  }

  function pickLead(id: string, name: string) {
    setPasteLeadId(id);
    setPasteLeadName(name);
    setLeadResults([]);
  }

  function submitTriage() {
    setError(null);
    if (!pasteText.trim()) {
      setError("Poruka je prazna");
      return;
    }
    startTransition(async () => {
      const res = await triageInbound({
        rawText: pasteText,
        channel: pasteChannel,
        senderName: pasteSender.trim() || undefined,
        leadId: pasteLeadId ?? undefined,
      });
      if (!res.ok || !res.message) {
        setError(res.error ?? "Triage greška");
        return;
      }
      setMessages((prev) => [res.message!, ...prev]);
      setPasteOpen(false);
      setOpen(true);
      setPasteText("");
      setPasteSender("");
      setPasteLeadId(null);
      setPasteLeadName("");
      setLeadResults([]);
    });
  }

  function send(msg: InboundMessage) {
    setError(null);
    setBusyId(msg.id);
    const idx = selectedDraftIdx[msg.id] ?? 0;
    const text =
      editingId === msg.id ? editText : msg.reply_drafts[idx]?.text ?? "";
    if (!text.trim()) {
      setError("Reply je prazan");
      setBusyId(null);
      return;
    }
    startTransition(async () => {
      const res = await replyToInbound(
        msg.id,
        text,
        applyStage[msg.id] ?? false,
      );
      setBusyId(null);
      if (!res.ok) {
        setError(res.error ?? "Greška pri slanju");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      setEditingId(null);
    });
  }

  function dismiss(msg: InboundMessage) {
    setBusyId(msg.id);
    startTransition(async () => {
      await dismissInbound(msg.id);
      setBusyId(null);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="hq-classic-only mx-auto mb-4 max-w-7xl px-4 lg:px-8"
    >
      <div className="overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-bg-elevated/80 to-purple-500/5 backdrop-blur">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((s) => !s)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((s) => !s);
            }
          }}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-400/10">
              <Inbox size={16} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  Smart Inbox
                </span>
                {messages.length > 0 ? (
                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                    {messages.length} new
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted">
                    inbox clear
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[12px] text-text-dim">
                Paste-aj odgovor → AI klasificira + generira 2 reply drafta →
                pošalji u 1 klik.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPasteOpen(true);
                setOpen(true);
              }}
              className="flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300 hover:border-blue-500/70"
            >
              <Plus size={11} />
              Triage new
            </button>
            {open ? (
              <ChevronUp size={16} className="text-text-muted" />
            ) : (
              <ChevronDown size={16} className="text-text-muted" />
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-blue-500/20 px-4 py-3">
                {pasteOpen && (
                  <div className="space-y-2 rounded-lg border border-blue-500/40 bg-blue-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-300">
                        New inbound message
                      </span>
                      <button
                        type="button"
                        onClick={() => setPasteOpen(false)}
                        className="text-text-muted hover:text-text"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      rows={4}
                      placeholder="Paste-aj inbound poruku ovdje…"
                      className="input text-xs"
                      autoFocus
                    />
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-text-muted">
                          Channel
                        </label>
                        <select
                          value={pasteChannel}
                          onChange={(e) =>
                            setPasteChannel(e.target.value as InboundChannel)
                          }
                          className="input mt-0.5 text-xs"
                        >
                          {CHANNELS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-text-muted">
                          Sender (optional)
                        </label>
                        <input
                          value={pasteSender}
                          onChange={(e) => setPasteSender(e.target.value)}
                          placeholder="dr. Marko Marčelić"
                          className="input mt-0.5 text-xs"
                        />
                      </div>
                      <div className="relative">
                        <label className="text-[9px] uppercase tracking-wider text-text-muted">
                          Match lead (optional)
                        </label>
                        <input
                          value={pasteLeadName}
                          onChange={(e) => searchLeadsDebounced(e.target.value)}
                          placeholder="Pretraži lead-ove…"
                          className="input mt-0.5 text-xs"
                        />
                        {leadResults.length > 0 && !pasteLeadId && (
                          <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-xl">
                            {leadResults.map((l) => (
                              <li key={l.id}>
                                <button
                                  type="button"
                                  onClick={() => pickLead(l.id, l.name)}
                                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-bg-card"
                                >
                                  <span className="text-text">{l.name}</span>
                                  {l.stage && (
                                    <span className="rounded border border-border bg-bg/60 px-1 py-0.5 text-[9px] uppercase text-text-muted">
                                      {l.stage}
                                    </span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {pasteLeadId && (
                          <span className="mt-1 inline-block rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-[9px] text-success">
                            ✓ matched
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPasteOpen(false)}
                        className="rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-muted hover:text-text-dim"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitTriage}
                        disabled={pending}
                        className="flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-300 hover:border-blue-500/70 disabled:opacity-50"
                      >
                        {pending ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Sparkles size={11} />
                        )}
                        {pending ? "AI Triage…" : "Triage"}
                      </button>
                    </div>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
                    Inbox prazan. Klikni <strong>Triage new</strong> kad ti
                    stigne odgovor na outreach.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {messages.map((msg) => {
                      const cat = msg.category ?? "unclear";
                      const style = CATEGORY_STYLE[cat];
                      const idx = selectedDraftIdx[msg.id] ?? 0;
                      const isEditing = editingId === msg.id;
                      const busy = busyId === msg.id;
                      return (
                        <motion.li
                          key={msg.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="rounded-lg border border-border bg-bg-card/40 p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border ${style.border} ${style.bg} px-2 py-0.5 text-[10px] font-bold uppercase ${style.tone}`}
                            >
                              {style.label}
                            </span>
                            <span className="text-sm font-semibold text-text">
                              {msg.sender_name ?? "?"}
                            </span>
                            <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted">
                              {msg.channel}
                            </span>
                            {msg.suggested_stage && (
                              <span className="flex items-center gap-1 rounded border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-300">
                                <Tag size={9} />
                                → {msg.suggested_stage}
                              </span>
                            )}
                          </div>

                          {msg.summary && (
                            <p className="mb-2 text-[11px] italic text-text-dim">
                              📩 {msg.summary}
                            </p>
                          )}

                          <pre className="mb-2 whitespace-pre-wrap rounded-md border border-border bg-bg/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-text-muted">
                            {msg.raw_text}
                          </pre>

                          <div className="mb-2 flex flex-wrap gap-1">
                            {msg.reply_drafts.map((d, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => pickDraft(msg.id, i)}
                                className={
                                  "rounded-full border px-2 py-0.5 text-[10px] transition-colors " +
                                  (idx === i
                                    ? "border-purple-500/60 bg-purple-500/15 text-purple-300"
                                    : "border-border bg-bg-card/60 text-text-muted hover:text-text")
                                }
                              >
                                {d.angle}
                              </button>
                            ))}
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
                            <pre className="mb-2 whitespace-pre-wrap rounded-md border border-purple-500/30 bg-purple-500/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-text">
                              {msg.reply_drafts[idx]?.text ?? "(no draft)"}
                            </pre>
                          )}

                          {msg.reasoning && !isEditing && (
                            <p className="mb-2 text-[10px] italic text-text-dim">
                              💡 {msg.reasoning}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {msg.suggested_stage && msg.lead_id && (
                              <label className="flex items-center gap-1.5 text-[10px] text-text-dim">
                                <input
                                  type="checkbox"
                                  checked={applyStage[msg.id] ?? false}
                                  onChange={(e) =>
                                    setApplyStage((prev) => ({
                                      ...prev,
                                      [msg.id]: e.target.checked,
                                    }))
                                  }
                                  className="accent-purple-500"
                                />
                                Apply stage:{" "}
                                <strong className="text-purple-300">
                                  {msg.suggested_stage}
                                </strong>
                              </label>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={busy}
                                    className="rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-muted hover:text-text-dim"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => send(msg)}
                                    disabled={busy}
                                    className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1 text-[11px] font-medium text-success hover:border-success/70 disabled:opacity-50"
                                  >
                                    {busy ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Send size={10} />
                                    )}
                                    Send edited
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => dismiss(msg)}
                                    disabled={busy}
                                    className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-muted hover:text-text-dim disabled:opacity-50"
                                  >
                                    <X size={10} />
                                    Skip
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(msg)}
                                    disabled={busy}
                                    className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-[11px] text-text-dim hover:border-purple-500/40 hover:text-purple-300 disabled:opacity-50"
                                  >
                                    <Pencil size={10} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => send(msg)}
                                    disabled={busy || cat === "unsubscribe"}
                                    className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1 text-[11px] font-medium text-success hover:border-success/70 disabled:opacity-50"
                                  >
                                    {busy ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Send size={10} />
                                    )}
                                    Send
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
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
