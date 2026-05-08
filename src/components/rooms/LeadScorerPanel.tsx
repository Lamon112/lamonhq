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
  runProspector,
  addProspectsToPipeline,
  bulkReEnrichUnscored,
  type ProspectCandidate,
} from "@/app/actions/prospector";
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

      {tab === "discover" && <ProspectorTab />}

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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              <BulkRescoreButton />
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
// AI Prospector — Discover tab (Places + Apollo enrich)
// =====================================================================

interface SelectedPersonState {
  candidateIdx: number;
  personIdx: number;
}

function ProspectorTab() {
  const [niche, setNiche] = useState("stomatološka klinika");
  const [location, setLocation] = useState("Zagreb");
  const [count, setCount] = useState(10);
  const [results, setResults] = useState<ProspectCandidate[]>([]);
  const [enrichedCount, setEnrichedCount] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedPersons, setSelectedPersons] = useState<
    Record<number, number | null>
  >({});
  const [busyAdd, setBusyAdd] = useState(false);

  function run() {
    setError(null);
    setInfo(null);
    setResults([]);
    setSelectedPersons({});
    if (!niche.trim() || !location.trim()) {
      setError("Niche + lokacija su obavezni");
      return;
    }
    startTransition(async () => {
      const res = await runProspector({
        niche: niche.trim(),
        location: location.trim(),
        count,
        regionCode: "hr",
      });
      if (!res.ok) {
        setError(res.error ?? "Prospector greška");
        return;
      }
      setResults(res.candidates ?? []);
      setEnrichedCount(res.enrichedCount ?? 0);
      setPeopleCount(res.peopleCount ?? 0);
    });
  }

  function pickPerson(idx: number, personIdx: number | null) {
    setSelectedPersons((prev) => ({ ...prev, [idx]: personIdx }));
  }

  function addAll() {
    if (results.length === 0) return;
    setBusyAdd(true);
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await addProspectsToPipeline({ candidates: results });
      setBusyAdd(false);
      if (!res.ok) {
        setError(res.error ?? "Add to pipeline greška");
        return;
      }
      setInfo(
        `${res.added} klijenata dodano u Pipeline (s ICP score-om i kontaktima vlasnika). Otvori List tab da vidiš.`,
      );
    });
  }

  return (
    <motion.div
      key="prospector"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/5 via-bg-elevated/40 to-purple-500/5 p-3 text-xs text-text-dim">
        🤖 <strong className="text-orange-300">AI Prospector</strong> — kažeš
        koliko + koji niche + grad, AI ti ulovi listu klinika preko Google
        Mapsa, enrichaj kroz Apollo (industry + employees + LinkedIn) i pokaže
        decision-makere. Sve <em>besplatno</em> (Google Places $200 free credit
        /mj, Apollo Free enrich + top_people).
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field
          label="Niche keyword *"
          hint="npr. stomatološka klinika, estetska klinika, fizio, dermatologija"
        >
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="stomatološka klinika"
            className="input"
          />
        </Field>
        <Field
          label="Grad / lokacija *"
          hint="Zagreb / Split / Hrvatska / Ljubljana"
        >
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Zagreb"
            className="input"
          />
        </Field>
        <Field label="Koliko klinika (1-20)">
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.min(20, Math.max(1, +e.target.value || 10)))}
            className="input"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={run}
          disabled={pending || !niche.trim() || !location.trim()}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {pending ? "AI traži…" : "🔍 Find clinics"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-success/40 bg-success/10 p-2 text-xs text-success">
          {info}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
          <span>
            ✅ {results.length} klinika · 🔬 {enrichedCount} Apollo enriched ·
            🤖{" "}
            {results.filter((r) => typeof r.icpScore === "number").length}{" "}
            AI-scored · 👥{" "}
            {results.reduce((s, r) => s + (r.owners?.length ?? 0), 0)} vlasnika
            izvučeno
          </span>
          <button
            type="button"
            onClick={addAll}
            disabled={busyAdd || pending}
            className="flex items-center gap-1.5 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-[11px] font-medium text-orange-300 hover:border-orange-500/70 disabled:opacity-50"
          >
            {busyAdd ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <UserPlus size={11} />
            )}
            Add all to pipeline
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {results.map((c, idx) => {
          const selectedPersonIdx = selectedPersons[idx];
          return (
            <li
              key={c.placeId}
              className="rounded-lg border border-border bg-bg-card/40 p-3 hover:border-orange-500/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {typeof c.icpScore === "number" && (
                      <span
                        className={
                          "flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-md border text-xs font-bold " +
                          (c.icpScore >= 15
                            ? "border-success/60 bg-success/15 text-success"
                            : c.icpScore >= 10
                              ? "border-warning/60 bg-warning/15 text-warning"
                              : "border-border bg-bg/60 text-text-muted")
                        }
                        title={c.scoreReasoning ?? "AI ICP score"}
                      >
                        <span className="leading-none">{c.icpScore}</span>
                        <span className="text-[8px] opacity-70 uppercase tracking-wider">
                          /20
                        </span>
                      </span>
                    )}
                    <span className="text-sm font-semibold text-text">
                      {c.name}
                    </span>
                    {typeof c.rating === "number" && (
                      <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                        ⭐ {c.rating.toFixed(1)}
                        {c.reviewCount ? ` · ${c.reviewCount}` : ""}
                      </span>
                    )}
                    {c.apolloOrg?.estimated_num_employees && (
                      <span className="rounded border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-300">
                        {c.apolloOrg.estimated_num_employees} emp
                      </span>
                    )}
                    {c.apolloOrg?.industry && (
                      <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[10px] text-text-muted">
                        {c.apolloOrg.industry}
                      </span>
                    )}
                  </div>
                  {c.scoreReasoning && (
                    <p className="mt-1 text-[11px] italic text-text-dim">
                      🤖 {c.scoreReasoning}
                    </p>
                  )}
                  {c.premiumSignals && c.premiumSignals.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.premiumSignals.map((sig, i) => (
                        <span
                          key={i}
                          className="rounded border border-purple-500/30 bg-purple-500/5 px-1.5 py-0.5 text-[9px] text-purple-300"
                        >
                          ✨ {sig}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.address && (
                    <p className="mt-0.5 text-[11px] text-text-dim">
                      📍 {c.address}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        🌐 {c.domain ?? c.website}
                      </a>
                    )}
                    {c.phone && (
                      <span className="text-text-dim">📞 {c.phone}</span>
                    )}
                    {c.googleMapsUri && (
                      <a
                        href={c.googleMapsUri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-muted hover:underline"
                      >
                        Maps
                      </a>
                    )}
                    {c.apolloOrg?.linkedin_url && (
                      <a
                        href={c.apolloOrg.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Org LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {c.owners && c.owners.length > 0 && (
                <div className="mt-3 rounded-md border border-purple-500/20 bg-purple-500/5 p-2">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-purple-300">
                    🤖 AI izvukao vlasnike ({c.owners.length})
                  </div>
                  <div className="space-y-0.5">
                    {c.owners.map((o, pIdx) => (
                      <div
                        key={`${idx}-owner-${pIdx}`}
                        className="flex items-center justify-between gap-2 rounded px-2 py-1 text-[11px] text-text-dim hover:bg-bg-card/60"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {pIdx === 0 && (
                            <span className="rounded border border-success/40 bg-success/10 px-1 py-0 text-[9px] uppercase tracking-wider text-success">
                              primary
                            </span>
                          )}
                          <span className="font-medium text-text">
                            {o.name}
                          </span>
                          {o.role && (
                            <span className="text-text-muted">
                              · {o.role}
                            </span>
                          )}
                          {o.email && (
                            <span className="rounded border border-success/30 bg-success/5 px-1 py-0 text-[9px] text-success">
                              {o.email}
                            </span>
                          )}
                          {o.phone && (
                            <span className="text-text-muted">
                              📞 {o.phone}
                            </span>
                          )}
                        </div>
                        {o.linkedin && (
                          <a
                            href={o.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            <ExternalLink size={10} className="inline" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!c.owners || c.owners.length === 0) &&
                c.scrapedPages &&
                c.scrapedPages.length > 0 && (
                  <div className="mt-2 text-[10px] italic text-text-muted">
                    Web scraping nije našao konkretnog vlasnika — provjeri
                    ručno na LinkedIn-u ili klinika nema "Tim" stranicu.
                  </div>
                )}
              {(!c.scrapedPages || c.scrapedPages.length === 0) &&
                c.website && (
                  <div className="mt-2 text-[10px] italic text-text-muted">
                    Website nije bio dostupan za AI scrape.
                  </div>
                )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

// =====================================================================
// Bulk re-score unscored leads (AI scrape + score in batch)
// =====================================================================

function BulkRescoreButton() {
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setInfo(null);
    setError(null);
    startTransition(async () => {
      const res = await bulkReEnrichUnscored();
      if (!res.ok) {
        setError(res.error ?? "Bulk re-score greška");
        return;
      }
      if (res.scanned === 0) {
        setInfo("Nema unscored leadova — svi su već score-ani.");
      } else {
        setInfo(
          `🤖 ${res.scored}/${res.scanned} score-ano${res.skipped > 0 ? ` · ${res.skipped} preskočeno (bez website-a)` : ""}. Refresh za update.`,
        );
        // Refresh after a short delay so users sees the info first
        setTimeout(() => window.location.reload(), 1800);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-[10px] font-medium text-orange-300 hover:border-orange-500/70 disabled:opacity-50"
        title="AI prolazi kroz sve unscored leadove i score-a ih (scrape + ICP)"
      >
        {pending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Wand2 size={11} />
        )}
        {pending ? "AI score-a…" : "🤖 AI score sve unscored"}
      </button>
      {info && (
        <span className="text-[10px] text-success">{info}</span>
      )}
      {error && (
        <span className="text-[10px] text-danger">{error}</span>
      )}
    </div>
  );
}

