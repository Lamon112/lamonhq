"use client";

/**
 * Per-agent furniture vignettes — detailed back-wall + floor props
 * arranged inside each vault room. Goal: every room reads at a glance
 * as that agent's domain (Holmes = detective bureau with corkboard,
 * red string, evidence files; Treasury = bank vault with safe + gold
 * stacks + ledger; Forge = blacksmith forge + anvil + hammers; etc.).
 *
 * All pure CSS / SVG / emoji — no asset files.
 */

import type { AgentId } from "@/lib/vault";

export function RoomFurniture({ agentId }: { agentId: AgentId }) {
  switch (agentId) {
    case "holmes":
      return <HolmesFurniture />;
    case "jarvis":
      return <JarvisFurniture />;
    case "nova":
      return <NovaFurniture />;
    case "comms":
      return <CommsFurniture />;
    case "treasury":
      return <TreasuryFurniture />;
    case "steward":
      return <StewardFurniture />;
    case "atlas":
      return <AtlasFurniture />;
    case "mentat":
      return <MentatFurniture />;
    case "forge":
      return <ForgeFurniture />;
    default:
      return null;
  }
}

/* --------------------------------- Holmes --------------------------------- */
/* Detective bureau: corkboard with red string + photos + evidence files
   + magnifier + desk lamp + filing cabinet + suspect mug shots */

function HolmesFurniture() {
  return (
    <>
      {/* Corkboard with red string + pinned photos */}
      <div
        className="absolute left-2 top-2 h-16 w-24 rounded border border-amber-900/70 bg-amber-950/90"
        style={{
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.7), 0 1px 0 rgba(180,120,60,0.2)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(180,120,60,0.18) 0 2px, transparent 2px 5px)",
        }}
      >
        {/* Push pins (red) */}
        <div className="absolute left-1 top-1 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute right-1.5 top-2 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute bottom-2 left-3 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute bottom-1 right-2 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        {/* Polaroid photos (faces) */}
        <div className="absolute left-1.5 top-1.5 h-3.5 w-3 border border-stone-400 bg-stone-200 p-px">
          <div className="h-2 w-full bg-stone-700" />
        </div>
        <div className="absolute right-2 top-2.5 h-3.5 w-3 border border-stone-400 bg-stone-100 p-px">
          <div className="h-2 w-full bg-amber-800" />
        </div>
        <div className="absolute bottom-2.5 left-3.5 h-3.5 w-3 border border-stone-400 bg-stone-200 p-px">
          <div className="h-2 w-full bg-stone-600" />
        </div>
        {/* Newspaper clipping */}
        <div className="absolute right-2.5 bottom-2 h-3 w-4 bg-stone-100 p-px">
          <div className="h-px w-full bg-stone-700" />
          <div className="mt-px h-px w-3/4 bg-stone-700" />
          <div className="mt-px h-px w-full bg-stone-700" />
        </div>
        {/* Red string web — connects evidence */}
        <div
          className="absolute left-3 top-3.5 h-px w-12 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(20deg)" }}
        />
        <div
          className="absolute left-4 top-6 h-px w-10 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(-25deg)" }}
        />
        <div
          className="absolute left-6 top-9 h-px w-9 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(15deg)" }}
        />
      </div>

      {/* "CASE FILES" stamp */}
      <div className="absolute left-3 top-[5.5rem] font-mono text-[6px] font-bold uppercase tracking-wider text-amber-400/70">
        CASE-12
      </div>

      {/* Filing cabinet — 3 drawers */}
      <div className="absolute right-12 bottom-6 h-12 w-7 border border-stone-700 bg-stone-800 shadow-[inset_0_0_4px_rgba(0,0,0,0.5)]">
        <div className="border-b border-stone-700 px-1 py-1">
          <div className="h-0.5 w-2 bg-stone-500" />
        </div>
        <div className="border-b border-stone-700 px-1 py-1">
          <div className="h-0.5 w-2 bg-stone-500" />
        </div>
        <div className="px-1 py-1">
          <div className="h-0.5 w-2 bg-stone-500" />
        </div>
      </div>

      {/* Desk with green banker lamp + magnifier + papers */}
      <div className="absolute right-2 bottom-6 h-1 w-12 rounded-sm border-t border-amber-900/70 bg-amber-950 shadow-[inset_0_0_3px_rgba(0,0,0,0.6)]" />
      {/* Desk leg */}
      <div className="absolute right-3 bottom-6 h-2 w-0.5 bg-amber-950" />
      <div className="absolute right-10 bottom-6 h-2 w-0.5 bg-amber-950" />
      {/* Banker's desk lamp (green dome) */}
      <div className="absolute right-9 bottom-7 h-2 w-3 rounded-t-full bg-emerald-700 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
      <div className="absolute right-10 bottom-9 h-1 w-px bg-stone-600" />
      {/* Magnifier on desk */}
      <div className="absolute right-3 bottom-7 text-[10px] leading-none">🔍</div>
      {/* Stack of papers */}
      <div className="absolute right-6 bottom-7 h-1 w-2 bg-stone-100/80" />
      <div className="absolute right-6 bottom-[1.85rem] h-px w-2 bg-stone-300/80" />
    </>
  );
}

