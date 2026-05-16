"use client";

/**
 * Quiz Funnel — viewer for /quiz incoming leads.
 *
 * Renders inside SkoolOpsPanel as a 5th tab "🎯 Quiz Funnel". Surfaces:
 *   - Funnel stats (total, status breakdown, conversion rates)
 *   - Leads list with score, source, status, action buttons
 *   - Generate DM template per lead (Leonardov warm-DM style)
 *   - Status pipeline buttons (new → dm_sent → replied → invited → converted)
 *
 * Auto-refreshes every 30s for fresh leads.
 */

import { useEffect, useState, useTransition } from "react";
import {
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  CheckCircle2,
  Mail,
  Send,
  Copy,
  ExternalLink,
  Trophy,
  Loader2,
} from "lucide-react";
import {
  listQuizLeads,
  getQuizFunnelStats,
  updateQuizLeadStatus,
  generateQuizDM,
  type QuizLead,
  type QuizFunnelStats,
} from "@/app/actions/quizLeads";

const STATUS_COLORS: Record<QuizLead["status"], string> = {
  new: "bg-sky-500/15 border-sky-400/40 text-sky-200",
  dm_sent: "bg-amber-500/15 border-amber-400/40 text-amber-200",
  replied: "bg-violet-500/15 border-violet-400/40 text-violet-200",
  skool_invited: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
  converted: "bg-gold/20 border-gold/50 text-gold-bright",
  cold: "bg-stone-500/15 border-stone-400/40 text-text-muted",
};

const STATUS_LABEL: Record<QuizLead["status"], string> = {
  new: "Novi",
  dm_sent: "DM poslan",
  replied: "Odgovorio",
  skool_invited: "Skool pozvan",
  converted: "Konvertirao",
  cold: "Hladan",
};

const NEXT_STATUS: Record<QuizLead["status"], QuizLead["status"] | null> = {
  new: "dm_sent",
  dm_sent: "replied",
  replied: "skool_invited",
  skool_invited: "converted",
  converted: null,
  cold: null,
};

