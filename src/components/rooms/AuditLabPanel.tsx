"use client";

/**
 * Audit Lab — programmatic QA dashboard for every AI draft we generate.
 *
 * Built 2026-05-14 after Leonardo said the manual draft-review loop was
 * eating 2-3h/day. The auditor library (`src/lib/draftAuditor.ts`)
 * codifies every failure pattern he's flagged — pricing leaks,
 * hallucinated numbers, kune mentions, lowball ROI, submissive lang,
 * wrong sign-offs, Croatian-English mash, missing intros, regex
 * debris, vague filler — and this room is where it all surfaces.
 *
 * Three sections:
 *   1. Stat strip — total leads audited + failing/warning/clean counts
 *      + last-audit timestamp
 *   2. Failing leads list — per-lead row with severity badge, top issues,
 *      one-click refresh / open-in-Outreach-Lab actions
 *   3. Checks breakdown — aggregate counts by check type so Leonardo can
 *      spot SYSTEMIC issues (e.g., "12 leads have lowball ROI" means
 *      the prompt itself needs tightening, not 12 individual refreshes)
 *
 * Cross-domain: today only Holmes outreach drafts are audited. As we
 * ship Skool, IG/Telegram inbox, Brand Pulse responses, etc., each
 * domain registers its own check set and gets a filter chip here.
 */