/* --------------------------------- Jarvis --------------------------------- */
/* Iron Man command center: wall of monitors + holo-glyphs + server racks
   + control desk + status LEDs + ceiling beam */

function JarvisFurniture() {
  return (
    <>
      {/* Ceiling beam with status panel */}
      <div className="absolute left-2 right-2 top-1 h-1 border-b border-yellow-700/40 bg-stone-900" />

      {/* Wall of monitors — 3x2 grid */}
      <div className="absolute left-2 top-3 grid grid-cols-3 gap-0.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-3.5 w-5 rounded-sm border border-yellow-900/70 bg-yellow-950/80"
            style={{
              boxShadow: "inset 0 0 4px rgba(250,204,21,0.5)",
            }}
          >
            {/* Screen content — different per panel */}
            {i === 0 && (
              <>
                <div className="m-px h-px w-3 bg-yellow-400/70" />
                <div className="m-px h-px w-2 bg-yellow-400/50" />
                <div className="m-px h-px w-3 bg-yellow-400/70" />
              </>
            )}
            {i === 1 && (
              <div className="flex h-full items-center justify-center">
                <div className="h-2 w-2 rounded-full border border-yellow-300/80" />
              </div>
            )}
            {i === 2 && (
              <div className="m-px flex h-2.5 items-end gap-px">
                <div className="h-1 w-px bg-yellow-400" />
                <div className="h-2 w-px bg-yellow-400" />
                <div className="h-1.5 w-px bg-yellow-400" />
                <div className="h-2.5 w-px bg-yellow-400" />
                <div className="h-2 w-px bg-yellow-400" />
              </div>
            )}
            {i === 3 && (
              <>
                <div className="m-px h-px w-2 bg-emerald-400/70" />
                <div className="m-px h-px w-3 bg-emerald-400/50" />
              </>
            )}
            {i === 4 && (
              <div className="m-px h-2.5 w-full bg-yellow-900/40" />
            )}
            {i === 5 && (
              <>
                <div className="m-px h-px w-3 bg-red-400/70" />
                <div className="m-px h-px w-2 bg-red-400/70" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Holographic glyph projection (cyan ring) */}
      <div className="absolute right-12 top-4 h-6 w-6 rounded-full border border-cyan-400/30 shadow-[inset_0_0_6px_rgba(6,182,212,0.3)]">
        <div className="absolute inset-1 rounded-full border border-cyan-400/40" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
      </div>

      {/* Server rack — bottom right */}
      <div className="absolute bottom-7 right-2 h-12 w-7 border border-stone-800 bg-gradient-to-b from-stone-900 to-stone-950 shadow-[inset_0_0_4px_rgba(0,0,0,0.6)]">
        {/* Vents on top */}
        <div className="m-1 h-px bg-stone-700" />
        <div className="mx-1 h-px bg-stone-700" />
        {/* LED columns */}
        <div className="absolute left-1 top-3 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={
                "h-px w-1 " +
                (i % 2 === 0 ? "bg-yellow-400 shadow-[0_0_2px_rgba(250,204,21,0.7)]" : "bg-yellow-700/60")
              }
            />
          ))}
        </div>
        <div className="absolute right-1 top-3 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={
                "h-px w-1 " +
                (i % 3 === 0
                  ? "bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.7)]"
                  : "bg-emerald-700/40")
              }
            />
          ))}
        </div>
        {/* Disk drive slits */}
        <div className="absolute bottom-1 left-1 right-1 h-px bg-stone-700" />
        <div className="absolute bottom-2 left-1 right-1 h-px bg-stone-700" />
      </div>

      {/* Control console — bottom center */}
      <div className="absolute bottom-6 left-1/2 h-2 w-12 -translate-x-1/2 rounded-t border-t border-yellow-700/60 bg-stone-900 shadow-[inset_0_0_2px_rgba(250,204,21,0.3)]">
        {/* Buttons */}
        <div className="absolute left-1 top-0.5 flex gap-px">
          <div className="h-0.5 w-0.5 rounded-full bg-red-400" />
          <div className="h-0.5 w-0.5 rounded-full bg-yellow-400" />
          <div className="h-0.5 w-0.5 rounded-full bg-emerald-400" />
        </div>
      </div>
    </>
  );
}

/* --------------------------------- Nova --------------------------------- */
/* Research lab: telescope + radar dish + star map + spectrum analyzer
   + research notes + microscope */

