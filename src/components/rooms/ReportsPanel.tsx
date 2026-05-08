"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import {
  FileText,
  Send,
  Sparkles,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Wand2,
} from "lucide-react";
import {
  upsertReport,
  markReportSent,
  deleteReport,
} from "@/app/actions/reports";
import { generateWeeklyReport, saveAiFeedback } from "@/app/actions/ai";
import {
  StatTile,
  TabButton,
  Field,
  ErrorBanner,
  PrimaryButton,
  GhostButton,
  Badge,
} from "@/components/ui/common";
import { formatEuro, formatRelative } from "@/lib/format";
import type {
  ClientRow,
  WeeklyReportRow,
  ReportsStats,
  ContentPostRow,
  OutreachRow,
} from "@/lib/queries";

type Tab = "due" | "history";

interface ReportsPanelProps {
  initialReports: WeeklyReportRow[];
  initialStats: ReportsStats;
  clients: ClientRow[];
  contentPosts: ContentPostRow[];
  outreach: OutreachRow[];
  weekStart: string;
}

function generateTemplate(
  client: ClientRow,
  posts: ContentPostRow[],
  outreach: OutreachRow[],
  weekStart: string,
): string {
  const ws = new Date(weekStart);
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("hr-HR", { day: "numeric", month: "long" });

  const weeklyPosts = posts.filter(
    (p) => p.posted_at && new Date(p.posted_at) >= ws,
  );
  const totalViews = weeklyPosts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalLikes = weeklyPosts.reduce((s, p) => s + (p.likes ?? 0), 0);
  const weeklyOutreach = outreach.filter(
    (o) => new Date(o.sent_at) >= ws,
  );

  const lines = [
    `# Tjedni izvještaj · ${client.name}`,
    `Tjedan: ${fmt(ws)} – ${fmt(we)}`,
    "",
    `**Pozdrav,**`,
    "",
    `Evo brzog pregleda što se događalo s ${client.name} ovaj tjedan:`,
    "",
    `## 🎯 Ključne brojke`,
    `- Aktivnosti za tebe: ${weeklyOutreach.length} outreach poruka`,
    `- Content pulse: ${weeklyPosts.length} post-ova · ${totalViews.toLocaleString("hr-HR")} views · ${totalLikes.toLocaleString("hr-HR")} likes`,
    "",
    `## 🔧 Što smo napravili`,
    `- (popuniti ručno: 2-3 specifične akcije za ${client.name})`,
    "",
    `## 📋 Sljedeći tjedan`,
    `- ${client.next_action ?? "(popuniti ručno)"}`,
    `- (još 1-2 koraka)`,
    "",
    `${client.churn_risk ? "⚠ Risk flag: " + client.churn_risk + " — adresiramo ovaj tjedan." : ""}`,
    "",
    `Pozz,`,
    `Leonardo · Lamon Agency`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function ReportsPanel({
  initialReports,
  initialStats,
  clients,
  contentPosts,
  outreach,
  weekStart,
}: ReportsPanelProps) {
  const [tab, setTab] = useState<Tab>("due");
  const [reports, setReports] = useState(initialReports);
  const stats = initialStats;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [aiSource, setAiSource] = useState<
    "ai" | "template" | "existing" | null
  >(null);
  const [aiRated, setAiRated] = useState<"good" | "bad" | null>(null);
  const [customNotes, setCustomNotes] = useState("");

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === "active"),
    [clients],
  );

  const reportByClient = useMemo(() => {
    const m: Record<string, WeeklyReportRow | undefined> = {};
    for (const r of reports) {
      if (r.week_start === weekStart) m[r.client_id] = r;
    }
    return m;
  }, [reports, weekStart]);

  function startEditExisting(client: ClientRow) {
    const existing = reportByClient[client.id];
    if (!existing) return;
    setContent(existing.content ?? "");
    setEditingClientId(client.id);
    setAiSource("existing");
    setAiRated(null);
    setCustomNotes("");
    setError(null);
  }

  async function generateAI(client: ClientRow, withCustom?: string) {
    setEditingClientId(client.id);
    setError(null);
    setAiPending(true);
    setAiRated(null);
    try {
      const res = await generateWeeklyReport({
        clientId: client.id,
        weekStart,
        customNotes: withCustom?.trim() || undefined,
      });
      if (!res.ok || !res.report) {
        setError(res.error ?? "AI greška");
        setAiSource(null);
        return;
      }
      setContent(res.report);
      setAiSource("ai");
    } finally {
      setAiPending(false);
    }
  }

  function fallbackTemplate(client: ClientRow) {
    setContent(generateTemplate(client, contentPosts, outreach, weekStart));
    setAiSource("template");
    setAiRated(null);
  }

  function rateAi(rating: "good" | "bad") {
    if (!editingClientId || !content || aiSource !== "ai") return;
    setAiRated(rating);
    startTransition(async () => {
      await saveAiFeedback({
        kind: "weekly_report",
        input: {
          clientId: editingClientId,
          weekStart,
          customNotes: customNotes.trim() || undefined,
        },
        output: content,
        rating,
      });
    });
  }

  function saveDraft() {
    if (!editingClientId) return;
    startTransition(async () => {
      const res = await upsertReport(editingClientId, content, weekStart);
      if (!res.ok) return setError(res.error ?? "Greška");
      // Update local state
      setReports((rows) => {
        const idx = rows.findIndex(
          (r) => r.client_id === editingClientId && r.week_start === weekStart,
        );
        const newRow: WeeklyReportRow = {
          id: res.id ?? crypto.randomUUID(),
          client_id: editingClientId!,
          week_start: weekStart,
          content,
          status: "draft",
          sent_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) {
          const next = [...rows];
          next[idx] = { ...rows[idx], content, status: "draft" };
          return next;
        }
        return [newRow, ...rows];
      });
      setEditingClientId(null);
    });
  }

  function sendReport() {
    if (!editingClientId) return;
    startTransition(async () => {
      // Save draft first
      const upRes = await upsertReport(editingClientId, content, weekStart);
      if (!upRes.ok) return setError(upRes.error ?? "Greška");
      const id = upRes.id;
      if (!id) return;
      const sendRes = await markReportSent(id);
      if (!sendRes.ok) return setError(sendRes.error ?? "Greška");
      setReports((rows) => {
        const newRow: WeeklyReportRow = {
          id,
          client_id: editingClientId!,
          week_start: weekStart,
          content,
          status: "sent",
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const idx = rows.findIndex(
          (r) => r.client_id === editingClientId && r.week_start === weekStart,
        );
        if (idx >= 0) {
          const next = [...rows];
          next[idx] = { ...newRow };
          return next;
        }
        return [newRow, ...rows];
      });
      setEditingClientId(null);
    });
  }

  function remove(id: string) {
    if (!confirm("Obrisati izvještaj?")) return;
    startTransition(async () => {
      setReports(reports.filter((r) => r.id !== id));
      await deleteReport(id);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Due ovaj tj"
          value={stats.dueThisWeek.toString()}
        />
        <StatTile
          label="Sent"
          value={stats.sentThisWeek.toString()}
          accent="success"
        />
        <StatTile
          label="Pending"
          value={stats.pendingThisWeek.toString()}
          accent={stats.pendingThisWeek > 0 ? "warning" : "gold"}
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "due"} onClick={() => setTab("due")}>
          <FileText size={14} /> Ovaj tjedan · {activeClients.length}
        </TabButton>
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
        >
          History · {reports.length}
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "due" && !editingClientId && (
          <motion.div
            key="due"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {activeClients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Nema aktivnih klijenata. Kad imaš active klijenta, ovdje ćeš
                slati weekly report.
              </div>
            ) : (
              <ul className="space-y-2">
                {activeClients.map((c) => {
                  const r = reportByClient[c.id];
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-card/60 p-3"
                    >
                      <span className="text-sm font-medium text-text">
                        {c.name}
                      </span>
                      <Badge tone="neutral">
                        {formatEuro(
                          Math.round(Number(c.monthly_revenue ?? 0) * 100),
                          { compact: true },
                        )}
                        /mj
                      </Badge>
                      {r ? (
                        <Badge
                          tone={r.status === "sent" ? "success" : "warning"}
                        >
                          {r.status === "sent" ? "✓ Sent" : "Draft"}
                        </Badge>
                      ) : (
                        <Badge tone="danger">Nije pripremljen</Badge>
                      )}
                      {r ? (
                        <button
                          onClick={() => startEditExisting(c)}
                          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-dim transition-colors hover:border-gold/50 hover:text-text"
                        >
                          <FileText size={12} /> Otvori draft
                        </button>
                      ) : (
                        <div className="ml-auto flex items-center gap-1.5">
                          <button
                            onClick={() => generateAI(c)}
                            disabled={pending || aiPending}
                            className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-gold-bright disabled:opacity-50"
                          >
                            <Wand2 size={12} />
                            ✨ AI generate
                          </button>
                          <button
                            onClick={() => {
                              setEditingClientId(c.id);
                              fallbackTemplate(c);
                              setError(null);
                            }}
                            className="rounded-lg border border-border bg-bg-card px-2 py-1.5 text-[10px] text-text-muted transition-colors hover:border-gold/50 hover:text-text-dim"
                            title="Fallback: hardcoded template (bez AI)"
                          >
                            Template
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}

        {tab === "due" && editingClientId && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-text-muted">
                Editiraš report za:{" "}
                <span className="text-text">
                  {clients.find((c) => c.id === editingClientId)?.name}
                </span>{" "}
                · tjedan {weekStart}
              </div>
              <div className="flex items-center gap-1.5">
                {aiSource === "ai" && (
                  <Badge tone="gold">✨ AI v2</Badge>
                )}
                {aiSource === "template" && (
                  <Badge tone="neutral">Template</Badge>
                )}
                {aiSource === "existing" && (
                  <Badge tone="neutral">Existing draft</Badge>
                )}
                {aiSource === "ai" && aiRated === null && (
                  <>
                    <span className="text-[10px] text-text-muted">
                      AI dobro?
                    </span>
                    <button
                      type="button"
                      onClick={() => rateAi("good")}
                      className="rounded p-1 text-success transition-colors hover:bg-success/10"
                      title="👍 Saved as good — AI uči ovo"
                    >
                      <ThumbsUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => rateAi("bad")}
                      className="rounded p-1 text-danger transition-colors hover:bg-danger/10"
                    >
                      <ThumbsDown size={11} />
                    </button>
                  </>
                )}
                {aiRated === "good" && (
                  <span className="text-[10px] text-success">👍 Saved</span>
                )}
                {aiRated === "bad" && (
                  <span className="text-[10px] text-warning">👎 Saved</span>
                )}
              </div>
            </div>

            {aiPending && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
                ✨ Claude piše report — fetcham real podatke (content, tasks,
                outreach) za ovaj tjedan i sastavljam narrative…
              </div>
            )}

            <textarea
              className="input font-mono text-xs"
              rows={18}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (aiSource === "ai") setAiSource(null);
              }}
              disabled={aiPending}
            />

            {aiSource === "ai" && (
              <div className="rounded-lg border border-border bg-bg-card/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    Regeneriraj s dodatnim kontekstom (npr. specifičan win, novi
                    tretman, churn pitanje)
                  </span>
                </div>
                <input
                  className="input text-xs"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="npr. 'Naglasi da smo dobili 3 booking-a za new aligners promo'"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const c = clients.find((x) => x.id === editingClientId);
                      if (c) generateAI(c, customNotes);
                    }}
                    disabled={aiPending || !customNotes.trim()}
                    className="flex items-center gap-1.5 rounded-md bg-gold/20 px-2 py-1 text-[11px] text-gold transition-colors hover:bg-gold/30 disabled:opacity-40"
                  >
                    <Wand2 size={11} />
                    Regeneriraj s notama
                  </button>
                </div>
              </div>
            )}

            <ErrorBanner message={error} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                {aiSource === "ai"
                  ? "Claude koristi tvoje 👍 reports kao few-shot. Tijekom vremena, drafts će izgledati sve više kao tvoji."
                  : "Doteci akcijama prije slanja. Možeš svaki dio editirati."}
              </p>
              <div className="flex gap-2">
                <GhostButton onClick={() => setEditingClientId(null)}>
                  Cancel
                </GhostButton>
                <GhostButton onClick={saveDraft} disabled={pending}>
                  Save draft
                </GhostButton>
                <PrimaryButton
                  disabled={pending}
                  icon={<Send size={14} />}
                  onClick={sendReport}
                >
                  {pending ? "Sending…" : "Mark sent"}
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "history" && (
          <motion.ul
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {reports.length === 0 && (
              <li className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Nema poslanih izvještaja. Generate prvi ↑
              </li>
            )}
            {reports.map((r) => {
              const client = clients.find((c) => c.id === r.client_id);
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-bg-card/60 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-text">
                      {client?.name ?? "?"}
                    </span>
                    <Badge tone="neutral">{r.week_start}</Badge>
                    <Badge tone={r.status === "sent" ? "success" : "warning"}>
                      {r.status}
                    </Badge>
                    {r.sent_at && (
                      <span className="text-[11px] text-text-dim">
                        sent {formatRelative(r.sent_at)}
                      </span>
                    )}
                    <button
                      onClick={() => remove(r.id)}
                      className="ml-auto rounded p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {r.content && (
                    <pre className="mt-2 line-clamp-4 whitespace-pre-wrap font-mono text-[11px] text-text-dim">
                      {r.content}
                    </pre>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
