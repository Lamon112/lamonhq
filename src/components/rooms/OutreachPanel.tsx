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

type Tab = "log" | "approval" | "history" | "templates";

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
    setTab("log");
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
        <TabButton active={tab === "log"} onClick={() => setTab("log")}>
          <Send size={14} /> Log new
        </TabButton>
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

            {isEmailMode && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <Field
                  label="Recipient email *"
                  hint={
                    gmailStatus?.connected
                      ? `Šalje se iz ${gmailStatus.email} kroz Gmail API`
                      : "Spoji Gmail u /integrations da omogućiš stvarni send"
                  }
                >
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="dr.marko@klinika-zagreb.hr"
                    className="input"
                  />
                </Field>
                <Field label="Subject *">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brzo pitanje za vašu kliniku"
                    className="input"
                  />
                </Field>
              </motion.div>
            )}

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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={generateAiDraft}
                  disabled={pending || !leadName.trim()}
                  className="flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
                  title="Claude napiše 1 prijedlog"
                >
                  <Wand2 size={14} />
                  ✨ AI draft
                </button>
                <button
                  type="button"
                  onClick={generateVariants}
                  disabled={pending || !leadName.trim()}
                  className="flex items-center gap-2 rounded-lg border border-gold/50 bg-bg-card px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
                  title="Claude generira 3 različita angle-a (curiosity / social proof / direct)"
                >
                  <Layers size={14} />
                  ✨ 3 variants
                </button>
                {aiDraftRaw && aiRated === null && (
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-card px-2 py-1.5 text-[10px] text-text-muted">
                    <span>AI je ovo dobro pogodio?</span>
                    <button
                      type="button"
                      onClick={() => rate("good")}
                      className="rounded p-1 text-success transition-colors hover:bg-success/10"
                      title="👍 Dobro — AI uči ovo kao good example"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => rate("bad")}
                      className="rounded p-1 text-danger transition-colors hover:bg-danger/10"
                      title="👎 Loše — reci mi što je krivo"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
                {aiRated === "good" && (
                  <span className="text-[10px] text-success">
                    👍 Saved · AI uči ovo
                  </span>
                )}
                {aiRated === "bad" && !feedbackOpen && (
                  <span className="text-[10px] text-warning">
                    👎 Saved · sljedeći put bolje
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted">
                Claude Sonnet 4.6 · v2 prompt
              </p>
            </div>

            {feedbackOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3"
              >
                <div className="flex items-center justify-between text-xs text-warning">
                  <span>Što je krivo? AI uči iz ovog feedbacka.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackOpen(false);
                      setAiRated(null);
                    }}
                    className="rounded p-0.5 text-text-muted hover:bg-bg-card"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BAD_FEEDBACK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setFeedbackNotes(chip);
                      }}
                      className={
                        "rounded-md border px-2 py-1 text-[10px] transition-colors " +
                        (feedbackNotes === chip
                          ? "border-warning bg-warning/10 text-warning"
                          : "border-border text-text-dim hover:border-warning/40")
                      }
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  rows={2}
                  placeholder="Detaljnije ako želiš…"
                  className="input text-xs"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={submitBadFeedback}
                    disabled={!feedbackNotes.trim()}
                    className="rounded-md bg-warning px-3 py-1 text-[11px] font-medium text-bg disabled:opacity-40"
                  >
                    Save feedback
                  </button>
                </div>
              </motion.div>
            )}

            {variants && variants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-lg border border-gold/30 bg-gold/5 p-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gold">
                    ✨ 3 varijante · klikni onu koja ti najbolje sjeda
                  </span>
                  <button
                    type="button"
                    onClick={() => setVariants(null)}
                    className="rounded p-0.5 text-text-muted hover:bg-bg-card"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {variants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickVariant(v.draft)}
                      className="rounded-lg border border-border bg-bg-card/60 p-3 text-left transition-colors hover:border-gold/60"
                    >
                      <div className="mb-1.5 text-[10px] uppercase tracking-wider text-gold">
                        {v.angle}
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-text-dim">
                        {v.draft}
                      </pre>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {error && (
              <div className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
                {error}
              </div>
            )}

            {sendInfo && (
              <div className="rounded-md border border-success/40 bg-success/5 p-2 text-xs text-success">
                {sendInfo}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                {isEmailMode
                  ? gmailStatus?.connected
                    ? "Send via Gmail = email stvarno odlazi + log u HQ. Log only = samo bilježi aktivnost."
                    : "Spoji Gmail u /integrations za stvarni send."
                  : "LinkedIn / IG / TikTok šalju se ručno; ovdje samo log-ujemo aktivnost."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex items-center gap-2 rounded-lg border border-gold/50 bg-bg-card px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                >
                  <Send size={14} />
                  {pending ? "Logging…" : "Log only"}
                </button>
                {isEmailMode && (
                  <button
                    type="button"
                    onClick={submitViaGmail}
                    disabled={pending || !canSendViaGmail}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      gmailStatus?.connected
                        ? "Šalje email kroz Gmail API + loga u HQ"
                        : "Spoji Gmail u /integrations"
                    }
                  >
                    <AtSign size={14} />
                    {pending ? "Šaljem…" : "Send via Gmail"}
                    <Zap size={12} className="-ml-0.5 opacity-70" />
                  </button>
                )}
              </div>
            </div>
          </motion.form>
        )}

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