function NovaFurniture() {
  return (
    <>
      {/* Star map / nebula chart on back wall */}
      <div
        className="absolute left-2 top-2 h-12 w-20 rounded border border-cyan-700/60 bg-gradient-to-br from-cyan-950/80 via-stone-950 to-stone-950 shadow-[inset_0_0_8px_rgba(6,182,212,0.2)]"
      >
        {/* Stars */}
        {[
          [12, 8],
          [28, 15],
          [42, 6],
          [55, 22],
          [70, 10],
          [18, 30],
          [38, 35],
          [62, 32],
          [78, 28],
          [25, 42],
          [50, 45],
          [72, 42],
        ].map(([x, y], i) => (
          <div
            key={i}
            className="absolute h-px w-px rounded-full bg-cyan-200 shadow-[0_0_2px_rgba(165,243,252,0.9)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
        {/* Constellation lines */}
        <div className="absolute left-[12%] top-[8%] h-px w-4 origin-left rotate-12 bg-cyan-400/40" />
        <div className="absolute left-[28%] top-[15%] h-px w-3 origin-left -rotate-6 bg-cyan-400/40" />
        <div className="absolute left-[42%] top-[6%] h-px w-3 origin-left rotate-45 bg-cyan-400/40" />
        {/* Galaxy spiral hint */}
        <div className="absolute right-2 bottom-2 h-2 w-2 rounded-full border border-cyan-400/50 bg-cyan-500/10" />
      </div>

      {/* Radar dish (radio telescope) — left side */}
      <div className="absolute left-2 top-[3.75rem] h-7 w-7">
        <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-cyan-500/70 bg-gradient-to-br from-cyan-950 to-stone-900 shadow-[inset_0_0_4px_rgba(6,182,212,0.4)]" />
        {/* Receiver pole */}
        <div className="absolute left-1/2 top-2 h-3 w-px -translate-x-1/2 bg-cyan-400/80" />
        <div className="absolute left-1/2 top-2 h-px w-1.5 -translate-x-1/2 bg-cyan-400" />
        {/* Tripod */}
        <div className="absolute bottom-0 left-1/2 h-2 w-3 -translate-x-1/2">
          <div className="absolute left-0 top-0 h-2 w-px origin-top rotate-12 bg-stone-700" />
          <div className="absolute right-0 top-0 h-2 w-px origin-top -rotate-12 bg-stone-700" />
        </div>
      </div>

      {/* Spectrum analyzer screen — bottom center */}
      <div className="absolute bottom-7 left-12 h-4 w-12 border border-cyan-700/60 bg-stone-950">
        {/* Waveform */}
        <svg viewBox="0 0 48 16" className="h-full w-full" aria-hidden>
          <polyline
            points="0,8 4,6 8,10 12,4 16,12 20,7 24,2 28,9 32,5 36,11 40,6 44,8 48,7"
            fill="none"
            stroke="rgb(6 182 212)"
            strokeWidth="0.8"
          />
        </svg>
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(6,182,212,0.3) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(6,182,212,0.3) 0 1px, transparent 1px 6px)",
          }}
        />
      </div>

      {/* Research notebook on desk */}
      <div className="absolute bottom-7 right-12 h-1.5 w-3 border border-cyan-900 bg-cyan-50/90 shadow-sm">
        <div className="m-px h-px w-2 bg-stone-700" />
      </div>

      {/* Microscope — right */}
      <div className="absolute bottom-6 right-2 h-7 w-4">
        {/* Base */}
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded bg-stone-700" />
        {/* Arm */}
        <div className="absolute bottom-1 left-1/2 h-4 w-px -translate-x-1/2 bg-stone-600" />
        {/* Eyepiece */}
        <div className="absolute top-0 left-1/2 h-2 w-1.5 -translate-x-1/2 rounded-t bg-stone-700" />
        {/* Lens */}
        <div className="absolute top-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-cyan-500/80 bg-stone-900" />
      </div>

      {/* Lab counter */}
      <div className="absolute right-1 bottom-6 h-1 w-16 rounded-sm border-t border-cyan-900/70 bg-cyan-950/90" />
    </>
  );
}

/* --------------------------------- Comms --------------------------------- */
/* Switchboard + dish antennas + radio transmitter + headset hung up
   + wall of phones + wave indicator */

