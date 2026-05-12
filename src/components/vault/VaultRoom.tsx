"use client";

/**
 * Live game-style vault room — back wall + ceiling beam + conduits +
 * floor gloss + per-agent furniture + walking pixel dwellers.
 *
 * The room is built in layers (back-to-front) to create depth:
 *   1. Back wall gradient + tile pattern + side-wall vanishing shadows
 *   2. Ceiling beam with girder + conduit pipes + accent strip light
 *   3. Wall-mounted decor (vents, signs, posters)
 *   4. Furniture vignette (per agent)
 *   5. Floor with sheen + drop shadows
 *   6. Dwellers (walking + sitting)
 *   7. ID plate + status badges + hover tooltip
 */

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Agent } from "@/lib/vault";
import type { RaidSeverity } from "@/lib/raids";
import type { ActiveRaid } from "@/app/actions/raids";
import { Dweller, SitterDweller } from "./Dweller";
import { RoomFurniture } from "./RoomFurniture";
import { RaidIncomingBadge } from "./RaidIncomingBadge";
import { RaidVisual } from "./RaidVisual";
import { RoomAiWorking } from "./RoomAiWorking";

const ACCENT_FRAME: Record<Agent["accent"], string> = {
  amber: "border-amber-600/70",
  cyan: "border-cyan-600/70",
  emerald: "border-emerald-600/70",
  violet: "border-violet-600/70",
  rose: "border-rose-600/70",
  gold: "border-yellow-500/70",
  sky: "border-sky-600/70",
};
const ACCENT_FLOOR: Record<Agent["accent"], string> = {
  amber: "from-amber-950/80 via-stone-900 to-stone-950",
  cyan: "from-cyan-950/80 via-stone-900 to-stone-950",
  emerald: "from-emerald-950/80 via-stone-900 to-stone-950",
  violet: "from-violet-950/80 via-stone-900 to-stone-950",
  rose: "from-rose-950/80 via-stone-900 to-stone-950",
  gold: "from-yellow-900/80 via-stone-900 to-stone-950",
  sky: "from-sky-950/80 via-stone-900 to-stone-950",
};
const ACCENT_WALL: Record<Agent["accent"], string> = {
  amber: "from-amber-900/30 via-stone-900 to-stone-950",
  cyan: "from-cyan-900/30 via-stone-900 to-stone-950",
  emerald: "from-emerald-900/30 via-stone-900 to-stone-950",
  violet: "from-violet-900/30 via-stone-900 to-stone-950",
  rose: "from-rose-900/30 via-stone-900 to-stone-950",
  gold: "from-yellow-900/40 via-stone-900 to-stone-950",
  sky: "from-sky-900/30 via-stone-900 to-stone-950",
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
  amber: "shadow-[inset_0_0_40px_rgba(245,158,11,0.18),0_0_20px_rgba(245,158,11,0.08)]",
  cyan: "shadow-[inset_0_0_40px_rgba(6,182,212,0.18),0_0_20px_rgba(6,182,212,0.08)]",
  emerald: "shadow-[inset_0_0_40px_rgba(16,185,129,0.18),0_0_20px_rgba(16,185,129,0.08)]",
  violet: "shadow-[inset_0_0_40px_rgba(139,92,246,0.18),0_0_20px_rgba(139,92,246,0.08)]",
  rose: "shadow-[inset_0_0_40px_rgba(244,63,94,0.18),0_0_20px_rgba(244,63,94,0.08)]",
  gold: "shadow-[inset_0_0_40px_rgba(250,204,21,0.20),0_0_22px_rgba(250,204,21,0.10)]",
  sky: "shadow-[inset_0_0_40px_rgba(14,165,233,0.18),0_0_20px_rgba(14,165,233,0.08)]",
};
const ACCENT_LIGHT: Record<Agent["accent"], string> = {
  amber: "from-amber-300/40 to-transparent",
  cyan: "from-cyan-300/40 to-transparent",
  emerald: "from-emerald-300/40 to-transparent",
  violet: "from-violet-300/40 to-transparent",
  rose: "from-rose-300/40 to-transparent",
  gold: "from-yellow-200/50 to-transparent",
  sky: "from-sky-300/40 to-transparent",
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

// 3-5 dwellers per room (walking + sitting) — desynced timings for life.
type WalkerSpec = {
  kind: "walk";
  start: number;
  cycle: number;
  delay: number;
  suit?: string;
  skin?: string;
  label: string;
  scale?: number;
};
type SitterSpec = {
  kind: "sit";
  pos: number; // 0-1 horizontal
  bottom: number; // px from floor
  suit?: string;
  skin?: string;
  label: string;
  scale?: number;
};
type AnyDweller = WalkerSpec | SitterSpec;

const DWELLERS_BY_AGENT: Record<Agent["id"], AnyDweller[]> = {
  jarvis: [
    { kind: "sit", pos: 0.5, bottom: 4, suit: "fill-yellow-400", label: "Jarvis @ console", scale: 0.9 },
    { kind: "walk", start: 0.2, cycle: 14, delay: 0, suit: "fill-yellow-300", label: "Ops Tech", scale: 0.85 },
    { kind: "walk", start: 0.75, cycle: 12, delay: 3, suit: "fill-yellow-500", label: "System Admin", scale: 0.85 },
  ],
  mentat: [
    { kind: "sit", pos: 0.35, bottom: 4, suit: "fill-violet-400", label: "Mentat", scale: 0.9 },
    { kind: "sit", pos: 0.65, bottom: 4, suit: "fill-violet-300", label: "War Council", scale: 0.9 },
    { kind: "walk", start: 0.85, cycle: 16, delay: 2, suit: "fill-violet-500", label: "Strategist", scale: 0.85 },
  ],
  holmes: [
    { kind: "sit", pos: 0.78, bottom: 8, suit: "fill-amber-400", label: "Holmes @ desk", scale: 0.9 },
    { kind: "walk", start: 0.2, cycle: 13, delay: 0, suit: "fill-amber-500", label: "Field Agent", scale: 0.85 },
    { kind: "walk", start: 0.45, cycle: 16, delay: 2, suit: "fill-amber-600", label: "Analyst", skin: "fill-orange-300", scale: 0.85 },
    { kind: "walk", start: 0.6, cycle: 11, delay: 4, suit: "fill-amber-300", label: "Surveillance", scale: 0.8 },
  ],
  nova: [
    { kind: "sit", pos: 0.7, bottom: 4, suit: "fill-cyan-400", label: "Nova @ scope", scale: 0.9 },
    { kind: "walk", start: 0.3, cycle: 14, delay: 0, suit: "fill-cyan-300", label: "Researcher", scale: 0.85 },
    { kind: "walk", start: 0.5, cycle: 12, delay: 2, suit: "fill-cyan-500", label: "Lab Tech", scale: 0.85 },
  ],
  strateg: [
    { kind: "sit", pos: 0.28, bottom: 4, suit: "fill-violet-400", label: "Strateg @ desk", scale: 0.9 },
    { kind: "walk", start: 0.5, cycle: 14, delay: 0, suit: "fill-violet-300", label: "Sentiment Analyst", scale: 0.85 },
    { kind: "walk", start: 0.75, cycle: 12, delay: 3, suit: "fill-violet-500", label: "Pattern Spotter", scale: 0.85 },
  ],
  pulse: [
    { kind: "sit", pos: 0.25, bottom: 4, suit: "fill-cyan-400", label: "Pulse @ console", scale: 0.9 },
    { kind: "walk", start: 0.5, cycle: 13, delay: 0, suit: "fill-cyan-300", label: "Comment Analyst", scale: 0.85 },
    { kind: "walk", start: 0.75, cycle: 11, delay: 2, suit: "fill-cyan-500", label: "Trend Tracker", scale: 0.85 },
  ],
  riva: [
    { kind: "sit", pos: 0.3, bottom: 4, suit: "fill-rose-400", label: "Riva Ops @ panel", scale: 0.9 },
    { kind: "walk", start: 0.55, cycle: 14, delay: 0, suit: "fill-rose-300", label: "Call Monitor", scale: 0.85 },
    { kind: "walk", start: 0.78, cycle: 12, delay: 3, suit: "fill-rose-500", label: "Transcript QA", scale: 0.85 },
  ],
  comms: [
    { kind: "sit", pos: 0.22, bottom: 4, suit: "fill-sky-400", label: "Comms @ board", scale: 0.9 },
    { kind: "walk", start: 0.5, cycle: 13, delay: 0, suit: "fill-sky-300", label: "Operator", scale: 0.85 },
    { kind: "walk", start: 0.7, cycle: 11, delay: 2, suit: "fill-sky-500", label: "Triage", scale: 0.85 },
    { kind: "walk", start: 0.85, cycle: 14, delay: 4, suit: "fill-sky-200", label: "Dispatch", scale: 0.8 },
  ],
  treasury: [
    { kind: "sit", pos: 0.7, bottom: 4, suit: "fill-emerald-400", label: "Treasury @ ledger", scale: 0.9 },
    { kind: "walk", start: 0.3, cycle: 14, delay: 0, suit: "fill-emerald-300", label: "Auditor", scale: 0.85 },
    { kind: "walk", start: 0.55, cycle: 12, delay: 3, suit: "fill-emerald-500", label: "Vault Guard", scale: 0.85 },
  ],
  steward: [
    { kind: "sit", pos: 0.2, bottom: 4, suit: "fill-emerald-300", label: "Steward @ reception", scale: 0.9 },
    { kind: "walk", start: 0.45, cycle: 13, delay: 0, suit: "fill-blue-400", label: "Dorijan Ilić", scale: 0.85 },
    { kind: "walk", start: 0.65, cycle: 11, delay: 2, suit: "fill-cyan-400", label: "Baywash", scale: 0.85 },
    { kind: "walk", start: 0.85, cycle: 14, delay: 4, suit: "fill-emerald-500", label: "Onboarding", scale: 0.8 },
  ],
  atlas: [
    { kind: "sit", pos: 0.5, bottom: 4, suit: "fill-rose-400", label: "Atlas @ desk", scale: 0.9 },
    { kind: "walk", start: 0.25, cycle: 13, delay: 0, suit: "fill-rose-300", label: "Editor", scale: 0.85 },
    { kind: "walk", start: 0.7, cycle: 12, delay: 2, suit: "fill-rose-500", label: "Producer", scale: 0.85 },
  ],
  aegis: [
    { kind: "sit", pos: 0.18, bottom: 4, suit: "fill-violet-400", label: "Aegis @ console", scale: 0.9 },
    { kind: "sit", pos: 0.78, bottom: 4, suit: "fill-violet-300", label: "QBR analyst", scale: 0.9 },
    { kind: "walk", start: 0.45, cycle: 14, delay: 0, suit: "fill-violet-500", label: "Concierge", scale: 0.85 },
    { kind: "walk", start: 0.6, cycle: 12, delay: 3, suit: "fill-fuchsia-400", label: "Retention", scale: 0.85 },
  ],
  forge: [
    { kind: "walk", start: 0.4, cycle: 12, delay: 0, suit: "fill-amber-500", label: "Forge", scale: 0.9 },
    { kind: "sit", pos: 0.75, bottom: 4, suit: "fill-amber-700", label: "Apprentice", scale: 0.85 },
  ],
};

interface VaultRoomProps {
  agent: Agent;
  /** When set, renders the room in "RESEARCHING…" mode (pulsing border,
   *  faster dwellers, progress text overlay). Driven by Supabase Realtime. */
  researchProgress?: string | null;
  /** Number of incoming raids targeting this room. */
  raidCount?: number;
  /** Highest severity across this room's raids — drives badge color. */
  raidSeverity?: RaidSeverity | null;
  /** Active raid rows for this room — drives big visual attackers/hazards. */
  raids?: ActiveRaid[];
  /** Click on the raid badge (separate from room body). */
  onRaidBadgeClick?: () => void;
  onClick?: (agent: Agent) => void;
}

export function VaultRoom({
  agent,
  researchProgress,
  raidCount = 0,
  raidSeverity = null,
  raids = [],
  onRaidBadgeClick,
  onClick,
}: VaultRoomProps) {
  const Icon = agent.icon;
  const isLocked = agent.status === "locked";
  const isSoon = agent.status === "soon";
  const isResearching = !!researchProgress;
  const accentText = ACCENT_TEXT[agent.accent];
  const accentFrame = ACCENT_FRAME[agent.accent];
  const accentFloor = ACCENT_FLOOR[agent.accent];
  const accentWall = ACCENT_WALL[agent.accent];
  const accentGlow = ACCENT_GLOW[agent.accent];
  const accentLight = ACCENT_LIGHT[agent.accent];
  const suitColor = SUIT_COLOR[agent.accent];

  const dwellers = isLocked ? [] : DWELLERS_BY_AGENT[agent.id] ?? [];
  const isUnderAttack = raidCount > 0;
  const hasCriticalRaid = raids.some((r) => r.severity === "critical");

  return (
    <motion.div
      whileHover={isLocked ? undefined : { y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={isLocked || !onClick ? undefined : () => onClick(agent)}
      animate={
        hasCriticalRaid
          ? { x: [0, -2, 2, -2, 2, 0], transition: { duration: 0.4, repeat: Infinity, repeatDelay: 1.5 } }
          : isUnderAttack
            ? { x: [0, -1, 1, 0], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 3 } }
            : undefined
      }
      className={
        "group relative overflow-hidden rounded-md border-2 " +
        (isLocked
          ? "border-stone-700/50 bg-stone-950 opacity-50"
          : isUnderAttack
            ? `border-rose-500/80 shadow-[inset_0_0_50px_rgba(244,63,94,0.4),0_0_30px_rgba(244,63,94,0.4)] cursor-pointer vault-room-under-attack`
            : `${accentFrame} ${accentGlow} cursor-pointer`) +
        (isResearching ? " vault-room-researching" : "")
      }
      style={{ height: 260 }}
    >
      {/* === LAYER 1: Back wall (depth gradient) === */}
      <div
        className={
          "absolute inset-0 bg-gradient-to-b " +
          (isLocked ? "from-stone-900 to-stone-950" : accentWall)
        }
      >
        {/* Dense panel/tile texture */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.45) 0 1px, transparent 1px 28px), repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 22px)",
          }}
        />
        {/* Bevel highlights on each tile (subtle top-row brighteners) */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 22px)",
          }}
        />
      </div>

      {/* Vanishing-point side shadows — fake receding side walls */}
      {!isLocked && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/60 via-black/20 to-transparent" />
        </>
      )}

      {/* === LAYER 2: Ceiling beam + conduits + accent light === */}
      {!isLocked && (
        <>
          {/* Steel ceiling band */}
          <div
            className="absolute left-0 right-0 top-0 h-3 border-b border-black/70 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
          >
            {/* Rivets along the beam */}
            <div className="absolute inset-x-0 top-0.5 flex justify-around">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-1 w-1 rounded-full border border-stone-900 bg-stone-600 shadow-inner"
                />
              ))}
            </div>
            {/* Center accent strip */}
            <div
              className={`absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r ${accentLight.replace("from-", "from-").replace("/40", "/70")}`}
            />
          </div>

          {/* Conduit pipes running across ceiling */}
          <div className="absolute left-0 right-0 top-3 h-1 border-b border-black/40 bg-gradient-to-b from-stone-700/80 to-stone-800/60" />
          <div className="absolute left-0 right-0 top-[1rem] flex items-center gap-[2px] px-1">
            <div className="h-px flex-1 bg-amber-700/40" />
            <div className="h-px flex-1 bg-stone-600/60" />
            <div className="h-px flex-1 bg-emerald-700/40" />
          </div>

          {/* Hanging ceiling lamp + cone of light */}
          <div className="absolute left-1/2 top-[1.1rem] -translate-x-1/2">
            <div className="h-1 w-px bg-stone-600" />
            <div
              className={`mx-auto h-1 w-2 rounded-b border border-black/60 bg-gradient-to-b from-stone-300 to-stone-400 shadow-[0_0_4px_rgba(255,255,255,0.3)]`}
            />
          </div>
          {/* Cone of light from lamp */}
          <div
            className={`pointer-events-none absolute left-1/2 top-[1.6rem] h-24 w-16 -translate-x-1/2 bg-gradient-to-b ${accentLight} opacity-50`}
            style={{
              clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
              filter: "blur(1px)",
            }}
          />

          {/* Wall-mounted vent — top right */}
          <div className="absolute right-2 top-[1.2rem] h-2 w-3 border border-stone-700 bg-stone-900/90">
            <div className="absolute inset-x-0 top-0 h-px bg-stone-600" />
            <div className="absolute inset-x-0 top-1 h-px bg-stone-600" />
          </div>

          {/* Wall-mounted control panel — top left */}
          <div className="absolute left-2 top-[1.2rem] h-2 w-3 border border-stone-700 bg-stone-950 shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]">
            <div className="absolute left-0.5 top-0.5 h-px w-px rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.9)]" />
            <div className="absolute right-0.5 top-0.5 h-px w-px rounded-full bg-yellow-400 shadow-[0_0_2px_rgba(250,204,21,0.9)]" />
            <div className="absolute left-0.5 bottom-0.5 h-px w-2 bg-stone-700" />
          </div>
        </>
      )}

      {/* === LAYER 3: Furniture vignette (per agent) === */}
      {!isLocked && (
        <div className="absolute inset-x-0 top-7 bottom-8">
          <RoomFurniture agentId={agent.id} />
        </div>
      )}

      {/* === LAYER 4: Floor with sheen + drop shadow === */}
      <div
        className={
          "absolute bottom-0 left-0 right-0 h-8 border-t bg-gradient-to-b " +
          (isLocked
            ? "border-stone-800 from-stone-900 to-stone-950"
            : `border-black/70 ${accentFloor}`)
        }
      >
        {/* Tile lines */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 18px)",
          }}
        />
        {/* Floor gloss / reflection band — top of floor */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="absolute inset-x-0 top-px h-1 bg-gradient-to-b from-white/8 to-transparent" />
        {/* Wall-to-floor cast shadow */}
        <div className="absolute inset-x-0 -top-1 h-1 bg-gradient-to-b from-black/50 to-transparent" />
        {/* Floor edge accent strip (room color) */}
        {!isLocked && (
          <div
            className={`absolute inset-x-2 top-0 h-px bg-gradient-to-r ${accentLight}`}
          />
        )}
      </div>

      {/* === RAID VISUAL LAYER (between floor and dwellers) === */}
      {!isLocked && raids.length > 0 && (
        <RaidVisual raids={raids} seed={agent.slot} />
      )}

      {/* === AI-WORKING DRAMATIC OVERLAY === */}
      {!isLocked && isResearching && (
        <RoomAiWorking agentName={agent.name} progress={researchProgress ?? null} />
      )}

      {/* === LAYER 5: Dwellers (walking + sitting) === */}
      {dwellers.map((d, i) => {
        if (d.kind === "sit") {
          return (
            <SitterDweller
              key={`s-${i}`}
              posPct={d.pos}
              bottomPx={d.bottom}
              suitColor={d.suit ?? suitColor}
              skinColor={d.skin}
              label={d.label}
              scale={d.scale ?? 0.85}
            />
          );
        }
        return (
          <Dweller
            key={`w-${i}`}
            startPct={d.start}
            cycleSec={d.cycle}
            delaySec={d.delay}
            suitColor={d.suit ?? suitColor}
            skinColor={d.skin}
            label={d.label}
            scale={d.scale ?? 0.85}
          />
        );
      })}

      {/* === LAYER 6: ID plate (top-left) === */}
      <div className="absolute left-1.5 top-1.5 z-20 flex items-center gap-1.5 rounded border border-black/70 bg-black/80 px-1.5 py-0.5 backdrop-blur-sm shadow-md">
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

      {/* === RAID BADGE (top-right corner overlay) === */}
      {!isLocked && raidCount > 0 && raidSeverity && onRaidBadgeClick && (
        <RaidIncomingBadge
          count={raidCount}
          highestSeverity={raidSeverity}
          onClick={onRaidBadgeClick}
        />
      )}

      {/* === LAYER 7: Status badges (top-right) === */}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-9 z-20 translate-y-2 px-2 pb-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded border border-black/70 bg-black/90 px-2 py-1 text-[9px] leading-tight backdrop-blur-sm shadow-lg">
            <p className={`font-medium ${accentText}`}>{agent.role}</p>
            <p className="mt-0.5 text-[8px] text-text-muted">{agent.hint}</p>
          </div>
        </div>
      )}

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-1 text-center">
            <Lock size={20} className="text-stone-500" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-500">
              Sealed · Lvl {agent.unlockLevel}
            </span>
          </div>
        </div>
      )}

      {/* CRT scanlines overlay */}
      {!isLocked && (
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
          }}
        />
      )}

      {/* RESEARCHING overlay was here — replaced by <RoomAiWorking /> above. */}
    </motion.div>
  );
}
