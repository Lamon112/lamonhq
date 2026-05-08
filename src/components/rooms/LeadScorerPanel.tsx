"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  Brain,
  Plus,
  Flame,
  Trash2,
  ChevronRight,
  ArrowRight,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  Search,
  Loader2,
  ExternalLink,
  UserPlus,
  Mail as MailIcon,
} from "lucide-react";
import { addLead, updateLead, deleteLead } from "@/app/actions/leads";
import { scoreLead, saveAiFeedback } from "@/app/actions/ai";
import {
  searchProspects,
  addProspectToPipeline,
  type DiscoveryFilters,
} from "@/app/actions/apollo";
import type { ApolloPerson } from "@/lib/apollo";
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
import type { LeadRow, LeadsStats } from "@/lib/queries";

type Tab = "list" | "score" | "discover";

interface LeadScorerPanelProps {
  initialList: LeadRow[];
  initialStats: LeadsStats;
}

interface ICPCriterionDef {
  key: string;
  label: string;
  description: string;
}

const ICP_CRITERIA: ICPCriterionDef[] = [
  {
    key: "lice_branda",
    label: "Lice branda",
    description: "Klijent IMA jasno lice (founder ili netko prepoznatljiv)",
  },
  {
    key: "edge",
    label: "Edge",
    description: "Imaju jasnu razliku od konkurencije (USP, niche, story)",
  },
  {
    key: "premium",
    label: "Premium",
    description: "Pozicioniranje i cijena su premium tier (ne discount)",
  },
  {
    key: "dokaz",
    label: "Dokaz",
    description: "Postoje testimonials/ rezultati / case studies",
  },
  {
    key: "brzina_odluke",
    label: "Brzina odluke",
    description: "Odlučivanje je brzo (1-2 osobe, ne committee)",
  },
];

const NICHE_LABEL: Record<string, string> = {
  stomatologija: "Stomatologija",
  estetska: "Estetska",
  fizio: "Fizioterapija",
  ortopedija: "Ortopedija",
  coach: "Coach",
  other: "Other",
};

const SOURCE_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  referral: "Referral",
  other: "Other",
};

const STAGE_LABEL: Record<LeadRow["stage"], string> = {
  discovery: "Discovery",
  pricing: "Pricing",
  financing: "Financing",
  booking: "Booking",
  closed_won: "Won",
  closed_lost: "Lost",
};

const STAGE_TONE: Record<
  LeadRow["stage"],
  "gold" | "warning" | "success" | "danger" | "neutral"
> = {
  discovery: "neutral",
  pricing: "gold",
  financing: "warning",
  booking: "warning",
  closed_won: "success",
  closed_lost: "danger",
};

