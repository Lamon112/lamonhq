"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Trophy,
  Zap,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { trackMetaEvent } from "./MetaPixel";

interface QuizLead {
  id: string;
  responses: Record<string, unknown>;
  score: number | null;
  weaknesses: Array<{ label: string; percent: number; color: string; diagnosis?: string }> | null;
  matched_case_study: string | null;
  ai_output_md: string | null;
  lead_email: string | null;
  lead_name: string | null;
  generated_at: string | null;
}

const CASE_STUDY_LABEL: Record<string, { name: string; tagline: string; result: string }> = {
  tom_17k: {
    name: "Tom",
    tagline: "Faceless TikTok + AI alati",
    result: "17.000€ za 3 mjeseca",
  },
  matija_3k: {
    name: "Matija",
    tagline: "Faceless ASMR Reels",
    result: "3.000€ za 2 mjeseca",
  },
  vuk_5k: {
    name: "Vuk",
    tagline: "Longform YouTube dokumentarci",
    result: "5.000€ mjesečno",
  },
  filmovi_30k: {
    name: "Filmovi Ukratko",
    tagline: "Recap kanal — 60s sažeci",
    result: "30.000 followera",
  },
  borna_doc: {
    name: "Borna",
    tagline: "Dokumentira put 0-to-hero",
    result: "0 → 12K za 4 mjeseca",
  },
};

export function QuizResult({ lead }: { lead: QuizLead }) {
  // If still generating (no score yet), poll every 3s.
  const [current, setCurrent] = useState(lead);
  useEffect(() => {
    if (current.score !== null && current.ai_output_md) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/quiz/lead/${current.id}`);
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.score !== null && fresh.ai_output_md) {
            setCurrent(fresh);
            clearInterval(interval);
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [current.id, current.score, current.ai_output_md]);

  const name = current.lead_name?.trim() || "ti";

  if (current.score === null || !current.ai_output_md) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-gold" />
        <h2 className="text-xl font-semibold">AI još uvijek gradi tvoj plan…</h2>
        <p className="mt-2 max-w-md text-sm text-text-dim">
          Ovo traje 30-60 sek. Stranica se osvježava sama.
        </p>
      </div>
    );
  }

  const score = current.score;
  const matched = current.matched_case_study
    ? CASE_STUDY_LABEL[current.matched_case_study]
    : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <span className="text-xs font-semibold tracking-wider text-gold">
            TVOJ OSOBNI SIDE HUSTLE PLAN
          </span>
        </div>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          {name}, evo tvog rezultata
        </h1>
      </div>

      {/* Score circle */}
      <div className="mb-12 flex flex-col items-center">
        <ScoreCircle score={score} />
      </div>

      {/* Weakness bars */}
      {current.weaknesses && current.weaknesses.length > 0 && (
        <div className="mb-12 rounded-2xl border border-border bg-bg-card p-6 md:p-8">
          <h2 className="mb-1 text-xl font-bold">Tvoje top 3 prepreke</h2>
          <p className="mb-6 text-sm text-text-dim">
            Što te baš sada najviše drži natrag (po našoj analizi tvojih odgovora):
          </p>
          <div className="space-y-5">
            {current.weaknesses.map((w, i) => (
              <WeaknessBar key={i} weakness={w} />
            ))}
          </div>
        </div>
      )}

      {/* Matched case study */}
      {matched && (
        <div className="mb-12 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1">
            <Trophy className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs font-bold tracking-wider text-gold">
              CASE STUDY KOJI TI ODGOVARA
            </span>
          </div>
          <h2 className="mb-1 text-2xl font-bold">{matched.name}</h2>
          <p className="text-sm text-text-dim">{matched.tagline}</p>
          <div className="mt-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <span className="text-lg font-bold text-success">
              {matched.result}
            </span>
          </div>
        </div>
      )}

      {/* AI output (markdown plan) */}
      <div className="mb-12 rounded-2xl border border-border bg-bg-card p-6 md:p-8">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
          <Zap className="h-5 w-5 text-gold" />
          Tvoj 30-dnevni plan
        </h2>
        <div className="prose prose-invert prose-sm max-w-none mt-6 space-y-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mt-6 text-2xl font-bold text-text">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mt-6 text-xl font-bold text-gold">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-4 text-base font-semibold text-text">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed text-text">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="my-2 list-inside list-disc space-y-1 text-sm text-text">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2 list-inside list-decimal space-y-1 text-sm text-text">
                  {children}
                </ol>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-gold">{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-4 border-l-2 border-gold pl-4 italic text-text-dim">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-6 border-border" />,
              code: ({ children }) => (
                <code className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs text-gold">
                  {children}
                </code>
              ),
            }}
          >
            {current.ai_output_md}
          </ReactMarkdown>
        </div>
      </div>

      {/* Soft CTA — Skool */}
      <CtaCard leadId={current.id} leadName={name} />

      <div className="mt-12 text-center text-xs text-text-muted">
        <p>
          Plan je generiran AI-om na temelju tvojih odgovora.
          Pohranili smo ga uz tvoj email — vraćaj se kad god želiš.
        </p>
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  let color = "var(--color-danger)";
  let label = "Nizak start";
  if (score >= 70) {
    color = "var(--color-success)";
    label = "Spreman za skok";
  } else if (score >= 50) {
    color = "var(--color-gold)";
    label = "Solidne temelje";
  } else if (score >= 30) {
    color = "var(--color-warning)";
    label = "Treba fokus";
  }

  // Animate number from 0 → score on mount, synced with the SVG ring
  // sweep (~1.4s). Uses rAF with ease-out so the count slows as it
  // approaches the final value (more satisfying than linear).
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 1600; // ms — matches stroke-dashoffset transition
    const start = performance.now();
    let raf: number;
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const offset = circumference - (displayed / 100) * circumference;

  return (
    <div className="relative">
      <svg width="220" height="220" className="-rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="var(--color-bg-elevated)"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-bold tabular-nums">{displayed}</span>
        <span className="-mt-1 text-xs font-semibold tracking-wider text-text-dim">
          / 100
        </span>
        <span
          className="mt-2 text-sm font-bold"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function WeaknessBar({
  weakness,
}: {
  weakness: { label: string; percent: number; color: string; diagnosis?: string };
}) {
  const colorMap: Record<string, string> = {
    red: "bg-danger",
    orange: "bg-warning",
    yellow: "bg-gold",
    green: "bg-success",
  };
  const barColor = colorMap[weakness.color] ?? "bg-gold";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{weakness.label}</span>
        <span className="text-sm font-bold tabular-nums">{weakness.percent}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-1500 ease-out`}
          style={{ width: `${weakness.percent}%` }}
        />
      </div>
      {weakness.diagnosis && (
        <p className="mt-1.5 text-xs text-text-dim">{weakness.diagnosis}</p>
      )}
    </div>
  );
}

