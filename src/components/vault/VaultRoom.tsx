"use client";

/**
 * Live game-style vault room — back wall + floor + per-agent furniture
 * + walking pixel dwellers. No card aesthetic. Inspired by Fallout
 * Shelter side-view rooms.
 */

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Agent } from "@/lib/vault";
import { Dweller } from "./Dweller";
import { RoomFurniture } from "./RoomFurniture";

const ACCENT_FRAME: Record<Agent["accent"], string> = {
  amber: "border-amber-600/60",
  cyan: "border-cyan-600/60",
  emerald: "border-emerald-600/60",
  violet: "border-violet-600/60",
  rose: "border-rose-600/60",
  gold: "border-yellow-500/60",
  sky: "border-sky-600/60",
};
const ACCENT_FLOOR: Record<Agent["accent"], string> = {
  amber: "from-amber-950/60 to-stone-900",
  cyan: "from-cyan-950/60 to-stone-900",
  emerald: "from-emerald-950/60 to-stone-900",
  violet: "from-violet-950/60 to-stone-900",
  rose: "from-rose-950/60 to-stone-900",
  gold: "from-yellow-900/60 to-stone-900",
  sky: "from-sky-950/60 to-stone-900",
};
const ACCENT_WALL: Record<Agent["accent"], string> = {
  amber: "from-stone-900 via-amber-950/30 to-stone-900",
  cyan: "from-stone-900 via-cyan-950/30 to-stone-900",
  emerald: "from-stone-900 via-emerald-950/30 to-stone-900",
  violet: "from-stone-900 via-violet-950/30 to-stone-900",
  rose: "from-stone-900 via-rose-950/30 to-stone-900",
  gold: "from-stone-900 via-yellow-900/30 to-stone-900",
  sky: "from-stone-900 via-sky-950/30 to-stone-900",
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
const ACCENT_GLOW: Record<Agent["accent"], string> = {
  amber: "shadow-[inset_0_0_30px_rgba(245,158,11,0.15)]",
  cyan: "shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]",
  emerald: "shadow-[inset_0_0_30px_rgba(16,185,129,0.15)]",
  violet: "shadow-[inset_0_0_30px_rgba(139,92,246,0.15)]",
  rose: "shadow-[inset_0_0_30px_rgba(244,63,94,0.15)]",
  gold: "shadow-[inset_0_0_30px_rgba(250,204,21,0.18)]",
  sky: "shadow-[inset_0_0_30px_rgba(14,165,233,0.15)]",
};

const SUIT_COLOR: Record<Agent["accent"], string> = {
  amber: "fill-amber-500",
  cyan: "fill-cyan-500",
  emerald: "fill-emerald-500",
  violet: "fill-violet-500",
  rose: "fill-rose-500",
  gold: "fill-yellow-400",
  sky: "fill-sky-500",
};

// 2-3 dwellers per agent room with desync timings + colors
const DWELLERS_BY_AGENT: Record<
  Agent["id"],
  Array<{ start: number; cycle: number; delay: number; suit?: string; skin?: string; label: string }>
> = {
  jarvis: [
    { start: 0.25, cycle: 14, delay: 0, label: "Jarvis" },
    { start: 0.7, cycle: 11, delay: 2, label: "Ops Tech", suit: "fill-yellow-300" },
  ],
  mentat: [
    { start: 0.3, cycle: 16, delay: 0, label: "Mentat", suit: "fill-violet-400" },
    { start: 0.65, cycle: 13, delay: 3, label: "Strategist", suit: "fill-violet-300" },
  ],
  holmes: [
    { start: 0.2, cycle: 12, delay: 0, label: "Holmes", suit: "fill-amber-400" },
    { start: 0.55, cycle: 15, delay: 2, label: "Field Agent", suit: "fill-amber-600" },
    { start: 0.8, cycle: 10, delay: 4, label: "Analyst", suit: "fill-amber-500", skin: "fill-orange-300" },
  ],
  nova: [
    { start: 0.3, cycle: 13, delay: 0, label: "Nova", suit: "fill-cyan-400" },
    { start: 0.7, cycle: 11, delay: 2, label: "Researcher", suit: "fill-cyan-300" },
  ],
  comms: [
    { start: 0.25, cycle: 12, delay: 0, label: "Comms", suit: "fill-sky-400" },
    { start: 0.6, cycle: 14, delay: 3, label: "Operator", suit: "fill-sky-300" },
    { start: 0.85, cycle: 10, delay: 1, label: "Triage", suit: "fill-sky-500" },
  ],
  treasury: [
    { start: 0.3, cycle: 14, delay: 0, label: "Treasury", suit: "fill-emerald-400" },
    { start: 0.7, cycle: 11, delay: 2, label: "Auditor", suit: "fill-emerald-300" },
  ],
  steward: [
    { start: 0.25, cycle: 13, delay: 0, label: "Steward", suit: "fill-emerald-300" },
    { start: 0.55, cycle: 11, delay: 2, label: "Dorijan Ilić", suit: "fill-blue-400" },
    { start: 0.8, cycle: 14, delay: 4, label: "Baywash", suit: "fill-cyan-400" },
  ],
  atlas: [
    { start: 0.3, cycle: 13, delay: 0, label: "Atlas", suit: "fill-rose-400" },
    { start: 0.7, cycle: 11, delay: 2, label: "Editor", suit: "fill-rose-300" },
  ],
  forge: [
    { start: 0.3, cycle: 12, delay: 0, label: "Forge", suit: "fill-amber-500" },
  ],
};

export function VaultRoom({ agent }: { agent: Agent }) {
  const Icon = agent.icon;
  const isLocked = agent.status === "locked";
  const isSoon = agent.status === "soon";
  const accentText = ACCENT_TEXT[agent.accent];
  const accentFrame = ACCENT_FRAME[agent.accent];
  const accentFloor = ACCENT_FLOOR[agent.accent];
  const accentWall = ACCENT_WALL[agent.accent];
  const accentGlow = ACCENT_GLOW[agent.accent];
  const suitColor = SUIT_COLOR[agent.accent];

  const dwellers = isLocked ? [] : DWELLERS_BY_AGENT[agent.id] ?? [];

  return (
    <motion.div
      whileHover={isLocked ? undefined : { y: -1 }}
      transition={{ duration: 0.15 }}
      className={
        "group relative overflow-hidden rounded-md border-2 " +
        (isLocked
          ? "border-stone-700/50 bg-stone-950 opacity-50"
          : `${accentFrame} ${accentGlow}`)
      }
      style={{ height: 140 }}
    >
      {/* Back wall — gradient + concrete texture */}
      <div
        className={
          "absolute inset-0 bg-gradient-to-b " +
          (isLocked ? "from-stone-900 to-stone-950" : accentWall)
        }
      >
        {/* Subtle wall panels */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.3) 0 1px, transparent 1px 32px), repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0 1px, transparent 1px 24px)",
          }}
        />
      </div>

      {/* Bulkhead lights */}
      {!isLocked && (
        <div className="absolute left-0 right-0 top-0 flex justify-around px-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 w-4 rounded-b ${suitColor.replace("fill-", "bg-")} opacity-60`}
            />
          ))}
        </div>
      )}

      {/* Furniture layer (back wall + props) */}
      {!isLocked && <RoomFurniture agentId={agent.id} />}

      {/* Floor strip — bottom 24px */}
      <div
        className={
          "absolute bottom-0 left-0 right-0 h-6 border-t bg-gradient-to-b " +
          (isLocked
            ? "border-stone-800 from-stone-900 to-stone-950"
            : `border-black/60 ${accentFloor}`)
        }
      >
        {/* Floor tile lines */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.4) 0 1px, transparent 1px 18px)",
          }}
        />
      </div>

      {/* Walking dwellers */}
      {dwellers.map((d, i) => (
        <Dweller
          key={i}
          startPct={d.start}
          cycleSec={d.cycle}
          delaySec={d.delay}
          suitColor={d.suit ?? suitColor}
          skinColor={d.skin}
          label={d.label}
          scale={0.85}
        />
      ))}

      {/* Room label — top-left ID plate */}
      <div className="absolute left-1.5 top-1.5 z-20 flex items-center gap-1.5 rounded border border-black/60 bg-black/70 px-1.5 py-0.5 backdrop-blur-sm">
        <div
          className={
            "flex h-4 w-4 items-center justify-center rounded-sm " +
            (isLocked ? "text-stone-600" : accentText)
          }
        >
          {isLocked ? <Lock size={10} /> : <Icon size={10} />}
        </div>
        <div className="flex flex-col leading-none">
          <span
            className={
              "font-mono text-[8px] uppercase tracking-[0.15em] " +
              (isLocked ? "text-stone-600" : accentText)
            }
          >
            {agent.emoji} {agent.name}
          </span>
          <span
            className={
              "mt-px text-[9px] font-semibold leading-none " +
              (isLocked ? "text-stone-500" : "text-text")
            }
          >
            {agent.room}
          </span>
        </div>
      </div>

      {/* Status badges — top-right */}
      <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
        {isSoon && (
          <span className="rounded border border-amber-500/50 bg-amber-500/20 px-1 py-0.5 font-mono text-[7px] uppercase tracking-wider text-amber-200 backdrop-blur-sm">
            soon
          </span>
        )}
        {isLocked && (
          <span className="rounded border border-stone-700 bg-stone-900/90 px-1 py-0.5 font-mono text-[7px] uppercase tracking-wider text-stone-500">
            Lvl {agent.unlockLevel}
          </span>
        )}
        {!isLocked && !isSoon && (
          <span className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1 py-0.5 font-mono text-[7px] uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        )}
      </div>

      {/* Hover tooltip with role + hint */}
      {!isLocked && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 translate-y-2 px-2 pb-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded border border-black/70 bg-black/85 px-2 py-1 text-[9px] leading-tight backdrop-blur-sm">
            <p className={`font-medium ${accentText}`}>{agent.role}</p>
            <p className="mt-0.5 text-[8px] text-text-muted">{agent.hint}</p>
          </div>
        </div>
      )}

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-1 text-center">
            <Lock size={18} className="text-stone-500" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-500">
              Sealed · Lvl {agent.unlockLevel}
            </span>
          </div>
        </div>
      )}

      {/* CRT scanlines */}
      {!isLocked && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
          }}
        />
      )}
    </motion.div>
  );
}
