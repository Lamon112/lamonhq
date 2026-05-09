"use client";

/**
 * Holmes pipeline result inside the vault drawer — renders the EXACT
 * same UI as the classic HolmesBureauPanel by reusing HolmesLeadDetail.
 * Left: lead picker list (just the leads from this run). Right: full
 * Holmes dossier with profile/team/social/angle/publicity tabs and
 * copy-paste-ready outreach drafts per channel.
 *
 * Single source of truth lives in src/components/rooms/HolmesLeadDetail.tsx.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { getHolmesPipelineLeads } from "@/app/actions/agentResearch";
import {
  HolmesLeadDetail,
  type HolmesDetailTab,
} from "../rooms/HolmesLeadDetail";
import type { LeadRow } from "@/lib/queries";

const TIER_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
  veteran: { emoji: "🚀", label: "Veteran", color: "text-purple-300" },
  intermediate: { emoji: "📈", label: "Intermediate", color: "text-amber-300" },
  starter: { emoji: "🌱", label: "Starter", color: "text-emerald-300" },
  dead: { emoji: "💀", label: "Dead", color: "text-text-dim" },
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "ok"; leads: LeadRow[] };

export function HolmesPipelineCards({ actionRowId }: { actionRowId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<HolmesDetailTab>("profile");
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getHolmesPipelineLeads(actionRowId).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setState({ kind: "ok", leads: res.leads as unknown as LeadRow[] });
      } else {
        setState({ kind: "error", error: res.error });
      }
    });
    return () => {
      alive = false;
    };
  }, [actionRowId]);

  const sorted = useMemo(() => {
    if (state.kind !== "ok") return [];
    const order: Record<string, number> = {
      veteran: 0,
      intermediate: 1,
      starter: 2,
      dead: 3,
    };
    return [...state.leads].sort((a, b) => {
      const ta = order[a.holmes_report?.pitch_tier ?? "starter"] ?? 2;
      const tb = order[b.holmes_report?.pitch_tier ?? "starter"] ?? 2;
      return ta - tb;
    });
  }, [state]);

  // Auto-select the first lead once loaded so the drawer never starts blank.
  useEffect(() => {
    if (state.kind === "ok" && sorted.length > 0 && !selectedId) {
      setSelectedId(sorted[0].id);
    }
  }, [state, sorted, selectedId]);

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 size={14} className="animate-spin" /> Učitavam Holmes
        dossier…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
        {state.error}
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <p className="text-[11px] text-text-muted">
        Nema spremljenih leadova za ovaj run.
      </p>
    );
  }

  const selected = sorted.find((l) => l.id === selectedId) ?? sorted[0];

  async function copyText(s: string) {
    try {
      await navigator.clipboard.writeText(s);
      setInfo("📋 Kopirano");
      setTimeout(() => setInfo(null), 1500);
    } catch {
      setInfo("Clipboard nedostupan");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          ▾ {sorted.length} leadova · sortirano po tieru
        </h4>
        {info && (
          <span className="text-[10px] text-emerald-300">{info}</span>
        )}
      </div>

      <div className="space-y-1.5">
        {sorted.map((l) => {
          const r = l.holmes_report;
          const tier = r?.pitch_tier;
          const tierStyle = tier ? TIER_LABEL[tier] : null;
          const isSelected = selected.id === l.id;
          return (
            <button
              key={l.id}
              onClick={() => {
                setSelectedId(l.id);
                setTab("profile");
              }}
              className={
                "flex w-full items-start gap-2 rounded border p-2 text-left transition-colors " +
                (isSelected
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-border bg-bg-card/40 hover:border-amber-500/30")
              }
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-bg/50 text-[10px] font-bold">
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
                    <span className="text-[10px] text-text-dim">⏳ pending</span>
                  )}
                </div>
                {r?.owner.name && (
                  <div className="text-[10px] text-text-dim">
                    👤 {r.owner.name}
                  </div>
                )}
              </div>
              <ChevronRight size={14} className="shrink-0 text-text-dim" />
            </button>
          );
        })}
      </div>

      <div className="rounded border border-amber-500/30 bg-bg-card/40 p-3">
        <HolmesLeadDetail
          lead={selected}
          tab={tab}
          onTabChange={setTab}
          onCopy={copyText}
        />
      </div>
    </div>
  );
}