export function QuizFunnelPanel() {
  const [leads, setLeads] = useState<QuizLead[] | null>(null);
  const [stats, setStats] = useState<QuizFunnelStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDmFor, setOpenDmFor] = useState<string | null>(null);
  const [dmText, setDmText] = useState<string>("");
  const [loadingDm, setLoadingDm] = useState(false);
  const [, startTransition] = useTransition();

  // Re-defined inside the effect body for lint-clean async-closure pattern.
  // Outer ref so action handlers below can also call refresh().
  const refresh = async () => {
    try {
      const [l, s] = await Promise.all([listQuizLeads(50), getQuizFunnelStats()]);
      setLeads(l);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [l, s] = await Promise.all([
          listQuizLeads(50),
          getQuizFunnelStats(),
        ]);
        if (cancelled) return;
        setLeads(l);
        setStats(s);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "load failed");
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  function handleAdvance(lead: QuizLead) {
    const next = NEXT_STATUS[lead.status];
    if (!next) return;
    startTransition(async () => {
      await updateQuizLeadStatus(lead.id, next);
      refresh();
    });
  }

  function handleMarkCold(lead: QuizLead) {
    startTransition(async () => {
      await updateQuizLeadStatus(lead.id, "cold");
      refresh();
    });
  }

  async function openDmModal(lead: QuizLead) {
    setOpenDmFor(lead.id);
    setDmText("");
    setLoadingDm(true);
    const r = await generateQuizDM(lead.id);
    setLoadingDm(false);
    if (r.ok && r.dm) setDmText(r.dm);
    else setDmText(`(greška: ${r.error ?? "unknown"})`);
  }

  function copyDm() {
    navigator.clipboard.writeText(dmText);
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">
        Greška: {error}
      </div>
    );
  }

  if (!stats || !leads) {
    return (
      <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
        Učitavam quiz funnel...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* === Funnel hero stats === */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FunnelStat
          icon={<Users size={14} />}
          label="Ukupno leadova"
          value={stats.total.toString()}
          hint={`${stats.leads_7d} u 7d`}
        />
        <FunnelStat
          icon={<Target size={14} />}
          label="Avg score"
          value={stats.avg_score !== null ? Math.round(stats.avg_score).toString() : "—"}
          hint="0-100"
        />
        <FunnelStat
          icon={<TrendingUp size={14} />}
          label="Conversion"
          value={`${(stats.overall_conversion_rate * 100).toFixed(1)}%`}
          hint={`${stats.converted} closeano`}
          tone={stats.overall_conversion_rate >= 0.05 ? "success" : "neutral"}
        />
        <FunnelStat
          icon={<Trophy size={14} />}
          label="AI cost (svi)"
          value={`$${stats.total_cost_usd.toFixed(2)}`}
          hint={`~$${(stats.total_cost_usd / Math.max(1, stats.total)).toFixed(3)}/lead`}
        />
      </div>

      {/* === Funnel waterfall === */}
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Funnel waterfall
        </p>
        <div className="space-y-1.5">
          <FunnelStep
            label="Novi"
            count={stats.new_count}
            total={stats.total}
            color="bg-sky-500"
          />
          <FunnelStep
            label="DM poslan"
            count={stats.dm_sent + stats.replied + stats.skool_invited + stats.converted}
            total={stats.total}
            color="bg-amber-500"
          />
          <FunnelStep
            label="Odgovorio"
            count={stats.replied + stats.skool_invited + stats.converted}
            total={stats.total}
            color="bg-violet-500"
          />
          <FunnelStep
            label="Skool pozvan"
            count={stats.skool_invited + stats.converted}
            total={stats.total}
            color="bg-emerald-500"
          />
          <FunnelStep
            label="Konvertirao (€50/mj)"
            count={stats.converted}
            total={stats.total}
            color="bg-gold"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2 text-[10px] text-text-muted">
          <div>
            <span className="font-semibold text-text-dim">DM→Reply:</span>{" "}
            {(stats.dm_to_reply_rate * 100).toFixed(0)}%
          </div>
          <div>
            <span className="font-semibold text-text-dim">Reply→Invite:</span>{" "}
            {(stats.reply_to_invite_rate * 100).toFixed(0)}%
          </div>
          <div>
            <span className="font-semibold text-text-dim">Invite→Close:</span>{" "}
            {(stats.invite_to_conversion_rate * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* === Leads list === */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Najnoviji leadovi ({leads.length})
          </h4>
          <a
            href="/quiz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-text-dim hover:text-gold"
          >
            Otvori quiz <ExternalLink size={10} />
          </a>
        </div>

        {leads.length === 0 && (
          <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
            Još nema leadova. Pošalji kviz link u DM-ove + Telegram broadcast +
            ad — vidjet ćeš ih ovdje uživo.
          </div>
        )}

        {leads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            onAdvance={() => handleAdvance(lead)}
            onMarkCold={() => handleMarkCold(lead)}
            onOpenDm={() => openDmModal(lead)}
          />
        ))}
      </div>

      {/* === DM modal === */}
      {openDmFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-card p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">DM nacrt</h3>
              <button
                onClick={() => setOpenDmFor(null)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>
            {loadingDm ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              </div>
            ) : (
              <>
                <textarea
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  className="input min-h-[160px] w-full font-mono text-sm"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={copyDm}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text hover:border-gold/40"
                  >
                    <Copy size={12} /> Kopiraj
                  </button>
                  <button
                    onClick={() => {
                      const lead = leads.find((l) => l.id === openDmFor);
                      if (lead) handleAdvance(lead);
                      setOpenDmFor(null);
                    }}
                    className="flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-bg hover:bg-gold-bright"
                  >
                    <CheckCircle2 size={12} /> Označi kao poslano
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelStat({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "neutral" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/40 bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-400/40 bg-amber-500/10"
        : tone === "danger"
          ? "border-rose-400/40 bg-rose-500/10"
          : "border-border bg-bg-card/40";
  return (
    <div className={`rounded-lg border p-2.5 ${toneClass}`}>
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </div>
      <div className="text-base font-bold text-text tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-text-muted">{hint}</div>}
    </div>
  );
}

function FunnelStep({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 text-[11px] text-text-dim">{label}</span>
      <div className="relative flex h-5 flex-1 overflow-hidden rounded bg-bg-elevated">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-semibold text-text">
          {count}
        </span>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  onAdvance,
  onMarkCold,
  onOpenDm,
}: {
  lead: QuizLead;
  onAdvance: () => void;
  onMarkCold: () => void;
  onOpenDm: () => void;
}) {
  const next = NEXT_STATUS[lead.status];
  const blockers = (lead.responses?.blocker as string[] | undefined) ?? [];
  const cilj = (lead.responses?.cilj_zarade as string | undefined) ?? "—";
  const sati = (lead.responses?.sati_tj as string | undefined) ?? "—";
  const lokacija = (lead.responses?.lokacija as string | undefined) ?? "—";
  const ago = timeAgo(lead.created_at);

  return (
    <div className="rounded-lg border border-border bg-bg-card/40 p-3 transition hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        {/* Left: identity + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">
              {lead.lead_name || "(bez imena)"}
            </span>
            {lead.score !== null && (
              <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                {lead.score}/100
              </span>
            )}
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[lead.status]}`}
            >
              {STATUS_LABEL[lead.status]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
            {lead.lead_email && (
              <span className="flex items-center gap-1">
                <Mail
                  size={10}
                  className={
                    lead.email_status === "sent" || lead.email_status === "delivered"
                      ? "text-success"
                      : lead.email_status === "failed" || lead.email_status === "bounced"
                        ? "text-danger"
                        : lead.email_status === "skipped"
                          ? "text-warning"
                          : ""
                  }
                />
                {lead.lead_email}
                {lead.email_status === "sent" && (
                  <span title={`Sent ${lead.email_sent_at}`} className="text-success">✓</span>
                )}
                {lead.email_status === "failed" && (
                  <span title={lead.email_error ?? "Send failed"} className="text-danger">⚠</span>
                )}
                {lead.email_status === "skipped" && (
                  <span title="RESEND_API_KEY missing" className="text-warning">○</span>
                )}
              </span>
            )}
            {lead.lead_telegram && (
              <span className="flex items-center gap-1">
                <Send size={10} />
                {lead.lead_telegram}
              </span>
            )}
            <span>· {ago}</span>
            {lead.source && lead.source !== "direct" && (
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono">
                {lead.source}
              </span>
            )}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-text-dim sm:grid-cols-4">
            <span>
              <span className="text-text-muted">cilj:</span> {cilj}
            </span>
            <span>
              <span className="text-text-muted">sati:</span> {sati}
            </span>
            <span>
              <span className="text-text-muted">loc:</span> {lokacija}
            </span>
            {lead.matched_case_study && (
              <span>
                <span className="text-text-muted">match:</span>{" "}
                {lead.matched_case_study}
              </span>
            )}
          </div>
          {blockers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {blockers.slice(0, 4).map((b) => (
                <span
                  key={b}
                  className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-200"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <a
            href={`/quiz/result/${lead.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded border border-border bg-bg-elevated px-2 py-1 text-[10px] text-text hover:border-gold/40"
          >
            <ExternalLink size={10} /> Plan
          </a>
          <button
            onClick={onOpenDm}
            className="flex items-center gap-1 rounded border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-semibold text-gold hover:bg-gold/20"
          >
            <MessageSquare size={10} /> DM
          </button>
          {next && (
            <button
              onClick={onAdvance}
              className="flex items-center gap-1 rounded bg-gold px-2 py-1 text-[10px] font-bold text-bg hover:bg-gold-bright"
            >
              → {STATUS_LABEL[next]}
            </button>
          )}
          {lead.status !== "cold" && lead.status !== "converted" && (
            <button
              onClick={onMarkCold}
              className="text-[10px] text-text-muted hover:text-rose-300"
            >
              hladan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "upravo sad";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