function CommsFurniture() {
  return (
    <>
      {/* Vintage switchboard with patch cables */}
      <div className="absolute left-2 top-2 h-12 w-16 border border-sky-700/70 bg-sky-950/70 shadow-[inset_0_0_6px_rgba(0,0,0,0.5)]">
        {/* Plug holes (3x4 grid) */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-stone-950 ring-1 ring-stone-700"
            style={{
              left: `${10 + (i % 4) * 22}%`,
              top: `${15 + Math.floor(i / 4) * 28}%`,
            }}
          />
        ))}
        {/* Active LED indicators next to some holes */}
        <div className="absolute left-[8%] top-[18%] h-0.5 w-0.5 rounded-full bg-sky-300 shadow-[0_0_2px_rgba(125,211,252,0.9)]" />
        <div className="absolute left-[52%] top-[46%] h-0.5 w-0.5 rounded-full bg-sky-300 shadow-[0_0_2px_rgba(125,211,252,0.9)]" />
        <div className="absolute left-[30%] top-[74%] h-0.5 w-0.5 rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(74,222,128,0.9)]" />
        {/* Patch cables (curving) */}
        <svg viewBox="0 0 64 48" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M 10 12 Q 30 30, 30 30"
            fill="none"
            stroke="rgb(14 165 233)"
            strokeWidth="0.7"
          />
          <path
            d="M 38 38 Q 50 25, 56 12"
            fill="none"
            stroke="rgb(244 114 182)"
            strokeWidth="0.7"
          />
        </svg>
      </div>

      {/* "OPERATOR" label above */}
      <div className="absolute left-3 top-1 font-mono text-[5px] uppercase tracking-[0.2em] text-sky-400/70">
        OPERATOR-1
      </div>

      {/* Dish antennas — top right */}
      <div className="absolute right-2 top-2 h-7 w-7 rounded-full border-2 border-sky-500/70 bg-sky-950/40 shadow-[inset_0_0_4px_rgba(14,165,233,0.3)]">
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300" />
      </div>
      <div className="absolute right-10 top-3 h-5 w-5 rounded-full border-2 border-sky-500/50 bg-sky-950/30">
        <div className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400" />
      </div>
      {/* Signal waves */}
      <div className="absolute right-1 top-1 h-2 w-px origin-bottom rotate-45 bg-sky-400/40" />
      <div className="absolute right-3 top-0.5 h-3 w-px origin-bottom rotate-[30deg] bg-sky-400/30" />

      {/* Mounted radio transceiver */}
      <div className="absolute bottom-7 right-3 h-3 w-8 border border-sky-700 bg-stone-900 shadow-[inset_0_0_2px_rgba(14,165,233,0.3)]">
        {/* Frequency dial */}
        <div className="absolute left-1 top-0.5 h-2 w-2 rounded-full border border-sky-500/60 bg-stone-950">
          <div className="absolute left-1/2 top-1/2 h-1 w-px -translate-x-1/2 -translate-y-1/2 origin-bottom rotate-45 bg-sky-300" />
        </div>
        {/* Mic input */}
        <div className="absolute right-1 top-0.5 h-1 w-2 bg-stone-700">
          <div className="absolute inset-px bg-sky-900/60" />
        </div>
        {/* Speaker grille */}
        <div className="absolute left-3.5 top-0.5 flex flex-col gap-px">
          <div className="h-px w-2 bg-sky-700/60" />
          <div className="h-px w-2 bg-sky-700/60" />
          <div className="h-px w-2 bg-sky-700/60" />
        </div>
      </div>

      {/* Headset hanging on hook */}
      <div className="absolute bottom-7 left-2 h-4 w-3">
        {/* Hook */}
        <div className="absolute right-0 top-0 h-1 w-1 border-l border-t border-stone-600" />
        {/* Headband */}
        <div className="absolute top-1 left-0 h-2 w-3 rounded-full border-2 border-stone-700 border-b-transparent" />
        {/* Earcup */}
        <div className="absolute bottom-0 left-0 h-1.5 w-1.5 rounded-full bg-stone-800" />
      </div>

      {/* Counter strip */}
      <div className="absolute bottom-6 left-1 right-1 h-1 rounded-sm border-t border-sky-900/70 bg-sky-950" />
    </>
  );
}

/* --------------------------------- Treasury --------------------------------- */
/* Bank vault: massive vault door with spinning wheel + cash bricks
   stacked + gold bars + ledger book + counting machine */