function CtaCard({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [acked, setAcked] = useState(false);

  async function handleClick() {
    setAcked(true);
    // Track conversion intent — non-blocking.
    try {
      await fetch(`/api/quiz/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, event: "skool_cta_click" }),
      });
    } catch {}
    // Meta Pixel — fire InitiateCheckout for ad attribution / lookalike
    // seed audiences. Skool join confirmation hits via offline conversion
    // upload (manual) or future Stripe webhook (CompleteRegistration).
    trackMetaEvent("InitiateCheckout", {
      content_name: "skool_cta_click",
      value: 50,
      currency: "EUR",
    });
    // Open Skool join in new tab.
    window.open("https://www.skool.com/sidehustlebalkan/about", "_blank");
  }

  return (
    <div className="rounded-2xl border border-gold bg-gradient-to-br from-gold/15 via-bg-card to-bg-card p-6 md:p-10">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1">
        <span className="text-xs font-bold uppercase tracking-wider text-bg">
          Sljedeći korak
        </span>
      </div>
      <h2 className="mb-3 text-2xl font-bold leading-tight md:text-3xl">
        {leadName}, želiš da te vodimo kroz plan tjedno?
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-text">
        SideHustle premium grupa — €50/mjesečno. Unutra:
      </p>
      <ul className="mb-8 space-y-2.5 text-sm">
        {[
          "Tjedna check-in poziva grupe (živo + replay)",
          "165+ ljudi koji već zarađuju online — Tom, Matija, Vuk",
          "Skripte, hookovi, alat presets (ElevenLabs, CapCut, Midjourney)",
          "Direktan pristup meni za 1:1 pitanja",
          "Pristup arhivi: 50+ video lekcija + community feed",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleClick}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-base font-bold text-bg transition hover:bg-gold-bright"
      >
        <span>{acked ? "Otvaram Skool…" : "Pridruži se SideHustle premium grupi"}</span>
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>
      <p className="mt-3 text-center text-xs text-text-muted">
        Otkaži kad god želiš. Bez obveze.
      </p>
    </div>
  );
}
