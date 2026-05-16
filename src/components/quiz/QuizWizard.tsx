"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { QUIZ_QUESTIONS, type QuizQuestion } from "@/lib/quizQuestions";
import { trackMetaEvent } from "./MetaPixel";
import { MoneyRushGame } from "./MoneyRushGame";
import { AnimatedBackground } from "./AnimatedBackground";

type Responses = Record<string, string | string[] | { name: string; email: string; telegram?: string }>;

export function QuizWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stepIdx, setStepIdx] = useState(0);
  const [responses, setResponses] = useState<Responses>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = QUIZ_QUESTIONS.length;
  const question = QUIZ_QUESTIONS[stepIdx];
  const progress = ((stepIdx + 1) / totalSteps) * 100;

  // Capture UTM source for attribution.
  const source = useMemo(() => {
    return (
      searchParams.get("utm_source") ||
      searchParams.get("source") ||
      "direct"
    );
  }, [searchParams]);
  const utm_campaign = searchParams.get("utm_campaign") || null;
  const utm_medium = searchParams.get("utm_medium") || null;

  // Persist progress in localStorage so refresh doesn't lose answers.
  // Hydrate inside a microtask to avoid the "setState directly in effect"
  // lint — React 19 wants writes batched outside the synchronous effect body.
  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("quiz_progress");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (parsed.responses) setResponses(parsed.responses);
        if (typeof parsed.stepIdx === "number") setStepIdx(parsed.stepIdx);
      } catch {}
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "quiz_progress",
      JSON.stringify({ responses, stepIdx }),
    );
  }, [responses, stepIdx]);

  function setAnswer(value: string | string[] | { name: string; email: string; telegram?: string }) {
    setResponses((prev) => ({ ...prev, [question.id]: value }));
  }

  function isCurrentAnswered(): boolean {
    const answer = responses[question.id];
    if (!question.required) return true;
    if (question.id === "kontakt") {
      const c = answer as { name?: string; email?: string };
      return Boolean(c?.name?.trim() && c?.email?.trim() && c.email.includes("@"));
    }
    if (question.type === "multi") {
      return Array.isArray(answer) && answer.length > 0;
    }
    return Boolean(answer && (answer as string).length > 0);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          source,
          utm_campaign,
          utm_medium,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Greška pri generiranju plana");
      }
      const { id } = await res.json();
      localStorage.removeItem("quiz_progress");
      // Meta Pixel — fire Lead event on successful quiz submit. Used by
      // Meta Ads optimization for "Lead" objective campaigns (D6 launch).
      trackMetaEvent("Lead", { content_name: "quiz_complete" });
      router.push(`/quiz/result/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setSubmitting(false);
    }
  }

  function next() {
    if (!isCurrentAnswered()) return;
    if (stepIdx === totalSteps - 1) {
      handleSubmit();
      return;
    }
    setStepIdx((s) => Math.min(s + 1, totalSteps - 1));
  }

  function prev() {
    setStepIdx((s) => Math.max(s - 1, 0));
  }

  // Auto-advance on single-select for snappy UX (Hormozi-style).
  useEffect(() => {
    if (question.type !== "single") return;
    const answer = responses[question.id];
    if (!answer) return;
    if (stepIdx === totalSteps - 1) return;
    const t = setTimeout(() => {
      setStepIdx((s) => Math.min(s + 1, totalSteps - 1));
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses[question.id], question.type]);

  // Keyboard nav — Enter advances.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && isCurrentAnswered() && !submitting) {
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, responses, submitting]);

  if (submitting) {
    return (
      <>
        <AnimatedBackground intensity="high" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
            <span className="text-[11px] font-bold tracking-widest text-gold">
              AI GRADI TVOJ PLAN
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Penji se do EMPIRE-a
          </h2>
          <p className="mb-3 max-w-md text-xs text-text-dim">
            AI generira tvoj plan u pozadini (~45 sek). Igra dok čekaš —
            preusmjerava te kad bude spreman.
          </p>
          <MoneyRushGame />
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground intensity="medium" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-8">
      {/* Header — brand + progress */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="text-sm font-semibold tracking-wider text-gold">
              SIDEHUSTLE MATCH
            </span>
          </div>
          <span className="text-xs text-text-muted">
            Pitanje {stepIdx + 1} / {totalSteps}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1">
        <h1 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
          {question.prompt}
        </h1>
        {question.helper && (
          <p className="mb-8 text-sm text-text-dim">{question.helper}</p>
        )}

        {question.type === "single" && (
          <SingleSelect
            question={question}
            value={responses[question.id] as string | undefined}
            onChange={setAnswer}
          />
        )}

        {question.type === "multi" && (
          <MultiSelect
            question={question}
            value={(responses[question.id] as string[]) ?? []}
            onChange={setAnswer}
          />
        )}

        {question.id === "kontakt" && (
          <ContactForm
            value={responses.kontakt as { name?: string; email?: string; telegram?: string } | undefined}
            onChange={(v) => setAnswer(v as never)}
          />
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Footer nav — Dalje gumb skriven na single-select (auto-advance
          radi tu); pokazuje se na multi-select (treba commit), text input,
          i posljednjem koraku (kontakt forma + submit). */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={prev}
          disabled={stepIdx === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-dim transition hover:text-text disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Natrag
        </button>

        {(question.type !== "single" || stepIdx === totalSteps - 1) && (
          <button
            onClick={next}
            disabled={!isCurrentAnswered()}
            className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-bg transition hover:bg-gold-bright disabled:cursor-not-allowed disabled:bg-bg-elevated disabled:text-text-muted"
          >
            {stepIdx === totalSteps - 1
              ? "Generiraj moj plan"
              : question.type === "multi"
                ? "Dalje (potvrdi izbor)"
                : "Dalje"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {question.type === "single" && stepIdx !== totalSteps - 1 && (
          <span className="text-xs text-text-muted italic">
            Klikni odgovor da nastavi →
          </span>
        )}
      </div>
      </div>
    </>
  );
}

function SingleSelect({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options?.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`group flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition ${
              selected
                ? "border-gold bg-gold/10 text-text"
                : "border-border bg-bg-card text-text hover:border-gold/40 hover:bg-bg-elevated"
            }`}
          >
            <span className="text-sm font-medium md:text-base">{opt.label}</span>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                selected ? "border-gold bg-gold" : "border-border-strong"
              }`}
            >
              {selected && <div className="h-2 w-2 rounded-full bg-bg" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }
  return (
    <div className="space-y-2">
      {question.options?.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition ${
              selected
                ? "border-gold bg-gold/10 text-text"
                : "border-border bg-bg-card text-text hover:border-gold/40 hover:bg-bg-elevated"
            }`}
          >
            <span className="text-sm font-medium md:text-base">{opt.label}</span>
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                selected ? "border-gold bg-gold" : "border-border-strong"
              }`}
            >
              {selected && (
                <svg
                  className="h-3 w-3 text-bg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={4}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ContactForm({
  value,
  onChange,
}: {
  value: { name?: string; email?: string; telegram?: string } | undefined;
  onChange: (v: { name: string; email: string; telegram?: string }) => void;
}) {
  const v = value ?? {};
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-dim">
          Ime
        </label>
        <input
          type="text"
          autoFocus
          value={v.name ?? ""}
          onChange={(e) =>
            onChange({ name: e.target.value, email: v.email ?? "", telegram: v.telegram })
          }
          placeholder="Marko"
          className="input text-base"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-dim">
          Email
        </label>
        <input
          type="email"
          value={v.email ?? ""}
          onChange={(e) =>
            onChange({ name: v.name ?? "", email: e.target.value, telegram: v.telegram })
          }
          placeholder="ti@email.com"
          className="input text-base"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-dim">
          Telegram (opcionalno — bržu komunikaciju)
        </label>
        <input
          type="text"
          value={v.telegram ?? ""}
          onChange={(e) =>
            onChange({ name: v.name ?? "", email: v.email ?? "", telegram: e.target.value })
          }
          placeholder="@tvoj_handle"
          className="input text-base"
        />
      </div>
      <p className="text-xs text-text-muted">
        Pošaljemo plan na email + Telegram (ako daš). Bez spama, otkaži kad
        želiš.
      </p>
    </div>
  );
}
