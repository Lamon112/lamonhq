"use client";

import { motion } from "framer-motion";

interface Stat {
  label: string;
  value: string;
  delta?: string;
  emoji: string;
}

const STATS: Stat[] = [
  { label: "MRR", value: "€0", delta: "+€0 ovaj mj", emoji: "💰" },
  { label: "Active klijenti", value: "0", delta: "+0 ovaj mj", emoji: "👥" },
  { label: "Leads", value: "0", delta: "Hot: 0", emoji: "📥" },
  { label: "Content", value: "0", delta: "posts ovaj mj", emoji: "📊" },
];

const GOAL_TARGET = 30000;
const GOAL_CURRENT = 0;

export function ResourceBar() {
  const progress = Math.min((GOAL_CURRENT / GOAL_TARGET) * 100, 100);

  return (
    <header className="sticky top-0 z-40 border-b border-border-strong bg-bg-elevated/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold">
            <span className="text-lg font-bold">L</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-text">
              LAMON <span className="text-gold">HQ</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Agency Operations
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-2 lg:gap-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex min-w-[140px] flex-1 items-center gap-3 rounded-lg border border-border bg-bg-card/60 px-3 py-2"
            >
              <span className="text-xl">{s.emoji}</span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  {s.label}
                </div>
                <div className="text-base font-semibold text-text">
                  {s.value}
                </div>
                {s.delta && (
                  <div className="text-[10px] text-text-dim">{s.delta}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex min-w-[200px] flex-col gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider">
            <span className="text-text-muted">Goal · 30K€/mj</span>
            <span className="text-gold font-semibold">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