function TreasuryFurniture() {
  return (
    <>
      {/* Massive vault door — left back wall */}
      <div className="absolute left-2 top-2 h-20 w-20 rounded border-2 border-emerald-700/90 bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 shadow-[inset_0_0_10px_rgba(0,0,0,0.7),0_0_8px_rgba(16,185,129,0.15)]">
        {/* Outer dial ring */}
        <div className="absolute inset-1 rounded-full border-2 border-emerald-600/80 bg-stone-950/40 shadow-[inset_0_0_6px_rgba(0,0,0,0.6)]">
          {/* Inner dial markings (12 ticks) */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-px w-2 origin-left bg-emerald-500/60"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateX(7px)`,
              }}
            />
          ))}
          {/* Center hub */}
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400 bg-emerald-700 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
          {/* Spokes (handle wheel) */}
          {[0, 60, 120].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-px w-7 origin-center bg-emerald-300/90"
              style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
            />
          ))}
          {/* Spoke ends (knobs) */}
          {[0, 60, 120].map((deg) => (
            <div
              key={`k-${deg}`}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_3px_rgba(110,231,183,0.7)]"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(13px)`,
              }}
            />
          ))}
        </div>
        {/* Hinge bolts */}
        <div className="absolute left-0.5 top-2 h-1 w-1 rounded-full bg-emerald-700 shadow-inner" />
        <div className="absolute left-0.5 bottom-2 h-1 w-1 rounded-full bg-emerald-700 shadow-inner" />
        {/* "OPEN" indicator light */}
        <div className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_3px_rgba(16,185,129,0.8)]" />
      </div>

      {/* "VAULT" stencil */}
      <div className="absolute left-3 top-[5.5rem] font-mono text-[5px] font-bold uppercase tracking-[0.3em] text-emerald-400/70">
        ★ VAULT ★
      </div>

      {/* Stacked cash bricks — bottom right */}
      <div className="absolute bottom-7 right-3 flex items-end gap-0.5">
        {/* Brick 1 (tallest stack) */}
        <div className="flex flex-col gap-px">
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
        </div>
        {/* Brick 2 */}
        <div className="flex flex-col gap-px">
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
          <div className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
        </div>
        {/* Gold bars (smaller stack) */}
        <div className="ml-1 flex flex-col gap-px">
          <div className="h-1 w-3 border border-yellow-600 bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_2px_rgba(250,204,21,0.6)]" />
          <div className="h-1 w-3 border border-yellow-600 bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_2px_rgba(250,204,21,0.6)]" />
        </div>
      </div>

      {/* Ledger book on counter */}
      <div className="absolute bottom-7 right-14 h-2 w-3 border border-emerald-900 bg-emerald-50/90 shadow-sm">
        <div className="m-px h-px w-2 bg-emerald-700" />
        <div className="m-px mt-px h-px w-1.5 bg-emerald-700" />
      </div>

      {/* Counting machine */}
      <div className="absolute bottom-7 left-[5.5rem] h-3 w-4 border border-emerald-800 bg-stone-900">
        <div className="m-px h-1 w-3 bg-emerald-400/60 shadow-[inset_0_0_2px_rgba(16,185,129,0.4)]" />
        <div className="absolute bottom-px left-px h-px w-3 bg-emerald-700/60" />
      </div>

      {/* Floor counter */}
      <div className="absolute bottom-6 right-1 h-1 w-20 rounded-sm border-t border-emerald-900/70 bg-emerald-950/90" />
    </>
  );
}

/* --------------------------------- Steward (Client HQ) ------------------- */
/* Reception + waiting area + welcome screen + plant + coffee table +
   lounge chairs + clipboard */

function StewardFurniture() {
  return (
    <>
      {/* Welcome screen on wall — "AKTIVNI KLIJENTI" */}
      <div className="absolute left-2 top-2 h-8 w-16 border border-emerald-700/70 bg-emerald-950/60 shadow-[inset_0_0_4px_rgba(16,185,129,0.3)]">
        {/* Header bar */}
        <div className="border-b border-emerald-800 bg-emerald-900/70 px-1 py-px">
          <div className="font-mono text-[5px] font-bold uppercase tracking-wider text-emerald-300">
            CLIENTS
          </div>
        </div>
        {/* Stat rows */}
        <div className="space-y-px p-1">
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400" />
            <div className="h-px w-6 bg-emerald-300/70" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400" />
            <div className="h-px w-5 bg-emerald-300/70" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-yellow-400" />
            <div className="h-px w-4 bg-emerald-300/50" />
          </div>
        </div>
      </div>

      {/* Reception desk with terminal */}
      <div className="absolute left-2 bottom-7 h-3 w-12 rounded-sm border border-emerald-700/80 bg-emerald-950/70 shadow-[inset_0_0_3px_rgba(16,185,129,0.2)]">
        {/* Front panel detail */}
        <div className="absolute bottom-0 left-1 right-1 h-px bg-emerald-700/60" />
        {/* Terminal screen */}
        <div className="absolute -top-2 left-1 h-2 w-3 border border-emerald-700 bg-emerald-900/80">
          <div className="m-px h-px w-2 bg-emerald-400/80" />
        </div>
        {/* Sign-in clipboard */}
        <div className="absolute -top-1 right-1 h-1.5 w-1 border border-stone-600 bg-stone-100">
          <div className="m-px h-px w-px bg-stone-700" />
        </div>
      </div>

      {/* "REGISTRACIJA" sign above desk */}
      <div className="absolute left-4 bottom-[2.7rem] font-mono text-[5px] uppercase tracking-wider text-emerald-300/80">
        ◇ REGISTRATION ◇
      </div>

      {/* Coffee table */}
      <div className="absolute bottom-7 right-12 h-1.5 w-4 rounded-sm border-t border-emerald-700/70 bg-emerald-950">
        {/* Magazines */}
        <div className="absolute -top-px left-1 h-px w-2 bg-rose-300/60" />
        <div className="absolute -top-px right-1 h-px w-1 bg-cyan-300/60" />
      </div>

      {/* Lounge chair (back view) */}
      <div className="absolute bottom-7 right-2 h-3 w-4 rounded-sm border border-emerald-800 bg-emerald-900/80">
        {/* Cushion line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-700/60" />
      </div>

      {/* Potted plant — corner */}
      <div className="absolute bottom-7 left-[5.25rem] flex flex-col items-center">
        {/* Leaves */}
        <div className="relative h-3 w-3">
          <div className="absolute left-0 top-0 h-2 w-1 origin-bottom -rotate-[15deg] rounded-t-full bg-green-600" />
          <div className="absolute left-1 top-0 h-3 w-1 origin-bottom rounded-t-full bg-green-700" />
          <div className="absolute left-2 top-0 h-2 w-1 origin-bottom rotate-[15deg] rounded-t-full bg-green-600" />
        </div>
        {/* Pot */}
        <div className="h-1 w-2 rounded-b border-t border-amber-700 bg-amber-800" />
      </div>

      {/* Welcome rug pattern on floor strip */}
      <div className="absolute bottom-6 left-2 right-2 h-1 rounded-sm bg-emerald-900/60" />
    </>
  );
}