export function LeadScorerPanel({
  initialList,
  initialStats,
}: LeadScorerPanelProps) {
  const [tab, setTab] = useState<Tab>("list");
  const [list, setList] = useState(initialList);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<"all" | "hot" | "warm" | "cold">(
    "all",
  );

  // Form state
  const [name, setName] = useState("");
  const [source, setSource] = useState<LeadRow["source"]>("linkedin");
  const [niche, setNiche] = useState<LeadRow["niche"]>("stomatologija");
  const [breakdown, setBreakdown] = useState<Record<string, number>>(
    Object.fromEntries(ICP_CRITERIA.map((c) => [c.key, 0])),
  );
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");

  // AI scorer state
  const [aiProfile, setAiProfile] = useState("");
  const [aiResult, setAiResult] = useState<{
    breakdown: Record<string, number>;
    confidence: string;
    reasoning: Record<string, string>;
    summary: string;
    raw: string;
  } | null>(null);
  const [aiRated, setAiRated] = useState<"good" | "bad" | null>(null);

  function runAiScore() {
    setError(null);
    if (aiProfile.trim().length < 30) {
      setError("Paste-aj makar bio + 1-2 posta (min 30 znakova)");
      return;
    }
    startTransition(async () => {
      const res = await scoreLead({ profileText: aiProfile });
      if (!res.ok || !res.result) {
        setError(res.error ?? "AI greška");
        return;
      }
      const r = res.result;
      // Auto-fill form fields
      setName(r.suggested_name);
      setNiche(r.suggested_niche);
      setSource(r.suggested_source);
      setBreakdown({
        lice_branda: r.icp_breakdown.lice_branda,
        edge: r.icp_breakdown.edge,
        premium: r.icp_breakdown.premium,
        dokaz: r.icp_breakdown.dokaz,
        brzina_odluke: r.icp_breakdown.brzina_odluke,
      });
      // Append summary to notes
      const reasoningBlock = ICP_CRITERIA.map(
        (c) =>
          `· ${c.label} (${r.icp_breakdown[c.key as keyof typeof r.icp_breakdown]}/4): ${r.reasoning[c.key as keyof typeof r.reasoning]}`,
      ).join("\n");
      setNotes(
        `🤖 AI summary: ${r.summary}\n\n${reasoningBlock}\n\n--- Original profile ---\n${aiProfile.slice(0, 1000)}`,
      );
      setAiResult({
        breakdown: r.icp_breakdown as unknown as Record<string, number>,
        confidence: r.confidence,
        reasoning: r.reasoning as unknown as Record<string, string>,
        summary: r.summary,
        raw: res.raw ?? "",
      });
      setAiRated(null);
    });
  }

  function rateAi(rating: "good" | "bad") {
    if (!aiResult) return;
    setAiRated(rating);
    startTransition(async () => {
      await saveAiFeedback({
        kind: "lead_score",
        input: { profileText: aiProfile },
        output: aiResult.raw,
        rating,
      });
    });
  }

  const totalScore = Object.values(breakdown).reduce(
    (s, v) => s + (Number(v) || 0),
    0,
  );

  function recalcStats(rows: LeadRow[]): LeadsStats {
    const s: LeadsStats = {
      total: rows.length,
      hot: 0,
      warm: 0,
      cold: 0,
      byStage: {
        discovery: 0,
        pricing: 0,
        financing: 0,
        booking: 0,
        closed_won: 0,
        closed_lost: 0,
      },
    };
    for (const l of rows) {
      const sc = l.icp_score ?? 0;
      if (sc >= 15) s.hot += 1;
      else if (sc >= 10) s.warm += 1;
      else s.cold += 1;
      s.byStage[l.stage] += 1;
    }
    return s;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Ime lead-a je obavezno");
    const ev = parseFloat(estimatedValue.replace(",", ".")) || null;
    startTransition(async () => {
      const res = await addLead({
        name: name.trim(),
        source,
        niche,
        icpBreakdown: breakdown,
        estimatedValue: ev,
        notes,
      });
      if (!res.ok) return setError(res.error ?? "Greška");
      const newRow: LeadRow = {
        id: res.id ?? crypto.randomUUID(),
        name: name.trim(),
        source,
        niche,
        icp_score: totalScore,
        icp_breakdown: breakdown,
        stage: "discovery",
        estimated_value: ev,
        probability: null,
        next_action: null,
        next_action_date: null,
        notes: notes || null,
        discovery_at: null,
        discovery_outcome: null,
        discovery_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const next = [newRow, ...list].sort(
        (a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0),
      );
      setList(next);
      setStats(recalcStats(next));
      // reset
      setName("");
      setBreakdown(
        Object.fromEntries(ICP_CRITERIA.map((c) => [c.key, 0])),
      );
      setEstimatedValue("");
      setNotes("");
      setTab("list");
    });
  }

  function setStage(id: string, stage: LeadRow["stage"]) {
    startTransition(async () => {
      const prev = list;
      const next = list.map((l) => (l.id === id ? { ...l, stage } : l));
      setList(next);
      setStats(recalcStats(next));
      const res = await updateLead({ id, stage });
      if (!res.ok) {
        setList(prev);
        setStats(recalcStats(prev));
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Obrisati lead?")) return;
    startTransition(async () => {
      const prev = list;
      const next = list.filter((l) => l.id !== id);
      setList(next);
      setStats(recalcStats(next));
      const res = await deleteLead(id);
      if (!res.ok) {
        setList(prev);
        setStats(recalcStats(prev));
      }
    });
  }

  function bandFor(score: number): "hot" | "warm" | "cold" {
    if (score >= 15) return "hot";
    if (score >= 10) return "warm";
    return "cold";
  }

  const filtered = list.filter((l) => {
    if (scoreFilter === "all") return true;
    return bandFor(l.icp_score ?? 0) === scoreFilter;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Total" value={stats.total.toString()} />
        <StatTile
          label="Hot · ≥15"
          value={stats.hot.toString()}
          accent="success"
        />
        <StatTile
          label="Warm · 10-14"
          value={stats.warm.toString()}
          accent="warning"
        />
        <StatTile label="Cold · <10" value={stats.cold.toString()} />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          <Brain size={14} /> List · {list.length}
        </TabButton>
        <TabButton active={tab === "score"} onClick={() => setTab("score")}>
          <Plus size={14} /> Score new lead
        </TabButton>
        <TabButton
          active={tab === "discover"}
          onClick={() => setTab("discover")}
        >
          <Search size={14} /> Discover · Apollo
        </TabButton>
      </div>

      {tab === "discover" && <DiscoverApolloTab />}

      <AnimatePresence mode="wait">
        {tab === "score" && (
          <motion.form
            key="score"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={submit}
            className="space-y-4"
          >
            {/* AI HELPER */}
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gold flex items-center gap-1.5">
                  <Wand2 size={12} />
                  ✨ AI Lead Scorer (Claude)
                </span>
                <span className="text-[10px] text-text-muted">
                  Paste profil → auto-popunja sve fieldove
                </span>
              </div>
              <textarea
                className="input font-mono text-[11px]"
                rows={3}
                value={aiProfile}
                onChange={(e) => setAiProfile(e.target.value)}
                placeholder="Paste LinkedIn About + 1-2 posta · ili IG bio + best videos · ili web stranica section · što imaš"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={runAiScore}
                  disabled={pending || aiProfile.trim().length < 30}
                  className="flex items-center gap-2 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-bg transition-colors hover:bg-gold-bright disabled:opacity-40"
                >
                  <Wand2 size={12} />
                  {pending ? "Analyzing…" : "Analiziraj profil"}
                </button>
                {aiResult && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Badge
                      tone={
                        aiResult.confidence === "high"
                          ? "success"
                          : aiResult.confidence === "medium"
                            ? "gold"
                            : "neutral"
                      }
                    >
                      confidence: {aiResult.confidence}
                    </Badge>
                    {aiRated === null ? (
                      <>
                        <span className="text-text-muted">AI je dobro pogodio?</span>
                        <button
                          type="button"
                          onClick={() => rateAi("good")}
                          className="rounded p-1 text-success transition-colors hover:bg-success/10"
                          title="👍 Good — AI uči ovo"
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
                    ) : aiRated === "good" ? (
                      <span className="text-success">👍 Saved · AI uči</span>
                    ) : (
                      <span className="text-warning">👎 Saved</span>
                    )}
                  </div>
                )}
              </div>
              {aiResult && (
                <p className="text-[11px] italic text-text-dim">
                  💬 {aiResult.summary}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ime / klinika *">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Estetska klinika Zagreb"
                  autoFocus
                />
              </Field>
              <Field label="Niche">
                <select
                  className="input"
                  value={niche ?? "stomatologija"}
                  onChange={(e) =>
                    setNiche(e.target.value as LeadRow["niche"])
                  }
                >
                  {Object.entries(NICHE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Source">
                <select
                  className="input"
                  value={source ?? "linkedin"}
                  onChange={(e) =>
                    setSource(e.target.value as LeadRow["source"])
                  }
                >
                  {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estimated value €">
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="3494 (1997 setup + 1497 mj)"
                />
              </Field>
            </div>

            <div className="rounded-lg border border-border bg-bg-card/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider text-text-muted">
                  ICP score · 5 kriterija (0-4)
                </h4>
                <ScoreBadge score={totalScore} />
              </div>

              {ICP_CRITERIA.map((c) => (
                <div key={c.key} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-medium text-text">
                        {c.label}
                      </span>
                      <span className="ml-2 text-[10px] text-text-muted">
                        {c.description}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gold">
                      {breakdown[c.key]}/4
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setBreakdown({ ...breakdown, [c.key]: v })
                        }
                        className={
                          "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors " +
                          (breakdown[c.key] === v
                            ? "bg-gold text-bg"
                            : "border border-border bg-bg-card text-text-dim hover:border-gold/50")
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {aiResult?.reasoning?.[c.key] && (
                    <p className="text-[10px] italic text-text-dim border-l-2 border-gold/30 pl-2">
                      🤖 {aiResult.reasoning[c.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Field label="Notes">
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Što si vidio kod njih, koji video / post, kontakt info…"
              />
            </Field>

            <ErrorBanner message={error} />

            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Lead se pohranjuje u stage <code>discovery</code>. Pomakni u
                pricing kad pošaljemo ponudu.
              </p>
              <div className="flex gap-2">
                <GhostButton onClick={() => setTab("list")}>Cancel</GhostButton>
                <PrimaryButton disabled={pending} icon={<Plus size={14} />}>
                  {pending ? "Saving…" : `Save lead · ${totalScore}/20`}
                </PrimaryButton>
              </div>
            </div>
          </motion.form>
        )}

        {tab === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ["all", `Svi · ${list.length}`],
                  ["hot", `🔥 Hot · ${stats.hot}`],
                  ["warm", `Warm · ${stats.warm}`],
                  ["cold", `Cold · ${stats.cold}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setScoreFilter(k as typeof scoreFilter)}
                  className={
                    "rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors " +
                    (scoreFilter === k
                      ? "border-gold text-gold"
                      : "border-border text-text-muted hover:border-gold/40 hover:text-text-dim")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Još nema leadova u ovom filteru. Score-aj prvog ↑
              </div>
            )}

            <ul className="space-y-2">
              {filtered.map((l) => {
                const score = l.icp_score ?? 0;
                const isOpen = expanded === l.id;
                return (
                  <li
                    key={l.id}
                    className="rounded-lg border border-border bg-bg-card/60 transition-colors hover:border-gold/40"
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : l.id)}
                      className="flex w-full items-start gap-3 p-3 text-left"
                    >
                      <ScorePill score={score} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-text">
                            {l.name}
                          </span>
                          <Badge tone={STAGE_TONE[l.stage]}>
                            {STAGE_LABEL[l.stage]}
                          </Badge>
                          {l.niche && (
                            <Badge tone="neutral">{NICHE_LABEL[l.niche]}</Badge>
                          )}
                          {l.source && (
                            <Badge tone="neutral">
                              {SOURCE_LABEL[l.source]}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-text-dim">
                          {l.estimated_value && (
                            <span>
                              ~{" "}
                              {formatEuro(
                                Math.round(Number(l.estimated_value) * 100),
                                { compact: true },
                              )}{" "}
                              value
                            </span>
                          )}
                          <span>{formatRelative(l.created_at)}</span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={
                          "shrink-0 transition-transform " +
                          (isOpen ? "rotate-90" : "")
                        }
                      />
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-border px-3 pb-3 pt-2"
                      >
                        {l.icp_breakdown &&
                          Object.keys(l.icp_breakdown).length > 0 && (
                            <div className="mb-2 space-y-1">
                              {ICP_CRITERIA.map((c) => (
                                <div
                                  key={c.key}
                                  className="flex items-center gap-2 text-[11px]"
                                >
                                  <span className="w-28 text-text-muted">
                                    {c.label}
                                  </span>
                                  <div className="flex-1">
                                    <div className="h-1 rounded-full bg-bg">
                                      <div
                                        className="h-full rounded-full bg-gold"
                                        style={{
                                          width: `${
                                            ((l.icp_breakdown?.[c.key] ?? 0) /
                                              4) *
                                            100
                                          }%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="w-6 text-right text-text-dim">
                                    {l.icp_breakdown?.[c.key] ?? 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        {l.notes && (
                          <p className="mb-2 whitespace-pre-wrap text-[11px] text-text-dim">
                            {l.notes}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              "discovery",
                              "pricing",
                              "financing",
                              "booking",
                              "closed_won",
                              "closed_lost",
                            ] as LeadRow["stage"][]
                          )
                            .filter((s) => s !== l.stage)
                            .map((s) => (
                              <GhostButton
                                key={s}
                                icon={<ArrowRight size={11} />}
                                onClick={() => setStage(l.id, s)}
                              >
                                {STAGE_LABEL[s]}
                              </GhostButton>
                            ))}
                          <button
                            onClick={() => remove(l.id)}
                            className="ml-auto rounded p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            title="Obriši"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 15
      ? "border-success/40 bg-success/10 text-success"
      : score >= 10
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-border bg-bg-card text-text-dim";
  return (
    <div
      className={
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold " +
        tone
      }
    >
      {score >= 15 && <Flame size={11} />}
      {score} / 20
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 15
      ? "border-success bg-success/20 text-success"
      : score >= 10
        ? "border-warning bg-warning/20 text-warning"
        : "border-border bg-bg-card/60 text-text-dim";
  return (
    <div
      className={
        "flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-md border text-xs " +
        tone
      }
    >
      <span className="font-semibold leading-none">{score}</span>
      <span className="text-[8px] uppercase tracking-wider opacity-70">/20</span>
    </div>
  );
}

// =====================================================================
// Discover via Apollo — sub-tab
// =====================================================================

function DiscoverApolloTab() {
  const [country, setCountry] = useState("Croatia");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("klinika");
  const [titles, setTitles] = useState("owner, founder, director, ceo");
  const [results, setResults] = useState<ApolloPerson[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealEmail, setRevealEmail] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  function search(nextPage = 1) {
    setError(null);
    const filters: DiscoveryFilters = {
      countries: country.trim() ? [country.trim()] : undefined,
      cities: city.trim() ? [city.trim()] : undefined,
      organizationKeyword: keyword.trim() || undefined,
      titles: titles
        ? titles
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      page: nextPage,
    };
    startTransition(async () => {
      const res = await searchProspects(filters);
      if (!res.ok) {
        setError(res.error ?? "Apollo search greška");
        return;
      }
      setResults(res.people ?? []);
      setTotal(res.total ?? null);
      setPage(nextPage);
    });
  }

  function add(person: ApolloPerson) {
    setBusyId(person.id);
    startTransition(async () => {
      const res = await addProspectToPipeline({
        apolloPersonId: person.id,
        firstName: person.first_name,
        lastName: person.last_name,
        title: person.title ?? person.headline,
        email: person.email,
        linkedinUrl: person.linkedin_url,
        organizationName: person.organization?.name,
        organizationDomain: person.organization?.primary_domain,
        organizationCity: person.organization?.organization_city,
        organizationCountry: person.organization?.organization_country,
        revealEmail,
      });
      setBusyId(null);
      if (!res.ok) {
        setError(res.error ?? "Greška pri dodavanju");
        return;
      }
      setAddedIds((prev) => new Set(prev).add(person.id));
    });
  }

  return (
    <motion.div
      key="discover"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-text-dim">
        🔍 <strong className="text-orange-300">Apollo lead discovery</strong> —
        pronađi vlasnike/direktore klinika u HR/EU. Search je free, email reveal
        koristi 1 credit (Free tier 100/mj).
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Country">
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Croatia"
            className="input"
          />
        </Field>
        <Field label="City (optional)">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Zagreb"
            className="input"
          />
        </Field>
        <Field
          label="Organization keyword *"
          hint="npr. klinika, dental, estetska, fizio, ortopedija, beauty"
        >
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="klinika"
            className="input"
          />
        </Field>
        <Field
          label="Decision-maker titles"
          hint="comma-separated: owner, founder, director, ceo, chief"
        >
          <input
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
            placeholder="owner, founder, director, ceo"
            className="input"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[11px] text-text-dim">
          <input
            type="checkbox"
            checked={revealEmail}
            onChange={(e) => setRevealEmail(e.target.checked)}
            className="accent-orange-500"
          />
          Reveal email kad klikneš Add (1 credit per prospect)
        </label>
        <button
          type="button"
          onClick={() => search(1)}
          disabled={pending || !keyword.trim()}
          className="flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300 transition-colors hover:bg-orange-500/20 disabled:opacity-40"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {pending ? "Searching…" : "Search Apollo"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="text-[11px] text-text-muted">
          {total !== null
            ? `${total.toLocaleString("hr-HR")} ukupno · prikazano ${results.length} (page ${page})`
            : `Prikazano ${results.length}`}
        </div>
      )}

      <ul className="space-y-2">
        {results.map((p) => {
          const fullName =
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            p.name ||
            "?";
          const isAdded = addedIds.has(p.id);
          const busy = busyId === p.id;
          const emailMissing =
            !p.email || p.email.includes("email_not_unlocked");
          return (
            <li
              key={p.id}
              className="rounded-lg border border-border bg-bg-card/40 p-3 hover:border-orange-500/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      {fullName}
                    </span>
                    {p.title && (
                      <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[10px] text-text-muted">
                        {p.title}
                      </span>
                    )}
                    {p.linkedin_url && (
                      <a
                        href={p.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
                      >
                        <ExternalLink size={10} /> LinkedIn
                      </a>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-text-dim">
                    {p.organization?.name ?? "?"}
                    {p.organization?.organization_city && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-text-muted">
                          {p.organization.organization_city}
                        </span>
                      </>
                    )}
                    {p.organization?.organization_country && (
                      <>
                        ,{" "}
                        <span className="text-text-muted">
                          {p.organization.organization_country}
                        </span>
                      </>
                    )}
                  </div>
                  {p.email && !emailMissing && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-success">
                      <MailIcon size={10} /> {p.email}
                    </div>
                  )}
                  {emailMissing && (
                    <div className="mt-0.5 text-[10px] text-text-muted italic">
                      Email locked — reveal koristi 1 credit
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => add(p)}
                  disabled={busy || isAdded}
                  className={
                    "flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors " +
                    (isAdded
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:border-orange-500/70 disabled:opacity-50")
                  }
                >
                  {busy ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : isAdded ? (
                    <ThumbsUp size={11} />
                  ) : (
                    <UserPlus size={11} />
                  )}
                  {isAdded ? "U pipelineu" : "Add to pipeline"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {results.length > 0 && total !== null && total > results.length && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => search(page + 1)}
            disabled={pending}
            className="rounded-md border border-border bg-bg-card px-3 py-1 text-[11px] text-text-dim hover:border-orange-500/40 disabled:opacity-50"
          >
            Sljedeća stranica →
          </button>
        </div>
      )}
    </motion.div>
  );
}
