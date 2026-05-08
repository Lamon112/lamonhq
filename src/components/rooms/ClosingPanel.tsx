"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { Trophy, X as XIcon, Briefcase, Sparkles } from "lucide-react";
import {
  closeDealLost,
  closeDealWon,
  updateDealProbability,
} from "@/app/actions/closing";
import {
  StatTile,
  Field,
  ErrorBanner,
  PrimaryButton,
  GhostButton,
  Badge,
} from "@/components/ui/common";
import { formatEuro, formatRelative } from "@/lib/format";
import type { DealsStats, LeadRow } from "@/lib/queries";

interface ClosingPanelProps {
  initialList: LeadRow[];
  initialStats: DealsStats;
  onWonAnimation?: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  pricing: "Pricing",
  financing: "Financing",
  booking: "Booking",
};

const STAGE_PROB_DEFAULT: Record<string, number> = {
  pricing: 0.3,
  financing: 0.5,
  booking: 0.8,
};

export function ClosingPanel({
  initialList,
  initialStats,
  onWonAnimation,
}: ClosingPanelProps) {
  const [list, setList] = useState(initialList);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Close-won form state
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const openDeals = useMemo(
    () =>
      list
        .filter((l) =>
          ["pricing", "financing", "booking"].includes(l.stage),
        )
        .sort(
          (a, b) =>
            (Number(b.estimated_value ?? 0)) -
            (Number(a.estimated_value ?? 0)),
        ),
    [list],
  );

  function recalcStats(rows: LeadRow[]): DealsStats {
    let pipeline = 0;
    let weighted = 0;
    let openCount = 0;
    let wonThisMonth = 0;
    let wonValue = 0;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    for (const r of rows) {
      const v = Math.round(Number(r.estimated_value ?? 0) * 100);
      const stage = r.stage;
      if (["pricing", "financing", "booking"].includes(stage)) {
        const p = r.probability ?? STAGE_PROB_DEFAULT[stage] ?? 0;
        pipeline += v;
        weighted += Math.round(v * p);
        openCount += 1;
      } else if (
        stage === "closed_won" &&
        new Date(r.updated_at) >= monthStart
      ) {
        wonThisMonth += 1;
        wonValue += v;
      }
    }
    return {
      openCount,
      pipelineValueCents: pipeline,
      weightedValueCents: weighted,
      wonThisMonth,
      wonValueCents: wonValue,
    };
  }

  function setProbability(id: string, p: number) {
    startTransition(async () => {
      const prev = list;
      const next = list.map((l) =>
        l.id === id ? { ...l, probability: p } : l,
      );
      setList(next);
      setStats(recalcStats(next));
      const res = await updateDealProbability({ id, probability: p });
      if (!res.ok) {
        setList(prev);
        setStats(recalcStats(prev));
        setError(res.error ?? "Greška");
      }
    });
  }

  function closeWon(id: string) {
    setError(null);
    const mr = parseFloat(monthlyRevenue.replace(",", ".")) || 0;
    if (mr <= 0)
      return setError(
        "Unesi monthly revenue (€/mj) prije close-won — to je MRR koji broji.",
      );
    startTransition(async () => {
      const res = await closeDealWon({
        leadId: id,
        monthlyRevenue: mr,
        notes: closeNotes,
      });
      if (!res.ok) return setError(res.error ?? "Greška");
      // Optimistic update — mark lead as closed_won locally
      const next = list.map((l) =>
        l.id === id
          ? { ...l, stage: "closed_won" as const, probability: 1 }
          : l,
      );
      setList(next);
      setStats(recalcStats(next));
      setMonthlyRevenue("");
      setCloseNotes("");
      setClosingId(null);
      onWonAnimation?.();
    });
  }

  function lost(id: string) {
    if (!confirm("Označiti kao closed-lost?")) return;
    startTransition(async () => {
      const next = list.map((l) =>
        l.id === id ? { ...l, stage: "closed_lost" as const, probability: 0 } : l,
      );
      setList(next);
      setStats(recalcStats(next));
      await closeDealLost(id);
    });
  }

  function probFor(l: LeadRow): number {
    return l.probability ?? STAGE_PROB_DEFAULT[l.stage] ?? 0;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Open deals" value={stats.openCount.toString()} />
        <StatTile
          label="Pipeline"
          value={formatEuro(stats.pipelineValueCents, { compact: true })}
        />
        <StatTile
          label="Weighted"
          value={formatEuro(stats.weightedValueCents, { compact: true })}
          accent="success"
        />
        <StatTile
          label="Won ovaj mj"
          value={`${stats.wonThisMonth} · ${formatEuro(stats.wonValueCents, { compact: true })}`}
          accent="gold"
        />
      </div>

      {openDeals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
          Nema open deals. Pomakni lead u <code>pricing</code> u Lead Scorer-u
          (ili Discovery → outcome interested) i bit će tu.
        </div>
      ) : (
        <ul className="space-y-2">
          {openDeals.map((l) => {
            const p = probFor(l);
            const value = Math.round(Number(l.estimated_value ?? 0) * 100);
            const weighted = Math.round(value * p);
            const isClosing = closingId === l.id;
            return (
              <li
                key={l.id}
                className="rounded-lg border border-border bg-bg-card/60 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text">
                    {l.name}
                  </span>
                  <Badge tone="gold">{STAGE_LABEL[l.stage]}</Badge>
                  <Badge tone="neutral">{l.icp_score ?? 0}/20</Badge>
                  <span className="ml-auto text-xs text-text-dim">
                    {formatRelative(l.updated_at)}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-3 text-[11px]">
                  <span className="text-text-dim">
                    Value:{" "}
                    <span className="text-text">
                      {formatEuro(value, { compact: true })}
                    </span>
                  </span>
                  <span className="text-text-dim">
                    × prob{" "}
                    <span className="text-gold">{(p * 100).toFixed(0)}%</span>{" "}
                    ={" "}
                    <span className="text-success">
                      {formatEuro(weighted, { compact: true })}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {[0.1, 0.25, 0.5, 0.75, 0.9].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setProbability(l.id, opt)}
                      className={
                        "rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors " +
                        (Math.abs(p - opt) < 0.01
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border text-text-muted hover:border-gold/40")
                      }
                    >
                      {opt * 100}%
                    </button>
                  ))}
                </div>

                {isClosing ? (
                  <div className="space-y-2 rounded-lg border border-success/30 bg-success/5 p-3">
                    <div className="text-xs text-success">
                      Close won — kreira novog klijenta:
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Field label="Monthly revenue €/mj *">
                        <input
                          className="input"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={monthlyRevenue}
                          onChange={(e) => setMonthlyRevenue(e.target.value)}
                          placeholder="1497"
                          autoFocus
                        />
                      </Field>
                      <Field label="Onboarding notes">
                        <input
                          className="input"
                          value={closeNotes}
                          onChange={(e) => setCloseNotes(e.target.value)}
                          placeholder="Setup termin: 14.5. u 14h"
                        />
                      </Field>
                    </div>
                    <ErrorBanner message={error} />
                    <div className="flex gap-2">
                      <GhostButton onClick={() => setClosingId(null)}>
                        Cancel
                      </GhostButton>
                      <PrimaryButton
                        disabled={pending}
                        icon={<Trophy size={14} />}
                        onClick={() => closeWon(l.id)}
                      >
                        {pending ? "Closing…" : "🎉 Close won"}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setClosingId(l.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-gold-bright"
                    >
                      <Sparkles size={12} /> Close WON
                    </button>
                    <GhostButton
                      onClick={() => lost(l.id)}
                      icon={<XIcon size={12} />}
                    >
                      Lost
                    </GhostButton>
                    {l.next_action && (
                      <span className="ml-auto text-[11px] text-text-dim">
                        → {l.next_action}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-border bg-bg-card/30 p-3 text-xs text-text-muted">
        <Briefcase className="mr-1 inline" size={12} /> Closing Room logika:
        kad označiš deal kao Won, automatski se kreira <code>client</code>{" "}
        zapis (status onboarding) i MRR u top baru raste. Probability
        defaults: pricing 30%, financing 50%, booking 80%.
      </div>
    </div>
  );
}
