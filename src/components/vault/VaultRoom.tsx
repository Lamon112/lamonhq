"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Agent } from "@/lib/vault";

const ACCENT_FRAME: Record<Agent["accent"], string> = {
  amber: "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  cyan: "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
  emerald: "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
  violet: "border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  rose: "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
  gold: "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)]",
  sky: "border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]",
};
const ACCENT_BG: Record<Agent["accent"], string> = {
  amber: "from-amber-950/40 to-stone-950",
  cyan: "from-cyan-950/40 to-stone-950",
  emerald: "from-emerald-950/40 to-stone-950",
  violet: "from-violet-950/40 to-stone-950",
  rose: "from-rose-950/40 to-stone-950",
  gold: "from-yellow-900/40 to-stone-950",
  sky: "from-sky-950/40 to-stone-950",
};
const ACCENT_TEXT: Record<Agent["accent"], string> = {
  amber: "text-amber-300",
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  violet: "text-violet-300",
  rose: "text-rose-300",
  gold: "text-yellow-300",
  sky: "text-sky-300",
};

export function VaultRoom({ agent }: { agent: Agent }) {
  const Icon = agent.icon;
  const isLocked = agent.status === "locked";
  const isSoon = agent.status === "soon";
  const accentText = ACCENT_TEXT[agent.accent];
  const accentFrame = ACCENT_FRAME[agent.accent];
  const accentBg = ACCENT_BG[agent.accent];

  return (
    <motion.div
      whileHover={isLocked ? undefined : { y: -2 }}
      transition={{ duration: 0.15 }}
      className={
        "group relative overflow-hidden rounded-lg border bg-gradient-to-b p-3 transition-shadow " +
        (isLocked
          ? "border-stone-700/40 from-stone-950 to-black opacity-50"
          : `${accentFrame} ${accentBg} hover:border-opacity-100`)
      }
    >
      {/* Bulkhead lights at top */}
      {!isLocked && (
        <div className="absolute -top-px left-1/2 flex -translate-x-1/2 gap-1">
          <div className={`h-0.5 w-2 ${accentBg.split(" ")[0].replace("from-", "bg-").replace("/40", "")}`} />
          <div className={`h-0.5 w-2 ${accentBg.split(" ")[0].replace("from-", "bg-").replace("/40", "")}`} />
          <div className={`h-0.5 w-2 ${accentBg.split(" ")[0].replace("from-", "bg-").replace("/40", "")}`} />
        </div>
      )}

      {/* Header — agent persona */}
      <div className="flex items-start gap-2.5">
        <div
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded border " +
            (isLocked
              ? "border-stone-700 bg-stone-900 text-stone-600"
              : `border-current ${accentText} bg-black/40`)
          }
        >
          {isLocked ? <Lock size={14} /> : <Icon size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${isLocked ? "text-stone-600" : accentText}`}>
              {agent.emoji} {agent.name}
            </span>
            {isSoon && (
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[8px] uppercase tracking-wider text-amber-300">
                soon
              </span>
            )}
            {isLocked && (
              <span className="rounded border border-stone-700 bg-stone-900 px-1 py-0.5 text-[8px] uppercase tracking-wider text-stone-500">
                Lvl {agent.unlockLevel}
              </span>
            )}
          </div>
          <h3 className={`mt-0.5 text-sm font-semibold ${isLocked ? "text-stone-500" : "text-text"}`}>
            {agent.room}
          </h3>
          <p className={`mt-0.5 text-[11px] ${isLocked ? "text-stone-600" : "text-text-dim"}`}>
            {agent.role}
          </p>
        </div>
      </div>

      {/* Hint / status line */}
      <div
        className={
          "mt-3 rounded border px-2 py-1.5 text-[10px] leading-relaxed " +
          (isLocked
            ? "border-stone-800 bg-stone-950 text-stone-600"
            : "border-black/40 bg-black/30 text-text-muted")
        }
      >
        {agent.hint}
      </div>

      {/* CRT-style flicker on hover for live rooms */}
      {!isLocked && (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px)",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
