"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { runHolmesForLead, bulkRunHolmesHot } from "@/app/actions/holmes";
import { StatTile, PrimaryButton } from "@/components/ui/common";
import type { LeadRow } from "@/lib/queries";
import { HolmesLeadDetail, type HolmesDetailTab } from "./HolmesLeadDetail";

type DetailTab = HolmesDetailTab;

interface HolmesBureauPanelProps {
  initialLeads: LeadRow[];
}

const TIER_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
  veteran: { emoji: "🚀", label: "Veteran", color: "text-purple-300" },
  intermediate: { emoji: "📈", label: "Intermediate", color: "text-amber-300" },
  starter: { emoji: "🌱", label: "Starter", color: "text-emerald-300" },
  dead: { emoji: "💀", label: "Dead", color: "text-text-dim" },
};

export function HolmesBureauPanel({ initialLeads }: HolmesBureauPanelProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<"all" | "investigated" | "pending">("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [bulkPending, startBulkTransition] = useTransition();
  const [singlePending, setSinglePending] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Show any lead Holmes has investigated OR any manually-scored hot lead
  // (≥15). Closed-won/lost are excluded — they're done, not workable.
  // This catches pipeline-imported leads even if their numeric icp_score
  // hasn't been backfilled yet.
  const hotLeads = useMemo(
    () =>
      leads
        .filter((l) => {
          if (["closed_won", "closed_lost"].includes(l.stage)) return false;
          return Boolean(l.holmes_report) || (l.icp_score ?? 0) >= 15;
        })
        .sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0)),
    [leads],
  );

  const stats = useMemo(() => {
    const total = hotLeads.length;
    const investigated = hotLeads.filter((l) => l.holmes_report).length;
    const tierCounts: Record<string, number> = {
      veteran: 0,
      intermediate: 0,
      starter: 0,
      dead: 0,
    };
    let confidenceSum = 0;
    let confidenceCount = 0;
    for (const l of hotLeads) {
      const tier = l.holmes_report?.pitch_tier;
      if (tier) tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
      const reach = l.holmes_report?.reachability;
      if (reach && reach.length > 0) {
        confidenceSum += reach[0].confidence;
        confidenceCount++;
      }
    }
    const avgConfidence = confidenceCount
      ? Math.round((confidenceSum / confidenceCount) * 100)
      : 0;
    return {
      total,
      investigated,
      pendingCount: total - investigated,
      avgConfidence,
      tierCounts,
    };
  }, [hotLeads]);

  const filtered = useMemo(() => {
    return hotLeads.filter((l) => {
      if (filter === "investigated" && !l.holmes_report) return false;
      if (filter === "pending" && l.holmes_report) return false;
      if (
        tierFilter !== "all" &&
        l.holmes_report?.pitch_tier !== tierFilter
      )
        return false;
      return true;
    });
  }, [hotLeads, filter, tierFilter]);

  const selected = filtered.find((l) => l.id === selectedId) ?? null;

  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
    current?: string;
  } | null>(null);

  function bulkInvestigate(force = false) {
    setError(null);
    setInfo(null);
    const targetCount = force
      ? hotLeads.length
      : hotLeads.filter((l) => !l.holmes_report).length;
    setBulkProgress({ done: 0, total: targetCount });

    startBulkTransition(async () => {
      // Server-side bulk runner now writes to agent_actions table → Vault's
      // Detective Bureau room shows live AI-working overlay even if user
      // closes this modal. Progress streams via Realtime to the room.
      // Local progress tile here just shows "running" indicator; the real
      // detailed progress lives in the Vault visualization.
      setBulkProgress({
        done: 0,
        total: targetCount,
        current: "Pokrećem batch · prati Detective Bureau room u Vault-u za live progress",
      });
      try {
        const res = await bulkRunHolmesHot({ force });
        if (!res.ok) {
          setError("Bulk Holmes greška");
        } else {
          setInfo(
            `🕵️ ${res.investigated} / ${targetCount} istraženo${res.errors.length ? ` · ${res.errors.length} grešaka` : ""}. Refresh stranice za nove dossier-e.`,
          );
          // Trigger soft refresh after a delay so user can see the new data
          setTimeout(() => window.location.reload(), 2500);
        }
      } catch (e) {
        setError(`Bulk Holmes greška: ${e instanceof Error ? e.message : "unknown"}`);
      }
      setBulkProgress(null);
    });
  }

  function runSingle(leadId: string) {
    setError(null);
    setSinglePending(leadId);
    void (async () => {
      const res = await runHolmesForLead(leadId);
      setSinglePending(null);
      if (!res.ok) {
        setError(res.error ?? "Holmes greška");
        return;
      }
      if (res.report) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, holmes_report: res.report } : l,
          ),
        );
        setSelectedId(leadId);
      }
    })();
  }

  async function copyText(s: string) {
    try {
      await navigator.clipboard.writeText(s);
      setInfo("📋 Kopirano");
    } catch {
      setError("Clipboard nedostupan");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile
          label="Hot leadovi"
          value={stats.total.toString()}
          accent="gold"
        />
        <StatTile
          label="Investigated"
          value={`${stats.investigated} / ${stats.total}`}
          hint={`${stats.total ? Math.round((stats.investigated / stats.total) * 100) : 0}%`}
          accent={stats.investigated === stats.total ? "success" : "warning"}
        />
        <StatTile
          label="Avg ⭐ confidence"
          value={`${stats.avgConfidence}%`}
          accent="success"
        />
        <StatTile
          label="🚀 Veteran"
          value={stats.tierCounts.veteran.toString()}
          hint="AI gatekeeper pitch"
        />
        <StatTile
          label="🌱 Starter"
          value={stats.tierCounts.starter.toString()}
          hint="Content strategy pitch"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PrimaryButton
          onClick={() => bulkInvestigate(false)}
          disabled={bulkPending}
        >
          {bulkPending && bulkProgress ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {bulkProgress.done} / {bulkProgress.total} · {bulkProgress.current?.slice(0, 22) ?? "…"}
            </>
          ) : bulkPending ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Pripremam…
            </>
          ) : (
            <>🕵️ Investigate Hot (samo novi)</>
          )}
        </PrimaryButton>
        <button
          onClick={() => bulkInvestigate(true)}
          disabled={bulkPending}
          className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:border-amber-500/70 disabled:opacity-50"
          title="Ponovno istraži SVE Hot leadove, briše stare report-ove"
        >
          {bulkPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          🔄 Re-investigate all (force)
        </button>
        <div className="ml-auto flex items-center gap-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Svi · {hotLeads.length}
          </FilterChip>
          <FilterChip
            active={filter === "investigated"}
            onClick={() => setFilter("investigated")}
          >
            ✅ Investigated · {stats.investigated}
          </FilterChip>
          <FilterChip
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          >
            ⏳ Pending · {stats.pendingCount}
          </FilterChip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-text-muted">
          Pitch tier:
        </span>
        <FilterChip active={tierFilter === "all"} onClick={() => setTierFilter("all")}>
          all
        </FilterChip>
        {(["veteran", "intermediate", "starter", "dead"] as const).map((t) => (
          <FilterChip
            key={t}
            active={tierFilter === t}
            onClick={() => setTierFilter(t)}
          >
            {TIER_LABEL[t].emoji} {TIER_LABEL[t].label} · {stats.tierCounts[t]}
          </FilterChip>
        ))}
      </div>

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

      {/* Two-pane layout. The right detail panel is `sticky top-2` so when
          the parent scrolls (long lead list on the left) the dossier stays
          visible — clicking down the list updates the right pane in place
          instead of disappearing offscreen. `items-start` keeps each grid
          cell its own height so sticky has a containing block to anchor in. */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-bg-card/40 p-6 text-center text-sm text-text-muted">
              Nema leadova u ovom filteru.
            </div>
          ) : (
            filtered.map((l) => {
              const r = l.holmes_report;
              const tier = r?.pitch_tier;
              const tierStyle = tier ? TIER_LABEL[tier] : null;
              const isSelected = selectedId === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    setSelectedId(l.id);
                    setDetailTab("profile");
                  }}
                  className={
                    "flex w-full items-start gap-2 rounded border p-2 text-left transition-colors " +
                    (isSelected
                      ? "border-amber-500/60 bg-amber-500/10"
                      : "border-border bg-bg-card/40 hover:border-amber-500/30")
                  }
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg/50 text-[11px] font-bold">
                    {l.icp_score ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="truncate text-xs font-medium text-text">
                        {l.name}
                      </span>
                      {tierStyle && (
                        <span
                          className={`text-[10px] font-medium ${tierStyle.color}`}
                        >
                          {tierStyle.emoji} {tierStyle.label}
                        </span>
                      )}
                      {!r && (
                        <span className="text-[10px] text-text-dim">
                          ⏳ pending
                        </span>
                      )}
                    </div>
                    {r?.owner.name && (
                      <div className="text-[10px] text-text-dim">
                        👤 {r.owner.name}
                      </div>
                    )}
                    {r?.best_angle?.summary && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted">
                        💡 {r.best_angle.summary}
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
          {!selected && (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-text-muted">
              Klikni lead lijevo za detaljni Holmes report
            </div>
          )}
          {selected && (
            <HolmesLeadDetail
              lead={selected}
              tab={detailTab}
              onTabChange={setDetailTab}
              onCopy={copyText}
              onRerun={() => runSingle(selected.id)}
              rerunPending={singlePending === selected.id}
            />
          )}
        </div>
      </div>
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
        "rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors " +
        (active
          ? "border-gold text-gold"
          : "border-border text-text-muted hover:border-gold/40 hover:text-text-dim")
      }
    >
      {children}
    </button>
  );
}