/* --------------------------------- Atlas (Brand) ------------------------- */
/* Trophy room: shelves of awards + camera tripod + ring light + script
   + framed magazine cover + spotlight */

function AtlasFurniture() {
  return (
    <>
      {/* Trophy shelf — back wall */}
      <div className="absolute left-2 top-3 h-px w-16 bg-rose-700/60" />
      {/* Trophies on shelf */}
      <div className="absolute left-3 top-1 flex items-end gap-1">
        <span className="text-[10px] leading-none">🏆</span>
        <span className="text-[10px] leading-none">🥇</span>
        <span className="text-[9px] leading-none">🎬</span>
        <span className="text-[9px] leading-none">⭐</span>
      </div>

      {/* Second shelf with framed photos */}
      <div className="absolute left-2 top-7 h-px w-16 bg-rose-700/40" />
      {/* Framed magazine covers */}
      <div className="absolute left-2.5 top-[1.125rem] h-2.5 w-2 border border-rose-600/80 bg-gradient-to-b from-rose-200 to-rose-400 shadow-[0_0_2px_rgba(244,63,94,0.4)]">
        <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
      </div>
      <div className="absolute left-6 top-[1.1rem] h-2.5 w-2 border border-rose-600/80 bg-gradient-to-b from-rose-100 to-rose-300">
        <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
      </div>
      <div className="absolute left-9 top-[1.1rem] h-2.5 w-2 border border-rose-600/80 bg-gradient-to-b from-amber-200 to-rose-300">
        <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
      </div>

      {/* "FAME WALL" stencil */}
      <div className="absolute left-2 top-[2.5rem] font-mono text-[5px] uppercase tracking-[0.25em] text-rose-300/70">
        ★ FAME WALL ★
      </div>

      {/* Camera on tripod — bottom right */}
      <div className="absolute bottom-7 right-2 h-7 w-5">
        {/* Camera body */}
        <div className="absolute top-0 left-1/2 h-2 w-4 -translate-x-1/2 rounded border border-rose-700/70 bg-stone-900 shadow-[inset_0_0_2px_rgba(244,63,94,0.3)]">
          {/* Lens */}
          <div className="absolute -right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full border border-rose-500 bg-stone-950 shadow-[inset_0_0_2px_rgba(244,63,94,0.5)]" />
          {/* Red REC light */}
          <div className="absolute left-0.5 top-0.5 h-px w-px rounded-full bg-rose-400 shadow-[0_0_2px_rgba(251,113,133,0.9)]" />
        </div>
        {/* Tripod legs */}
        <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 origin-top bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 origin-top -rotate-12 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 origin-top rotate-12 bg-stone-700" />
      </div>

      {/* Ring light — bottom left */}
      <div className="absolute bottom-7 left-2 h-7 w-5">
        {/* Ring */}
        <div className="absolute top-0 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-yellow-300/80 bg-yellow-100/10 shadow-[0_0_6px_rgba(253,224,71,0.5),inset_0_0_3px_rgba(254,240,138,0.4)]" />
        {/* Stand */}
        <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 bg-stone-700" />
        {/* Base */}
        <div className="absolute bottom-0 left-1/2 h-px w-3 -translate-x-1/2 bg-stone-700" />
      </div>

      {/* Director's chair / script on floor */}
      <div className="absolute bottom-7 left-1/2 h-1 w-3 -translate-x-1/2 border border-rose-700 bg-rose-50/80">
        <div className="absolute inset-0 m-px bg-rose-50">
          <div className="h-px w-full bg-rose-900" />
        </div>
      </div>

      {/* Floor (subtle red carpet) */}
      <div className="absolute bottom-6 left-1 right-1 h-1 rounded-sm border-t border-rose-700/60 bg-rose-950/90" />
    </>
  );
}

/* --------------------------------- Mentat (War Room) -------------------- */
/* Round war table + projected map + push pins + statue/bust + chess pieces
   + standing globe + wall maps */