import { useMemo, useState, useTransition } from "react";
import {
  RefreshCw,
  Loader2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { runHolmesForLead } from "@/app/actions/holmes";
import {
  auditHolmesReport,
  auditBadgeVariant,
  type AuditResult,
  type AuditSeverity,
} from "@/lib/draftAuditor";
import type { LeadRow } from "@/lib/queries";

interface AuditLabPanelProps {
  initialLeads: LeadRow[];
}

type SeverityFilter = "all" | "fail" | "warn" | "clean";

const SEV_BADGE: Record<AuditSeverity, { emoji: string; cls: string }> = {
  critical: { emoji: "🚨", cls: "border-rose-500/60 bg-rose-500/20 text-rose-100" },
  high: { emoji: "🔴", cls: "border-rose-400/60 bg-rose-500/15 text-rose-200" },
  medium: { emoji: "🟡", cls: "border-amber-400/60 bg-amber-500/15 text-amber-200" },
  low: { emoji: "⚠", cls: "border-stone-400/40 bg-stone-500/10 text-stone-300" },
};

export function AuditLabPanel({ initialLeads }: AuditLabPanelProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [sevFilter, setSevFilter] = useState<SeverityFilter>("fail");
  const [checkFilter, setCheckFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshingLeadId, setRefreshingLeadId] = useState<string | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Eligible leads = anything with a holmes_report. Closed-won/lost are
  // out (already done, no point auditing). Pre-Holmes leads have nothing
  // to audit.
  const auditableLeads = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.holmes_report &&
          l.stage !== "closed_won" &&
          l.stage !== "closed_lost",
      ),
    [leads],
  );

  // Audit every lead. Cheap pure function — fine to recompute on every
  // render; we don't memoize per-lead.
  const audits = useMemo(() => {
    return auditableLeads.map((l) => ({
      lead: l,
      result: auditHolmesReport(l.holmes_report!, {
        name: l.name,
        icp_score: l.icp_score,
      }),
    }));
  }, [auditableLeads]);

  // Aggregate counts by severity bucket
  const summary = useMemo(() => {
    let fail = 0;
    let warn = 0;
    let clean = 0;
    let cosmetic = 0;
    for (const a of audits) {
      const v = auditBadgeVariant(a.result);
      if (v === "fail") fail++;
      else if (v === "warn") warn++;
      else if (v === "ok") cosmetic++;
      else clean++;
    }
    return {
      total: audits.length,
      fail,
      warn,
      cosmetic,
      clean,
    };
  }, [audits]);

  // Aggregate check counts — "how many leads triggered checkId X"
  const checksBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { count: number; severity: AuditSeverity; description: string }
    >();
    for (const a of audits) {
      // Dedupe per-lead — if a lead has the same checkId triggered in
      // multiple channels, count it once for the breakdown.
      const seen = new Set<string>();
      for (const issue of a.result.issues) {
        if (seen.has(issue.checkId)) continue;
        seen.add(issue.checkId);
        const prev = map.get(issue.checkId);
        if (prev) {
          prev.count++;
        } else {
          map.set(issue.checkId, {
            count: 1,
            severity: issue.severity,
            description: issue.description,
          });
        }
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [audits]);

  // Apply filters
  const filtered = useMemo(() => {
    return audits.filter(({ result }) => {
      const v = auditBadgeVariant(result);
      if (sevFilter === "fail" && v !== "fail") return false;
      if (sevFilter === "warn" && v !== "warn") return false;
      if (sevFilter === "clean" && v !== "clean" && v !== "ok") return false;
      if (
        checkFilter &&
        !result.issues.some((i) => i.checkId === checkFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [audits, sevFilter, checkFilter]);

  // Sort failing leads by worst severity first, then ICP score desc
  const sorted = useMemo(() => {
    const sevRank: Record<AuditSeverity | "none", number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };
    return [...filtered].sort((a, b) => {
      const av = a.result.worst_severity ?? "none";
      const bv = b.result.worst_severity ?? "none";
      const sevDiff = sevRank[av] - sevRank[bv];
      if (sevDiff !== 0) return sevDiff;
      return (b.lead.icp_score ?? 0) - (a.lead.icp_score ?? 0);
    });
  }, [filtered]);

  const selectedAudit = sorted.find((a) => a.lead.id === selectedId) ?? null;

  function refreshOneLead(leadId: string) {
    setError(null);
    setInfo(null);
    setRefreshingLeadId(leadId);
    void (async () => {
      try {
        const res = await runHolmesForLead(leadId);
        if (!res.ok) {
          setError(res.error ?? "Holmes refresh failed");
          return;
        }
        if (res.report) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, holmes_report: res.report } : l,
            ),
          );
          setInfo(`✨ Refreshed lead — auditor će re-evaluirati u sljedećem renderu`);
        }
      } catch (e) {
        setError(`Refresh failed: ${e instanceof Error ? e.message : "unknown"}`);
      } finally {
        setRefreshingLeadId(null);
      }
    })();
  }

  // Bulk-refresh all leads currently shown as FAIL. Caps at 10 per click
  // to avoid Vercel 60s timeout on the underlying sequential server call
  // (each Holmes run ~30-60s); the cron auto-refresh handles the long
  // tail automatically overnight.
  function refreshAllFailing() {
    setError(null);
    setInfo(null);
    const failing = audits.filter(
      ({ result }) => auditBadgeVariant(result) === "fail",
    );
    if (failing.length === 0) {
      setInfo("Nema failing drafts — sve čisto.");
      return;
    }
    const batch = failing.slice(0, 10);
    setInfo(
      `Pokrećem batch refresh za ${batch.length} failing leadova (od ${failing.length} ukupno)...`,
    );
    startBulkTransition(async () => {
      let done = 0;
      for (const { lead } of batch) {
        try {
          const res = await runHolmesForLead(lead.id);
          if (res.ok && res.report) {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === lead.id ? { ...l, holmes_report: res.report } : l,
              ),
            );
            done++;
          }
        } catch {
          /* continue to next */
        }
      }
      setInfo(
        `✨ Refreshed ${done}/${batch.length}. ${failing.length > batch.length ? `Preostalo ${failing.length - batch.length} — pokreni opet ili pričekaj noćni cron.` : "Sve done."}`,
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatBox
          label="Auditiranih"
          value={summary.total.toString()}
          tone="neutral"
        />
        <StatBox
          label="🔴 Failing"
          value={summary.fail.toString()}
          hint="critical/high"
          tone={summary.fail > 0 ? "danger" : "neutral"}
        />
        <StatBox
          label="🟡 Warning"
          value={summary.warn.toString()}
          hint="medium"
          tone={summary.warn > 0 ? "warning" : "neutral"}
        />
        <StatBox
          label="⚠ Cosmetic"
          value={summary.cosmetic.toString()}
          hint="low-only"
          tone="neutral"
        />
        <StatBox
          label="✅ Clean"
          value={summary.clean.toString()}
          tone="success"
        />
      </div>

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={refreshAllFailing}
          disabled={bulkPending || summary.fail === 0}
          className={
            "flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-sm font-medium transition-all " +
            (summary.fail === 0
              ? "cursor-not-allowed border-stone-400/30 bg-stone-500/5 text-text-dim"
              : "border-rose-400/50 bg-rose-500/10 text-rose-200 hover:border-rose-400/80 hover:bg-rose-500/20")
          }
          title="Refresh-aj sve failing drafts (max 10 po batch-u — ostatak u noćnom cronu)"
        >
          {bulkPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh sve failing (max 10/batch)
        </button>

        <div className="ml-auto flex items-center gap-1">
          <FilterChip
            active={sevFilter === "fail"}
            onClick={() => setSevFilter("fail")}
          >
            🔴 Failing · {summary.fail}
          </FilterChip>
          <FilterChip
            active={sevFilter === "warn"}
            onClick={() => setSevFilter("warn")}
          >
            🟡 Warning · {summary.warn}
          </FilterChip>
          <FilterChip
            active={sevFilter === "clean"}
            onClick={() => setSevFilter("clean")}
          >
            ✅ Clean · {summary.clean + summary.cosmetic}
          </FilterChip>
          <FilterChip
            active={sevFilter === "all"}
            onClick={() => setSevFilter("all")}
          >
            Svi · {summary.total}
          </FilterChip>
        </div>
      </div>

      {/* ── Checks breakdown ── */}
      {checksBreakdown.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              <Filter size={11} className="mr-1 inline" />
              Issues breakdown (klikni za filter)
            </h4>
            {checkFilter && (
              <button
                onClick={() => setCheckFilter(null)}
                className="text-[10px] text-text-dim hover:text-text"
              >
                ✕ ukloni filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {checksBreakdown.map((c) => {
              const sev = SEV_BADGE[c.severity];
              const active = checkFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    setCheckFilter(active ? null : c.id)
                  }
                  title={c.description}
                  className={
                    "flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all " +
                    (active
                      ? sev.cls + " ring-1 ring-white/30"
                      : "border-border bg-bg-elevated text-text-muted hover:border-border-strong")
                  }
                >
                  <span>{sev.emoji}</span>
                  <span className="font-mono">{c.id}</span>
                  <span className="font-bold">· {c.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {info && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {info}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ── Two-pane: leads list ↔ issue detail ── */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-1.5">
          {sorted.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-bg-card/40 p-6 text-center text-sm text-text-muted">
              {sevFilter === "fail" ? (
                <>
                  <ShieldCheck className="mx-auto mb-2 text-success" />
                  Nema failing drafts u trenutnom filteru. Auditor: sve čisto.
                </>
              ) : (
                "Nema leadova u ovom filteru."
              )}
            </div>
          ) : (
            sorted.map(({ lead, result }) => {
              const v = auditBadgeVariant(result);
              const worstSev = result.worst_severity;
              const sev = worstSev ? SEV_BADGE[worstSev] : null;
              const isSelected = selectedId === lead.id;
              const isRefreshing = refreshingLeadId === lead.id;
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className={
                    "flex w-full items-start gap-2 rounded border p-2 text-left transition-colors " +
                    (isSelected
                      ? "border-amber-500/60 bg-amber-500/10"
                      : v === "fail"
                        ? "border-rose-400/40 bg-rose-500/5 hover:border-rose-400/70"
                        : v === "warn"
                          ? "border-amber-400/40 bg-amber-500/5 hover:border-amber-400/70"
                          : "border-border bg-bg-card/40 hover:border-border-strong")
                  }
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg/50 text-[11px] font-bold">
                    {lead.icp_score ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="truncate text-xs font-medium text-text">
                        {lead.name}
                      </span>
                      {sev && (
                        <span
                          className={
                            "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider " +
                            sev.cls
                          }
                        >
                          {sev.emoji} {result.total_issues} issue
                          {result.total_issues === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    {result.issues.length > 0 && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted">
                        {result.issues
                          .slice(0, 2)
                          .map((i) => i.description)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-text-dim" />
                </button>
              );
            })
          )}
        </div>

        <div className="lg:sticky lg:top-2 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto rounded border border-border bg-bg-card/40 p-3">
          {!selectedAudit && (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-text-muted">
              <ShieldAlert size={20} className="mr-2" />
              Klikni lead lijevo za sve issues + suggested fixes
            </div>
          )}
          {selectedAudit && (
            <AuditDetailPanel
              lead={selectedAudit.lead}
              result={selectedAudit.result}
              onRefresh={() => refreshOneLead(selectedAudit.lead.id)}
              refreshing={refreshingLeadId === selectedAudit.lead.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AuditDetailPanel({
  lead,
  result,
  onRefresh,
  refreshing,
}: {
  lead: LeadRow;
  result: AuditResult;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{lead.name}</h3>
          <p className="text-[11px] text-text-muted">
            {result.total_issues} issue{result.total_issues === 1 ? "" : "s"} ·{" "}
            {result.passes ? "OK to send" : "BLOK — refresh prije sending"}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {refreshing ? "Refresh…" : "Refresh draft"}
        </button>
      </div>

      {result.issues.length === 0 ? (
        <div className="rounded border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          ✅ Auditor: clean. Spreman za send.
        </div>
      ) : (
        <ul className="space-y-2">
          {result.issues.map((issue, i) => {
            const sev = SEV_BADGE[issue.severity];
            return (
              <li
                key={`${issue.checkId}-${issue.channel}-${i}`}
                className={"rounded-md border px-2.5 py-2 " + sev.cls}
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-sm">{sev.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="rounded bg-black/30 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                        {issue.channel}
                      </span>
                      <span className="rounded bg-black/30 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                        {issue.checkId}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium">
                      {issue.description}
                    </p>
                    {issue.snippet && (
                      <p className="mt-1 rounded bg-black/40 px-1.5 py-1 font-mono text-[10px] italic">
                        &ldquo;{issue.snippet}&rdquo;
                      </p>
                    )}
                    <p className="mt-1 text-[11px] opacity-90">
                      <span className="font-semibold">Fix:</span>{" "}
                      {issue.suggestion}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "border-rose-400/50 bg-rose-500/10"
      : tone === "warning"
        ? "border-amber-400/50 bg-amber-500/10"
        : tone === "success"
          ? "border-success/40 bg-success/10"
          : "border-border bg-bg-card/50";
  return (
    <div className={"rounded-lg border px-3 py-2 " + toneCls}>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="text-lg font-bold text-text">{value}</p>
      {hint && <p className="text-[10px] text-text-dim">{hint}</p>}
    </div>
  );
}

function FilterChip({
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
        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors " +
        (active
          ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
          : "border-border bg-bg-card/40 text-text-muted hover:border-border-strong hover:text-text")
      }
    >
      {children}
    </button>
  );
}
