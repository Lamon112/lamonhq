"use client";

/**
 * /quiz/preview-game — direct game preview, bypasses the quiz form.
 *
 * Use case: rapid iteration on game design, mobile testing across
 * devices, screenshots, performance profiling. NOT linked from main
 * funnel — internal/dev only.
 *
 * Mirrors the actual submitting state: countdown timer + game so
 * Leonardo sees the exact UX without filling out the quiz first.
 *
 * Public route (already whitelisted via /quiz prefix in middleware).
 */

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { MoneyRushGame } from "@/components/quiz/MoneyRushGame";
import { AnimatedBackground } from "@/components/quiz/AnimatedBackground";

function CountdownTimer({ initialSeconds }: { initialSeconds: number }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);
  const elapsed = initialSeconds - secondsLeft;
  const pct = Math.min(100, (elapsed / initialSeconds) * 100);
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const isLow = secondsLeft <= 10 && secondsLeft > 0;
  const isDone = secondsLeft === 0;
  return (
    <div className="mb-3 w-full max-w-md">
      <div className="flex items-baseline justify-between px-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <span>{isDone ? "Skoro gotovo…" : "Plan stiže za"}</span>
        <span
          className={`tabular-nums font-black text-base ${
            isLow ? "text-warning animate-pulse" : isDone ? "text-gold-bright animate-pulse" : "text-gold"
          }`}
        >
          {mm}:{String(ss).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: isDone
              ? "linear-gradient(90deg, #c9a84c, #ff6cd8)"
              : isLow
                ? "linear-gradient(90deg, #c9a84c, #e0a545)"
                : "linear-gradient(90deg, #8b7530, #e0bf5e)",
            boxShadow: "0 0 8px rgba(224, 191, 94, 0.5)",
          }}
        />
      </div>
    </div>
  );
}

export default function PreviewGamePage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <AnimatedBackground intensity="high" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
          <span className="text-[11px] font-bold tracking-widest text-gold">
            AI GRADI TVOJ PLAN
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-black md:text-3xl">
          Penji se do EMPIRE-a
        </h2>
        <p className="mb-2 max-w-md text-center text-xs text-text-dim">
          AI generira tvoj plan u pozadini. Igra dok čekaš —
          preusmjerava te kad bude spreman.
        </p>
        <CountdownTimer initialSeconds={60} />
        <MoneyRushGame />
      </div>
    </main>
  );
}