function MentatFurniture() {
  return (
    <>
      {/* Strategy map on back wall — Croatia outline */}
      <div className="absolute left-2 top-2 h-10 w-14 border border-violet-700/70 bg-violet-950/70 shadow-[inset_0_0_4px_rgba(139,92,246,0.3)]">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(139,92,246,0.3) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0 1px, transparent 1px 4px)",
          }}
        />
        {/* Pins */}
        <div className="absolute left-2 top-2 h-1 w-1 rounded-full bg-red-400 shadow-[0_0_3px_rgba(248,113,113,0.8)]" />
        <div className="absolute right-2 top-3 h-1 w-1 rounded-full bg-yellow-400 shadow-[0_0_3px_rgba(250,204,21,0.8)]" />
        <div className="absolute left-3 bottom-2 h-1 w-1 rounded-full bg-green-400 shadow-[0_0_3px_rgba(74,222,128,0.8)]" />
        <div className="absolute right-3 bottom-3 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_3px_rgba(34,211,238,0.8)]" />
        {/* Connecting lines (strategy) */}
        <svg viewBox="0 0 56 40" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M 8 8 L 50 12" stroke="rgb(139 92 246)" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
          <path d="M 8 8 L 12 32" stroke="rgb(139 92 246)" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
          <path d="M 50 12 L 44 28" stroke="rgb(139 92 246)" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
        </svg>
      </div>

      {/* "STRATEGY" stencil */}
      <div className="absolute left-2 top-[3.5rem] font-mono text-[5px] uppercase tracking-[0.25em] text-violet-300/70">
        ▼ TACTICAL ▼
      </div>

      {/* Round war table — center floor */}
      <div className="absolute bottom-7 left-1/2 h-5 w-20 -translate-x-1/2">
        {/* Table top (oval) */}
        <div className="absolute top-0 left-0 right-0 h-3 rounded-full border border-violet-700/80 bg-gradient-to-b from-violet-900/70 to-violet-950 shadow-[inset_0_0_4px_rgba(139,92,246,0.3),0_2px_4px_rgba(0,0,0,0.5)]">
          {/* Pieces on table */}
          <div className="absolute left-3 top-1 h-1 w-1 rounded-full bg-red-400 shadow-sm" />
          <div className="absolute left-6 top-1 h-1 w-1 rounded-full bg-blue-400 shadow-sm" />
          <div className="absolute right-6 top-1 h-1 w-1 rounded-full bg-yellow-400 shadow-sm" />
          <div className="absolute right-3 top-1 h-1 w-1 rounded-full bg-emerald-400 shadow-sm" />
          {/* Tactical grid lines on table */}
          <div className="absolute inset-1 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(139,92,246,0.5) 0 1px, transparent 1px 4px)",
            }}
          />
        </div>
        {/* Table base / pillar */}
        <div className="absolute bottom-0 left-1/2 h-2 w-1 -translate-x-1/2 bg-stone-800" />
      </div>

      {/* Globe — right side */}
      <div className="absolute bottom-7 right-2 h-5 w-3">
        {/* Sphere */}
        <div className="absolute top-0 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-violet-600/60 bg-gradient-to-br from-cyan-900 via-blue-950 to-stone-950 shadow-[inset_0_0_3px_rgba(139,92,246,0.4)]">
          {/* Continent dots */}
          <div className="absolute left-1 top-1 h-px w-px bg-emerald-300" />
          <div className="absolute right-0.5 top-1 h-px w-1 bg-emerald-300" />
          <div className="absolute left-0.5 bottom-1 h-px w-1 bg-emerald-300" />
        </div>
        {/* Stand */}
        <div className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-px w-2 -translate-x-1/2 bg-stone-700" />
      </div>

      {/* Chess piece (bishop silhouette) — left */}
      <div className="absolute bottom-7 left-2 flex flex-col items-center">
        <div className="h-1 w-px bg-stone-200" />
        <div className="h-1 w-1 rounded-t-full bg-stone-200" />
        <div className="h-1 w-1.5 bg-stone-300" />
        <div className="h-px w-2 bg-stone-300" />
      </div>
    </>
  );
}

/* --------------------------------- Forge --------------------------------- */
/* Blacksmith: glowing forge furnace + anvil + hammers + sword on wall +
   coal pile + leather apron + sparks */

