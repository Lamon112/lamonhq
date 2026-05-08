"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import {
  Mail,
  Send,
  Sparkles,
  FileText,
  Trash2,
  Check,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  Layers,
  X as XIcon,
  AtSign,
  Zap,
  MessageSquare,
} from "lucide-react";
import { triageInbound } from "@/app/actions/inbound";
import { addOutreach, updateOutreachStatus, deleteOutreach } from "@/app/actions/outreach";
import {
  draftOutreach,
  draftOutreachVariants,
  saveAiFeedback,
} from "@/app/actions/ai";
import {
  getGmailStatus,
  sendViaGmail,
  type GmailStatus,
} from "@/app/actions/gmail";
import { OUTREACH_TEMPLATES, type OutreachTemplate } from "@/lib/templates";
import { ApprovalQueue } from "./ApprovalQueue";
import { PrimaryButton, GhostButton } from "@/components/ui/common";
import { formatRelative } from "@/lib/format";
import type { OutreachRow, OutreachStats } from "@/lib/queries";

type Tab = "approval" | "history" | "templates";

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
  const [tab, setTab] = useState<Tab>("approval");
  const [list, setList] = useState(initialList);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Reply triage modal state
  const [replyOutreach, setReplyOutreach] = useState<OutreachRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [replyInfo, setReplyInfo] = useState<string | null>(null);

  function openReplyTriage(row: OutreachRow) {
    setReplyOutreach(row);
    setReplyText("");
    setReplyInfo(null);
  }

  async function submitReplyTriage() {
    if (!replyOutreach || !replyText.trim()) return;
    setReplyPending(true);
    setReplyInfo(null);
    const channel = (replyOutreach.platform ?? "manual") as
      | "linkedin"
      | "email"
      | "instagram"
      | "tiktok"
      | "manual";
    const res = await triageInbound({
      rawText: replyText.trim(),
      channel,
      senderName: replyOutreach.lead_name ?? undefined,
      leadId: replyOutreach.lead_id ?? undefined,
    });
    setReplyPending(false);
    if (!res.ok) {
      setReplyInfo(`❌ ${res.error}`);
      return;
    }
    // Mark outreach as replied
    await updateOutreachStatus(replyOutreach.id, "replied");
    setList((prev) =>
      prev.map((r) =>
        r.id === replyOutreach.id ? { ...r, status: "replied" as const } : r,
      ),
    );
    setReplyInfo(
      "✅ Triage gotov — pogledaj Smart Inbox panel za AI drafte",
    );
    setTimeout(() => setReplyOutreach(null), 1500);
  }

  // Form state
  const [leadName, setLeadName] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>(
    "linkedin",
  );
  const [message, setMessage] = useState("");
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);

  // Gmail send state
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [sendInfo, setSendInfo] = useState<string | null>(null);

  useEffect(() => {
    getGmailStatus().then(setGmailStatus);
  }, []);

  const isEmailMode = platform === "email";
  const canSendViaGmail =
    isEmailMode &&
    gmailStatus?.connected === true &&
    recipientEmail.trim().length > 3 &&
    /\S+@\S+\.\S+/.test(recipientEmail.trim()) &&
    subject.trim().length > 0 &&
    message.trim().length > 0;

  // AI v2 state
  const [aiHook, setAiHook] = useState<string>("");
  const [aiDraftRaw, setAiDraftRaw] = useState<string | null>(null);
  const [aiRated, setAiRated] = useState<"good" | "bad" | null>(null);
  const [variants, setVariants] = useState<
    Array<{ angle: string; draft: string }> | null
  >(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState("");

  function applyTemplate(t: OutreachTemplate) {
    setMessage(t.body);
    setPlatform(
      t.platform === "any" ? "linkedin" : (t.platform as typeof platform),
    );
    setPickedTemplate(t.id);
  }

  function generateAiDraft() {
    setError(null);
    if (!leadName.trim()) {
      setError("Unesi lead name prije AI drafta");
      return;
    }
    const hook = message.trim() || undefined;
    setAiHook(hook ?? "");
    startTransition(async () => {
      const res = await draftOutreach({
        leadName: leadName.trim(),
        platform,
        hook,
      });
      if (!res.ok) {
        setError(res.error ?? "AI greška");
        return;
      }
      setMessage(res.draft ?? "");
      setAiDraftRaw(res.draft ?? null);
      setAiRated(null);
      setPickedTemplate("ai");
      setVariants(null);
    });
  }

  function generateVariants() {
    setError(null);
    if (!leadName.trim()) {
      setError("Unesi lead name prije variants");
      return;
    }
    const hook = message.trim() || undefined;
    setAiHook(hook ?? "");
    startTransition(async () => {
      const res = await draftOutreachVariants({
        leadName: leadName.trim(),
        platform,
        hook,
      });
      if (!res.ok) {
        setError(res.error ?? "AI greška");
        return;
      }
      setVariants(res.variants ?? null);
    });
  }

  function pickVariant(draft: string) {
    setMessage(draft);
    setAiDraftRaw(draft);
    setPickedTemplate("ai");
    setAiRated(null);
    setVariants(null);
  }

  function rate(rating: "good" | "bad") {
    if (!aiDraftRaw) return;
    setAiRated(rating);
    if (rating === "bad") {
      setFeedbackOpen(true);
      return;
    }
    saveFeedbackBackground(rating, "");
  }

  function saveFeedbackBackground(
    rating: "good" | "bad",
    notes: string,
  ) {
    if (!aiDraftRaw) return;
    startTransition(async () => {
      await saveAiFeedback({
        kind: "outreach_draft",
        input: {
          leadName: leadName.trim(),
          platform,
          hook: aiHook || undefined,
        },
        output: aiDraftRaw,
        rating,
        notes,
      });
    });
  }

  function submitBadFeedback() {
    saveFeedbackBackground("bad", feedbackNotes.trim());
    setFeedbackOpen(false);
    setFeedbackNotes("");
  }

  const BAD_FEEDBACK_CHIPS = [
    "Pre brzo spomenuo proizvod",
    "CTA nedovoljno konkretan",
    "Predugo",
    "Nije moj tone (zvuči robotski)",
    "Hook nije specifičan",
    "Drugo",
  ];

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
        lead_id: null,
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

  function submitViaGmail() {
    setError(null);
    setSendInfo(null);
    if (!canSendViaGmail) {
      setError("Provjeri lead name, recipient email, subject, body");
      return;
    }
    startTransition(async () => {
      const sendRes = await sendViaGmail({
        to: recipientEmail.trim(),
        subject: subject.trim(),
        body: message,
      });
      if (!sendRes.ok) {
        setError(`Gmail send: ${sendRes.error ?? "greška"}`);
        return;
      }
      // Email se uspješno poslao — sad logaj kao outreach record
      const enrichedMessage = `[To: ${recipientEmail.trim()}] [Subject: ${subject.trim()}]\n\n${message}`;
      const result = await addOutreach({
        leadName: leadName.trim() || recipientEmail.trim(),
        platform: "email",
        message: enrichedMessage,
      });
      const newRow: OutreachRow = {
        id: result.id ?? crypto.randomUUID(),
        lead_id: null,
        lead_name: leadName.trim() || recipientEmail.trim(),
        platform: "email",
        message: enrichedMessage,
        status: "sent",
        sent_at: new Date().toISOString(),
      };
      setList((prev) => [newRow, ...prev]);
      setStats((s) => ({ ...s, thisWeek: s.thisWeek + 1 }));
      setSendInfo(
        `📧 Email poslan iz ${sendRes.fromEmail} → ${recipientEmail.trim()}. Replies dolaze u Gmail inbox.`,
      );
      setLeadName("");
      setRecipientEmail("");
      setSubject("");
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
        <TabButton
          active={tab === "approval"}
          onClick={() => setTab("approval")}
        >
          <Sparkles size={14} /> Approval queue
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

        {tab === "approval" && (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <ApprovalQueue />
          </motion.div>
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
                        <>
                          <button
                            onClick={() => openReplyTriage(row)}
                            className="rounded p-1.5 text-text-muted transition-colors hover:bg-gold/10 hover:text-gold"
                            title="📬 Reply received → AI triage"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => setStatus(row.id, "replied")}
                            className="rounded p-1.5 text-text-muted transition-colors hover:bg-success/10 hover:text-success"
                            title="Mark replied (bez triage-a)"
                          >
                            <Check size={14} />
                          </button>
                        </>
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

      {replyOutreach && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gold/30 bg-bg-elevated p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">
                  📬 Reply received → AI triage
                </h3>
                <p className="text-[11px] text-text-dim">
                  {replyOutreach.lead_name} · {replyOutreach.platform ?? "?"}
                </p>
              </div>
              <button
                onClick={() => setReplyOutreach(null)}
                className="text-text-dim hover:text-text"
              >
                <XIcon size={16} />
              </button>
            </div>
            {replyOutreach.message && (
              <div className="mb-3 rounded border border-border bg-bg/40 p-2 text-[11px] text-text-dim">
                <div className="mb-1 text-[9px] uppercase tracking-wider text-text-muted">
                  Tvoj outreach (kontekst za AI)
                </div>
                <p className="line-clamp-3">{replyOutreach.message}</p>
              </div>
            )}
            <label className="block text-[10px] uppercase tracking-wider text-text-muted">
              Što ti je odgovorio? Paste-aj njegov tekst:
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={6}
              placeholder="Bok Leonardo, hvala na poruci. Trenutno smo…"
              className="mt-1 w-full rounded border border-border bg-bg/60 px-2 py-1.5 text-xs text-text focus:border-gold/40 focus:outline-none"
            />
            {replyInfo && (
              <p className="mt-2 text-xs text-text-dim">{replyInfo}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <GhostButton onClick={() => setReplyOutreach(null)}>
                Cancel
              </GhostButton>
              <PrimaryButton
                onClick={submitReplyTriage}
                disabled={replyPending || !replyText.trim()}
              >
                {replyPending ? "Triage radi…" : "🤖 Triage + AI drafts"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
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
