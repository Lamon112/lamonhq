"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Search,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  runHolmesForLead,
  bulkRunHolmesHot,
} from "@/app/actions/holmes";
import { StatTile, TabButton, Badge, PrimaryButton, GhostButton } from "@/components/ui/common";
import { formatRelative } from "@/lib/format";
import type { LeadRow } from "@/lib/queries";

type DetailTab = "profile" | "social" | "angle" | "publicity";

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

  // Hot leads only
  const hotLeads = useMemo(
    () =>
      leads
        .filter(
          (l) =>
            (l.icp_score ?? 0) >= 15 &&
            !["closed_won", "closed_lost"].includes(l.stage),
        )
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

  function bulkInvestigate() {
    setError(null);
    setInfo(null);
    startBulkTransition(async () => {
      const res = await bulkRunHolmesHot();
      if (!res.ok) {
        setError("Bulk Holmes greška");
        return;
      }
      setInfo(
        `🕵️ ${res.investigated} leadova istraženo · ${res.skipped} preskočeno (već imaju report)${res.errors.length ? ` · ${res.errors.length} grešaka` : ""}. Refresh za update.`,
      );
      setTimeout(() => window.location.reload(), 2200);
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
      {/* Stats */}
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

      {/* Bulk action + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryButton onClick={bulkInvestigate} disabled={bulkPending}>
          {bulkPending ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Holmes istražuje
              sve…
            </>
          ) : (
            <>
              🕵️ Investigate all Hot
            </>
          )}
        </PrimaryButton>
        <div className="ml-auto flex items-center gap-1">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
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

      {/* Tier filter row */}
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

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Lead list */}
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

        {/* Detail panel */}
        <div className="rounded border border-border bg-bg-card/40 p-3">
          {!selected && (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-text-muted">
              Klikni lead lijevo za detaljni Holmes report
            </div>
          )}
          {selected && (
            <SelectedDetail
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

function SelectedDetail({
  lead,
  tab,
  onTabChange,
  onCopy,
  onRerun,
  rerunPending,
}: {
  lead: LeadRow;
  tab: DetailTab;
  onTabChange: (t: DetailTab) => void;
  onCopy: (s: string) => void;
  onRerun: () => void;
  rerunPending: boolean;
}) {
  const r = lead.holmes_report;
  if (!r) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-sm text-text-muted">
          Holmes nije još istražio {lead.name}
        </p>
        <PrimaryButton onClick={onRerun} disabled={rerunPending}>
          {rerunPending ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Istražujem (~30s)…
            </>
          ) : (
            <>🕵️ Pokreni Holmes</>
          )}
        </PrimaryButton>
      </div>
    );
  }

  const tier = r.pitch_tier ? TIER_LABEL[r.pitch_tier] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{lead.name}</h3>
          <div className="flex flex-wrap items-baseline gap-2 text-[10px] text-text-dim">
            {tier && (
              <span className={tier.color}>
                {tier.emoji} {tier.label} tier
              </span>
            )}
            {r.recommended_package && (
              <span className="text-amber-300">
                💼 {r.recommended_package}
              </span>
            )}
            <span>· refreshed {formatRelative(r.generated_at)}</span>
          </div>
        </div>
        <button
          onClick={onRerun}
          disabled={rerunPending}
          className="text-[10px] text-text-muted hover:text-amber-300 disabled:opacity-50"
        >
          {rerunPending ? <Loader2 size={11} className="animate-spin" /> : "↻ re-run"}
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "profile"} onClick={() => onTabChange("profile")}>
          👤 Profile
        </TabButton>
        <TabButton active={tab === "social"} onClick={() => onTabChange("social")}>
          📊 Social Depth
        </TabButton>
        <TabButton active={tab === "angle"} onClick={() => onTabChange("angle")}>
          🎯 Best Angle
        </TabButton>
        <TabButton active={tab === "publicity"} onClick={() => onTabChange("publicity")}>
          🎤 Publicity
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            <div>
              <div className="text-sm font-semibold text-text">
                {r.owner.name ?? "—"}
              </div>
              {r.owner.title && (
                <div className="text-[11px] text-text-dim">{r.owner.title}</div>
              )}
              {r.owner.bio && (
                <p className="mt-1 text-[11px] text-text-dim">{r.owner.bio}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-dim">
                {r.owner.years_experience != null && (
                  <span>📅 {r.owner.years_experience}+ god</span>
                )}
                {r.owner.education?.length > 0 && (
                  <span>🎓 {r.owner.education.join(", ")}</span>
                )}
                {r.owner.languages?.length > 0 && (
                  <span>🌐 {r.owner.languages.join(", ")}</span>
                )}
              </div>
            </div>

            {/* Reachability */}
            {r.reachability?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  📡 Najbolji kanali (po confidence)
                </div>
                <ul className="mt-1 space-y-1">
                  {[...r.reachability]
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 5)
                    .map((rch, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="text-[11px] font-medium text-amber-200">
                          {Math.round(rch.confidence * 100)}%
                        </span>
                        <a
                          href={rch.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-text underline-offset-2 hover:underline"
                        >
                          {rch.channel}
                        </a>
                        <span className="text-[10px] text-text-dim">
                          {rch.reasoning}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {tab === "social" && (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {r.social_depth ? (
              <>
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-amber-300">
                      Tier
                    </span>
                    {tier && (
                      <span className={`text-sm font-semibold ${tier.color}`}>
                        {tier.emoji} {tier.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-text">
                    {r.social_depth.tier_reason}
                  </p>
                  <p className="mt-1 text-[10px] text-text-dim">
                    Composite score: {r.social_depth.score}/100
                  </p>
                  {r.recommended_package && (
                    <p className="mt-1 text-[11px] text-amber-200">
                      💼 Preporuka: {r.recommended_package}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {r.social_depth.tiktok && (
                    <ChannelDepthCard label="🎵 TikTok" depth={r.social_depth.tiktok} />
                  )}
                  {r.social_depth.instagram && (
                    <ChannelDepthCard label="📷 Instagram" depth={r.social_depth.instagram} />
                  )}
                  {r.social_depth.youtube && (
                    <ChannelDepthCard label="▶️ YouTube" depth={r.social_depth.youtube} />
                  )}
                  {r.social_depth.linkedin && (
                    <ChannelDepthCard label="💼 LinkedIn" depth={r.social_depth.linkedin} />
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-text-dim">
                Holmes nije izmjerio social depth (možda nema dostupnih
                kanala). Pokreni re-run da pokušaš ponovno.
              </p>
            )}
          </motion.div>
        )}

        {tab === "angle" && (
          <motion.div
            key="angle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-300">
                💡 Najbolji kut
              </div>
              <p className="mt-0.5 text-[12px] text-text">
                {r.best_angle.summary}
              </p>
              {r.best_angle.opening_hook && (
                <p className="mt-1.5 rounded border border-amber-500/30 bg-bg/40 px-2 py-1 text-[11px] italic text-amber-200">
                  &quot;{r.best_angle.opening_hook}&quot;
                </p>
              )}
              {r.best_angle.avoid?.length > 0 && (
                <div className="mt-1 flex items-start gap-1 text-[10px] text-danger">
                  <AlertCircle size={10} className="mt-0.5 shrink-0" />
                  <span>Izbjegavaj: {r.best_angle.avoid.join(" · ")}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {r.personal_angles.interests?.length > 0 && (
                <AngleList label="Interesi" items={r.personal_angles.interests} />
              )}
              {r.personal_angles.values?.length > 0 && (
                <AngleList label="Vrijednosti" items={r.personal_angles.values} />
              )}
              {r.personal_angles.recent_activity?.length > 0 && (
                <AngleList label="Recent activity" items={r.personal_angles.recent_activity} />
              )}
              {r.personal_angles.pain_points?.length > 0 && (
                <AngleList label="Pain points" items={r.personal_angles.pain_points} />
              )}
            </div>

            {r.outreach_draft && (
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    ✉️ V8 outreach (Holmes-personalizirano · tier-prilagođen)
                  </span>
                  <button
                    onClick={() => onCopy(r.outreach_draft)}
                    className="flex items-center gap-1 text-[10px] text-text-muted hover:text-amber-300"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
                <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-border bg-bg/60 p-2 text-[11px] font-mono text-text">
                  {r.outreach_draft}
                </pre>
              </div>
            )}
          </motion.div>
        )}

        {tab === "publicity" && (
          <motion.div
            key="publicity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {r.publicity?.length === 0 ? (
              <p className="text-[11px] text-text-dim">
                Holmes nije našao publicity hits (intervjue, podcasts,
                predavanja).
              </p>
            ) : (
              <ul className="space-y-1.5">
                {r.publicity.map((p, i) => (
                  <li key={i} className="rounded border border-border bg-bg/40 p-2">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-medium text-amber-200 hover:underline"
                    >
                      {p.title} <ExternalLink size={10} className="inline" />
                    </a>
                    {p.snippet && (
                      <p className="mt-0.5 text-[11px] text-text-dim">
                        {p.snippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChannelDepthCard({
  label,
  depth,
}: {
  label: string;
  depth: {
    followers?: number;
    postsCount?: number;
    totalViews?: number;
    topViewCount?: number;
    status: string;
    reason?: string;
  };
}) {
  const tone =
    depth.status === "alive"
      ? "border-success/30 bg-success/5"
      : depth.status === "dormant"
        ? "border-warning/30 bg-warning/5"
        : depth.status === "dead"
          ? "border-danger/30 bg-danger/5"
          : "border-border bg-bg/40";
  return (
    <div className={`rounded border ${tone} p-2`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-text">{label}</span>
        <span className="text-[10px] text-text-dim">{depth.status}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-dim">
        {depth.followers != null && <span>👥 {fmt(depth.followers)}</span>}
        {depth.postsCount != null && <span>📝 {depth.postsCount}</span>}
        {depth.totalViews != null && (
          <span>👁 {fmt(depth.totalViews)}</span>
        )}
        {depth.topViewCount != null && (
          <span className="text-amber-300">🚀 top {fmt(depth.topViewCount)}</span>
        )}
      </div>
    </div>
  );
}

function AngleList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <ul className="mt-0.5 space-y-0.5">
        {items.slice(0, 4).map((it, i) => (
          <li key={i} className="text-[11px] text-text">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