function ForgeFurniture() {
  return (
    <>
      {/* Sword + tools on back wall */}
      <div className="absolute left-12 top-2 h-10 w-px bg-stone-300/80" />
      <div className="absolute left-[2.85rem] top-[0.9rem] h-1 w-2 -translate-x-1/2 bg-amber-700" />
      <div className="absolute left-[2.85rem] top-[0.5rem] h-1 w-px -translate-x-1/2 bg-stone-400" />
      {/* Hammer 1 (on hook) */}
      <div className="absolute left-[5.5rem] top-1 h-3 w-px bg-amber-800" />
      <div className="absolute left-[5.25rem] top-3.5 h-1 w-2 bg-stone-700" />
      {/* Tongs */}
      <div className="absolute left-[6.5rem] top-1.5 h-3 w-px bg-stone-600" />
      <div className="absolute left-[6.4rem] top-4 h-px w-1 -rotate-[30deg] bg-stone-600" />
      <div className="absolute left-[6.4rem] top-4 h-px w-1 rotate-[30deg] bg-stone-600" />

      {/* "SMITHY" sign above */}
      <div className="absolute left-3 top-[2.5rem] font-mono text-[5px] uppercase tracking-[0.3em] text-amber-400/80">
        ⚒ SMITHY ⚒
      </div>

      {/* Forge furnace — left, glowing */}
      <div className="absolute left-2 top-3 h-12 w-9 rounded-t border border-amber-700/90 bg-gradient-to-b from-stone-800 to-stone-950 shadow-[inset_0_0_6px_rgba(0,0,0,0.7),0_0_8px_rgba(251,146,60,0.25)]">
        {/* Brick texture */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(120,53,15,0.4) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(120,53,15,0.4) 0 1px, transparent 1px 6px)",
          }}
        />
        {/* Mouth opening with fire */}
        <div className="absolute inset-x-1 top-3 h-7 rounded-t-md border border-amber-900 bg-gradient-to-t from-yellow-200 via-orange-500 to-red-700 shadow-[inset_0_0_8px_rgba(0,0,0,0.5),0_0_12px_rgba(251,146,60,0.6)]">
          {/* Flame flickers */}
          <div className="absolute bottom-1 left-1 h-2 w-1 rounded-t-full bg-yellow-300/90 blur-[0.3px]" />
          <div className="absolute bottom-1 left-2.5 h-3 w-1 rounded-t-full bg-yellow-200 blur-[0.3px]" />
          <div className="absolute bottom-1 right-1.5 h-2 w-1 rounded-t-full bg-orange-300/90 blur-[0.3px]" />
          <div className="absolute bottom-1 right-0.5 h-1.5 w-1 rounded-t-full bg-yellow-300/80 blur-[0.3px]" />
        </div>
        {/* Smoke vent at top */}
        <div className="absolute -top-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-t bg-stone-700" />
        {/* Glowing coal at bottom of mouth */}
        <div className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded bg-gradient-to-t from-red-700 to-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.9)]" />
      </div>

      {/* Sparks above forge */}
      <div className="absolute left-[1.1rem] top-1 h-px w-px rounded-full bg-yellow-300 shadow-[0_0_3px_rgba(253,224,71,0.9)]" />
      <div className="absolute left-[1.6rem] top-2 h-px w-px rounded-full bg-orange-300 shadow-[0_0_3px_rgba(251,146,60,0.9)]" />
      <div className="absolute left-[2.2rem] top-1.5 h-px w-px rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.9)]" />

      {/* Anvil — center bottom */}
      <div className="absolute bottom-7 left-[5rem] h-3 w-7">
        {/* Top (horn shape) */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-l-full rounded-r-sm bg-gradient-to-b from-stone-500 to-stone-700 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5)]" />
        {/* Waist */}
        <div className="absolute top-1 left-1.5 right-1.5 h-1 bg-stone-800" />
        {/* Base */}
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b bg-stone-700 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.6)]" />
      </div>

      {/* Glowing red-hot ingot on anvil */}
      <div className="absolute bottom-[2.05rem] left-[5.5rem] h-px w-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-300 to-red-500 shadow-[0_0_4px_rgba(251,146,60,0.9)]" />

      {/* Hammer leaning against anvil */}
      <div className="absolute bottom-7 left-[7.4rem] h-4 w-px origin-bottom rotate-[15deg] bg-amber-800" />
      <div className="absolute bottom-[2.6rem] left-[7.3rem] h-1 w-1.5 origin-bottom rotate-[15deg] bg-stone-600" />

      {/* Coal pile — right */}
      <div className="absolute bottom-7 right-2 flex items-end gap-px">
        <div className="h-1 w-1 rotate-12 bg-stone-900" />
        <div className="h-1.5 w-1.5 -rotate-6 bg-stone-950" />
        <div className="h-1 w-1 rotate-45 bg-stone-900" />
        <div className="h-1.5 w-1 -rotate-12 bg-stone-950" />
      </div>
      {/* Glowing coal on top */}
      <div className="absolute bottom-[2rem] right-3 h-px w-1 rounded-full bg-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.9)]" />

      {/* Leather apron hanging on hook */}
      <div className="absolute bottom-7 right-9 h-3 w-2">
        {/* Hook */}
        <div className="absolute top-0 left-1/2 h-px w-1 -translate-x-1/2 bg-stone-600" />
        {/* Apron */}
        <div className="absolute top-px left-0 right-0 h-3 bg-amber-900/90">
          <div className="absolute inset-x-px top-0 h-px bg-amber-700" />
          {/* Strap */}
          <div className="absolute -top-1 left-px h-1 w-px bg-amber-800" />
          <div className="absolute -top-1 right-px h-1 w-px bg-amber-800" />
        </div>
      </div>

      {/* Forge floor — stone */}
      <div className="absolute bottom-6 left-1 right-1 h-1 rounded-sm border-t border-stone-700/80 bg-stone-900" />
    </>
  );
}
