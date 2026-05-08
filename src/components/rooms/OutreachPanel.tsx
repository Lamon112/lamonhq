"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import { Mail, Send, Sparkles, FileText, Trash2, Check, Wand2 } from "lucide-react";
import { addOutreach, updateOutreachStatus, deleteOutreach } from "@/app/actions/outreach";
import { draftOutreach } from "@/app/actions/ai";
import { OUTREACH_TEMPLATES, type OutreachTemplate } from "@/lib/templates";
import { formatRelative } from "@/lib/format";
import type { OutreachRow, OutreachStats } from "@/lib/queries";

type Tab = "log" | "history" | "templates";

interface OutreachPanelProps {
  initialList: OutreachRow[];
  initialStats: OutreachStats;
  onSendAnimation?: () => void;
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "email", label: "Email" },
  { id: "other", label: "Other" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  sent: "border-text-muted/40 bg-text-muted/10 text-text-dim",
  replied: "border-success/40 bg-success/10 text-success",
  no_reply: "border-warning/40 bg-warning/10 text-warning",
  bounced: "border-danger/40 bg-danger/10 text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Sent",
  replied: "Replied",
  no_reply: "No reply",
  bounced: "Bounced",
};

export function OutreachPanel({
  initialList,
  initialStats,
  onSendAnimation,
}: OutreachPanelProps) {
  const [tab, setTab] = useState<Tab>("log");
  const [list, setList] = useState(initialList);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [leadName, setLeadName] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>(
    "linkedin",
  );
  const [message, setMessage] = useState("");
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);

  function applyTemplate(t: OutreachTemplate) {
    setMessage(t.body);
    setPlatform(
      t.platform === "any" ? "linkedin" : (t.platform as typeof platform),
    );
    setPickedTemplate(t.id);
    setTab("log");
  }

  function generateAiDraft() {
    setError(null);
    if (!leadName.trim()) {
      setError("Unesi lead name prije AI drafta");
      return;
    }
    startTransition(async () => {
      const res = await draftOutreach({
        leadName: leadName.trim(),
        platform,
        hook: message.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "AI greška");
        return;
      }
      setMessage(res.draft ?? "");
      setPickedTemplate("ai");
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!leadName.trim()) {
      setError("Lead name je obavezan");
      return;
    }
    startTransition(async () => {
      const result = await addOutreach({
        leadName: leadName.trim(),
        platform,
        message,
      });
      if (!result.ok) {
        setError(result.error ?? "Greška");
        return;
      }
      // Optimistic UI update
      const newRow: OutreachRow = {
        id: result.id ?? crypto.randomUUID(),
        lead_name: leadName.trim(),
        platform,
        message,
        status: "sent",
        sent_at: new Date().toISOString(),
      };
      setList((prev) => [newRow, ...prev]);
      setStats((s) => ({ ...s, thisWeek: s.thisWeek + 1 }));
      setLeadName("");
      setMessage("");
      setPickedTemplate(null);
      onSendAnimation?.();
      setTab("history");
    });
  }

  function setStatus(id: string, status: OutreachRow["status"]) {
    startTransition(async () => {
      const prev = list;
      setList((rows) =>
        rows.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      const result = await updateOutreachStatus(id, status);
      if (!result.ok) {
        setList(prev);
        setError(result.error ?? "Greška kod update-a");
        return;
      }
      // Refresh reply rate locally
      setStats((s) => {
        const replied = list.filter((r) => r.status === "replied").length;
        const updatedReplied =
          status === "replied"
            ? replied + 1
            : list.find((r) => r.id === id)?.status === "replied"
              ? replied - 1
              : replied;
        return {
          ...s,
          replyRate: list.length ? updatedReplied / list.length : 0,
        };
      });
    });
  }

  function remove(id: string) {
    if (!confirm("Obrisati ovaj outreach?")) return;
    startTransition(async () => {
      const prev = list;
      setList((rows) => rows.filter((r) => r.id !== id));
      const result = await deleteOutreach(id);
      if (!result.ok) {
        setList(prev);
        setError(result.error ?? "Greška kod brisanja");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile
          label="Ovaj tjedan"
          value={`${stats.thisWeek} / ${stats.weeklyGoal}`}
          accent={stats.thisWeek >= stats.weeklyGoal ? "success" : "gold"}
        />
        <StatTile
          label="Reply rate"
          value={`${(stats.replyRate * 100).toFixed(0)}%`}
          accent="gold"
        />
        <StatTile
          label="→ Discovery"
          value={stats.convertedToDiscovery.toString()}
          accent="gold"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "log"} onClick={() => setTab("log")}>
          <Send size={14} /> Log new
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          <Mail size={14} /> History · {list.length}
        </TabButton>
        <TabButton
          active={tab === "templates"}
          onClick={() => setTab("templates")}
        >
          <FileText size={14} /> Templates
        </TabButton>
      </div>

      {/* Panels */}
      <AnimatePresence mode="wait">
        {tab === "log" && (
          <motion.form
            key="log"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={submit}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Lead name *">
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Estetska klinika Zagreb / dr. Marko"
                  className="input"
                  autoFocus
                />
              </Field>
              <Field label="Platforma">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as typeof platform)}
                  className="input"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label={`Poruka${pickedTemplate === "ai" ? " · ✨ AI draft" : pickedTemplate ? " · iz template-a" : ""}`}
              hint="Tipkaj, paste-aj template, ili klikni '✨ AI draft' da Claude napiše prijedlog. Ono što je tu prije AI drafta postaje 'hook' kontekst."
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder="Pozdrav…   (ili napiši ovdje hook tipa 'novi post o booking flow-u' i klikni ✨ AI draft)"
                className="input font-mono text-xs"
              />
            </Field>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={generateAiDraft}
                disabled={pending || !leadName.trim()}
                className="flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
                title={!leadName.trim() ? "Unesi lead name prvo" : "Claude napiše prijedlog poruke u tvom voice-u"}
              >
                <Wand2 size={14} />
                ✨ AI draft (Claude)
              </button>
              <p className="text-[10px] text-text-muted">
                Claude Sonnet 4.6 · ~$0.005 po draftu
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Šalju se broj-eve dok poruke su poslane stvarno (manual). Ovdje
                samo log-ujemo aktivnost.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-gold-bright disabled:opacity-50"
              >
                <Send size={14} />
                {pending ? "Logging…" : "Log outreach"}
              </button>
            </div>
          </motion.form>
        )}

        {tab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {list.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Još nema log-iranih outreach-a. Krenimo!
              </div>
            )}
            <ul className="space-y-2">
              {list.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-border bg-bg-card/60 p-3 transition-colors hover:border-gold/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text">
                          {row.lead_name ?? "Unknown lead"}
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
                          {row.platform ?? "?"}
                        </span>
                        <span
                          className={
                            "rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider " +
                            STATUS_STYLES[row.status]
                          }
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {formatRelative(row.sent_at)}
                        </span>
                      </div>
                      {row.message && (
                        <p className="mt-1 line-clamp-2 text-xs text-text-dim">
                          {row.message}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {row.status !== "replied" && (
                        <button
                          onClick={() => setStatus(row.id, "replied")}
                          className="rounded p-1.5 text-text-muted transition-colors hover:bg-success/10 hover:text-success"
                          title="Mark replied"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(row.id)}
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        title="Obriši"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {tab === "templates" && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {OUTREACH_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="block w-full rounded-lg border border-border bg-bg-card/60 p-3 text-left transition-colors hover:border-gold/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-gold" />
                      <span className="text-sm font-medium text-text">
                        {t.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {t.tone}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-text-dim">
                    {t.platform}
                  </span>
                </div>
                <pre className="mt-2 line-clamp-3 whitespace-pre-wrap font-mono text-[11px] text-text-dim">
                  {t.body}
                </pre>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors -mb-px " +
        (active
          ? "border-gold text-text"
          : "border-transparent text-text-muted hover:text-text-dim")
      }
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-text-muted">{hint}</span>}
    </label>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "gold" | "success";
}) {
  const accentClass =
    accent === "success"
      ? "border-success/30 bg-success/5"
      : "border-gold/30 bg-gold/5";
  return (
    <div
      className={`rounded-lg border ${accentClass} px-3 py-2 leading-tight`}
    >
      <div className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="text-base font-semibold text-text">{value}</div>
    </div>
  );
}
