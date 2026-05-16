"use client";

/**
 * /quiz/preview-game — direct game preview, bypasses the quiz form.
 *
 * Use case: rapid iteration on game design, mobile testing across
 * devices, screenshots, performance profiling. NOT linked from main
 * funnel — internal/dev only.
 *
 * Public route (already whitelisted via /quiz prefix in middleware).
 */

import { Sparkles } from "lucide-react";
import { MoneyRushGame } from "@/components/quiz/MoneyRushGame";
import { AnimatedBackground } from "@/components/quiz/AnimatedBackground";

export default function PreviewGamePage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <AnimatedBackground intensity="high" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
          <span className="text-[11px] font-bold tracking-widest text-gold">
            GAME PREVIEW (dev)
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-black md:text-3xl">
          Penji se do EMPIRE-a
        </h2>
        <p className="mb-3 max-w-md text-center text-xs text-text-dim">
          Tap € coine · 3+ taps u nizu = COMBO multiplier · izbjegni TAX/SCAM/DEBT
        </p>
        <MoneyRushGame />
      </div>
    </main>
  );
}
