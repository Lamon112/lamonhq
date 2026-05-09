"use client";

/**
 * Per-agent themed scenes — each room is dressed so heavily that you
 * read its specialty in 1 second:
 *   Holmes   → 1940s noir detective bureau (corkboard + typewriter +
 *              trench coat + revolver + whiskey + venetian blinds)
 *   Jarvis   → Iron-Man arc-reactor command center (holo rings + AI
 *              core + screens with code + cooling pipes)
 *   Nova     → mad-scientist lab (periodic table + bubbling flasks +
 *              bunsen burner + DNA helix + centrifuge)
 *   Comms    → wartime operator hub (switchboard + dish + telegraph +
 *              world clocks + ticker tape)
 *   Treasury → Scrooge bank vault (massive door + gold mountains +
 *              dollar pile + scale + cigar + portrait)
 *   Steward  → boutique reception (chandelier + chesterfield + plant
 *              + visitor book + brass lamp)
 *   Atlas    → Hollywood PR studio (red carpet + spotlights + step-
 *              and-repeat backdrop + vanity bulbs + boom mic + awards)
 *   Mentat   → war room (tactical map + war table + bookshelf + bust
 *              + red phone + bookcase + chess set + flags)
 *   Forge    → blacksmith content foundry (furnace + anvil + bellows +
 *              wares wall + water trough + apron + chain + horseshoes)
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

/* =================================================================== */
/* HOLMES — film-noir detective bureau                                  */
/* =================================================================== */
function HolmesFurniture() {
  return (
    <>
      {/* Venetian blind shadow cast across whole back wall */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0 2px, transparent 2px 8px)",
        }}
      />

      {/* "DETECTIVE" frosted door window — far left */}
      <div className="absolute left-1 top-2 h-12 w-7 rounded-sm border border-amber-900/80 bg-gradient-to-b from-amber-100/15 to-amber-200/5 shadow-[inset_0_0_4px_rgba(0,0,0,0.5)]">
        {/* "PRIVATE EYE" stencil */}
        <div className="absolute inset-x-0 top-3 text-center font-mono text-[5px] font-bold uppercase leading-none tracking-[0.15em] text-amber-200/70">
          PRIVATE
        </div>
        <div className="absolute inset-x-0 top-5 text-center font-mono text-[5px] font-bold uppercase leading-none tracking-[0.15em] text-amber-200/70">
          EYE
        </div>
        {/* Gold star badge */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] leading-none">★</div>
        {/* Door handle */}
        <div className="absolute right-0.5 top-7 h-1 w-0.5 rounded-full bg-amber-700" />
      </div>

      {/* Corkboard — center back wall, dense with evidence */}
      <div
        className="absolute left-10 top-2 h-16 w-28 rounded border border-amber-900/80 bg-amber-950/90"
        style={{
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.7), 0 1px 0 rgba(180,120,60,0.2)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(180,120,60,0.18) 0 2px, transparent 2px 5px)",
        }}
      >
        {/* Pins (red) */}
        <div className="absolute left-1 top-1 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute right-1.5 top-2 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute bottom-2 left-3 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute bottom-1 right-2 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        <div className="absolute left-1/2 top-3 h-1 w-1 rounded-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]" />
        {/* Polaroid mug shots — 4 suspects */}
        <div className="absolute left-1.5 top-1.5 h-3.5 w-3 border border-stone-400 bg-stone-200 p-px">
          <div className="h-2 w-full bg-stone-700" />
        </div>
        <div className="absolute left-7 top-2.5 h-3.5 w-3 border border-stone-400 bg-stone-100 p-px">
          <div className="h-2 w-full bg-amber-800" />
        </div>
        <div className="absolute right-2 top-2.5 h-3.5 w-3 border border-stone-400 bg-stone-100 p-px">
          <div className="h-2 w-full bg-stone-600" />
        </div>
        <div className="absolute bottom-2.5 left-3.5 h-3.5 w-3 border border-stone-400 bg-stone-200 p-px">
          <div className="h-2 w-full bg-amber-700" />
        </div>
        {/* Newspaper clipping — center */}
        <div className="absolute left-1/2 top-7 h-3.5 w-4.5 -translate-x-1/2 bg-stone-100 p-px shadow-sm">
          <div className="h-px w-full bg-stone-700" />
          <div className="mt-px h-px w-3/4 bg-stone-700" />
          <div className="mt-px h-px w-full bg-stone-700" />
          <div className="mt-px h-px w-2/3 bg-stone-700" />
        </div>
        {/* Big "?" red marker */}
        <div className="absolute right-1 bottom-1 font-serif text-[9px] font-bold leading-none text-red-500">?</div>
        {/* Red string web — denser */}
        <div
          className="absolute left-3 top-3.5 h-px w-12 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(20deg)" }}
        />
        <div
          className="absolute left-4 top-6 h-px w-14 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(-25deg)" }}
        />
        <div
          className="absolute left-6 top-9 h-px w-10 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(15deg)" }}
        />
        <div
          className="absolute left-8 top-11 h-px w-12 bg-red-500/80 shadow-[0_0_2px_rgba(239,68,68,0.6)]"
          style={{ transform: "rotate(-10deg)" }}
        />
      </div>

      {/* "CASE-12 OPEN" stamp under board */}
      <div className="absolute left-11 top-[5.2rem] flex items-center gap-1">
        <div className="rounded-sm border border-red-500/70 bg-red-950/40 px-1 font-mono text-[6px] font-bold uppercase tracking-wider text-red-300">
          OPEN
        </div>
        <span className="font-mono text-[6px] uppercase tracking-wider text-amber-400/60">
          CASE-12
        </span>
      </div>

      {/* Coat rack with trench coat + fedora — far right back */}
      <div className="absolute right-1 top-2 flex flex-col items-center">
        {/* Hat (fedora) */}
        <div className="h-1 w-3 rounded-full border border-stone-700 bg-stone-800" />
        <div className="h-1.5 w-2 -mt-px bg-stone-800" />
        {/* Hook */}
        <div className="h-px w-2 bg-stone-600" />
        {/* Trench coat */}
        <div className="relative mt-px h-7 w-3 bg-amber-800/90">
          <div className="absolute inset-x-px top-0 h-px bg-amber-700" />
          {/* Belt */}
          <div className="absolute left-0 right-0 top-3 h-px bg-amber-950" />
          {/* Lapel */}
          <div className="absolute left-px top-1 h-2 w-px bg-amber-900" />
          <div className="absolute right-px top-1 h-2 w-px bg-amber-900" />
        </div>
        {/* Pole */}
        <div className="absolute -bottom-2 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-600" />
      </div>

      {/* Filing cabinet — back right */}
      <div className="absolute right-9 top-12 h-12 w-7 border border-stone-700 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[inset_0_0_4px_rgba(0,0,0,0.5),2px_2px_3px_rgba(0,0,0,0.4)]">
        {/* 3 drawers */}
        <div className="border-b border-stone-900 px-1 py-1">
          <div className="h-0.5 w-2 rounded-sm bg-stone-500" />
        </div>
        <div className="border-b border-stone-900 px-1 py-1">
          <div className="h-0.5 w-2 rounded-sm bg-stone-500" />
        </div>
        <div className="px-1 py-1">
          <div className="h-0.5 w-2 rounded-sm bg-stone-500" />
        </div>
        {/* Top label */}
        <div className="absolute -top-1 left-0.5 h-1 w-3 bg-amber-100/80" />
      </div>
      {/* Stack of files on top of cabinet */}
      <div className="absolute right-9 top-[2.7rem] h-1 w-7 bg-amber-100" />
      <div className="absolute right-9 top-[2.45rem] h-1 w-7 bg-amber-200" />
      <div className="absolute right-9 top-[2.2rem] h-1 w-6 bg-amber-100" />

      {/* Bookshelf — left wall, packed */}
      <div className="absolute left-1 bottom-12 h-10 w-7 border border-amber-900/80 bg-amber-950/90 shadow-[inset_0_0_3px_rgba(0,0,0,0.6)]">
        {/* Shelf 1 — books */}
        <div className="border-b border-amber-900 px-px py-px">
          <div className="flex items-end gap-px">
            <div className="h-2 w-px bg-red-700" />
            <div className="h-2.5 w-px bg-stone-700" />
            <div className="h-2 w-px bg-emerald-800" />
            <div className="h-2.5 w-px bg-amber-700" />
            <div className="h-2 w-px bg-stone-800" />
            <div className="h-2.5 w-px bg-red-900" />
            <div className="h-2 w-px bg-stone-600" />
          </div>
        </div>
        {/* Shelf 2 — more books */}
        <div className="border-b border-amber-900 px-px py-px">
          <div className="flex items-end gap-px">
            <div className="h-2 w-px bg-stone-700" />
            <div className="h-2.5 w-px bg-emerald-800" />
            <div className="h-2 w-px bg-red-800" />
            <div className="h-2.5 w-px bg-amber-800" />
            <div className="h-2 w-px bg-stone-800" />
          </div>
        </div>
        {/* Shelf 3 — decanter + glass */}
        <div className="px-1 py-1">
          {/* Whiskey decanter */}
          <div className="absolute bottom-1 left-1 h-3 w-1.5 rounded-b border border-amber-300/80 bg-gradient-to-b from-amber-200/30 to-amber-700/80 shadow-[inset_0_0_1px_rgba(255,255,255,0.4)]">
            <div className="absolute -top-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-t bg-stone-600" />
          </div>
          {/* Glass */}
          <div className="absolute bottom-1 left-3.5 h-2 w-1 rounded-b border border-stone-300/70 bg-amber-700/60" />
        </div>
      </div>

      {/* Desk — bottom right with everything on it */}
      <div className="absolute right-2 bottom-2 h-2 w-20 rounded-sm border border-amber-950 bg-gradient-to-b from-amber-900 to-amber-950 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(180,120,60,0.1)]" />
      {/* Desk legs */}
      <div className="absolute right-3 bottom-0 h-2 w-0.5 bg-amber-950" />
      <div className="absolute right-20 bottom-0 h-2 w-0.5 bg-amber-950" />
      {/* Desk drawer */}
      <div className="absolute right-12 bottom-2.5 h-1 w-3 border border-amber-950 bg-amber-900" />

      {/* Banker's green desk lamp */}
      <div className="absolute right-3 bottom-4 h-3 w-3">
        <div className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-600" />
        <div className="absolute top-0 left-0 h-1.5 w-3 rounded-t-full bg-emerald-700 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
        <div className="absolute top-1.5 left-1/2 h-px w-2 -translate-x-1/2 bg-emerald-900" />
        {/* Light cone */}
        <div
          className="absolute left-1/2 top-1.5 h-2 w-3 -translate-x-1/2 bg-gradient-to-b from-emerald-200/40 to-transparent"
          style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }}
        />
      </div>

      {/* Typewriter on desk */}
      <div className="absolute right-7 bottom-4 h-2.5 w-4 rounded-sm border border-stone-800 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]">
        {/* Carriage roll */}
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-stone-600" />
        {/* Paper sticking up */}
        <div className="absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 bg-stone-100">
          <div className="m-px h-px w-1 bg-stone-700" />
        </div>
        {/* Keys (3 rows of dots) */}
        <div className="absolute inset-x-0.5 top-1 flex flex-col gap-px">
          <div className="flex justify-around">
            <div className="h-px w-px rounded-full bg-stone-300" />
            <div className="h-px w-px rounded-full bg-stone-300" />
            <div className="h-px w-px rounded-full bg-stone-300" />
            <div className="h-px w-px rounded-full bg-stone-300" />
          </div>
          <div className="flex justify-around">
            <div className="h-px w-px rounded-full bg-stone-300" />
            <div className="h-px w-px rounded-full bg-stone-300" />
            <div className="h-px w-px rounded-full bg-stone-300" />
            <div className="h-px w-px rounded-full bg-stone-300" />
          </div>
        </div>
      </div>

      {/* Magnifier on desk */}
      <div className="absolute right-12 bottom-3.5 text-[11px] leading-none">🔍</div>

      {/* Stack of case files */}
      <div className="absolute right-16 bottom-3.5 h-1 w-3 bg-amber-100/90" />
      <div className="absolute right-16 bottom-[1.05rem] h-px w-3 bg-stone-300" />
      <div className="absolute right-16 bottom-[1.2rem] h-1 w-3 bg-amber-200/90" />

      {/* Rotary phone — left of desk */}
      <div className="absolute right-[4.75rem] bottom-3.5 h-2 w-2.5">
        {/* Body */}
        <div className="absolute bottom-0 left-0 h-1 w-2.5 rounded-sm bg-stone-900" />
        {/* Receiver */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-full bg-stone-800 shadow-[inset_0_0_1px_rgba(0,0,0,0.5)]" />
        {/* Dial */}
        <div className="absolute bottom-0.5 left-1 h-px w-px rounded-full bg-stone-600" />
      </div>

      {/* Ashtray with cigarette + smoke */}
      <div className="absolute right-1.5 bottom-3.5">
        <div className="h-1 w-1.5 rounded-full bg-stone-700" />
        <div className="absolute -top-px left-1/2 h-px w-2 -translate-x-1/2 bg-stone-200" />
        {/* Smoke wisp */}
        <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-gradient-to-t from-stone-400/50 to-transparent blur-[0.5px]" />
      </div>

      {/* Floor rug — vintage red/amber */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-1 rounded-sm border border-amber-900/40 bg-gradient-to-r from-amber-900/40 via-red-900/30 to-amber-900/40" />
    </>
  );
}

/* =================================================================== */
/* JARVIS — Iron-Man arc-reactor command center                         */
/* =================================================================== */
function JarvisFurniture() {
  return (
    <>
      {/* Wall of monitors — 3x2 grid (back wall) */}
      <div className="absolute left-2 top-1 grid grid-cols-3 gap-0.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-4 w-6 rounded-sm border border-yellow-900/80 bg-yellow-950/90 shadow-[inset_0_0_4px_rgba(250,204,21,0.5),0_1px_2px_rgba(0,0,0,0.5)]"
          >
            {i === 0 && (
              <>
                <div className="m-px h-px w-4 bg-yellow-400/80" />
                <div className="m-px h-px w-3 bg-yellow-400/60" />
                <div className="m-px h-px w-4 bg-yellow-400/80" />
                <div className="m-px h-px w-2 bg-yellow-400/40" />
              </>
            )}
            {i === 1 && (
              <div className="flex h-full items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full border border-cyan-300/80 shadow-[0_0_2px_rgba(165,243,252,0.6)]">
                  <div className="absolute inset-0.5 rounded-full border border-cyan-300/40" />
                </div>
              </div>
            )}
            {i === 2 && (
              <div className="m-px flex h-3 items-end gap-px">
                <div className="h-1 w-px bg-emerald-400" />
                <div className="h-2 w-px bg-emerald-400" />
                <div className="h-1.5 w-px bg-emerald-400" />
                <div className="h-2.5 w-px bg-emerald-400" />
                <div className="h-2 w-px bg-emerald-400" />
                <div className="h-1 w-px bg-emerald-400" />
              </div>
            )}
            {i === 3 && (
              <>
                <div className="m-px h-px w-2 bg-emerald-400/80" />
                <div className="m-px h-px w-3 bg-emerald-400/60" />
                <div className="m-px h-px w-1 bg-yellow-400/60" />
                <div className="m-px h-px w-3 bg-emerald-400/40" />
              </>
            )}
            {i === 4 && (
              <div className="m-px h-3 w-full">
                {/* Fake "blueprint" lines */}
                <div className="h-px w-3 bg-cyan-400/60" />
                <div className="m-px h-2 w-2 border border-cyan-400/50" />
              </div>
            )}
            {i === 5 && (
              <>
                <div className="m-px h-px w-3 bg-red-400/80" />
                <div className="m-px h-px w-2 bg-red-400/80" />
                <div className="m-px h-px w-4 bg-red-400/80" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* "JARVIS-PRIME" nameplate above monitors */}
      <div className="absolute left-2 top-[5.5rem] flex items-center gap-1">
        <div className="h-1 w-1 rounded-full bg-yellow-400 shadow-[0_0_3px_rgba(250,204,21,0.9)]" />
        <span className="font-mono text-[6px] font-bold uppercase tracking-[0.2em] text-yellow-300/80">
          JARVIS-PRIME · v4.7
        </span>
      </div>

      {/* Floating arc-reactor / AI core — right side */}
      <div className="absolute right-3 top-2 h-12 w-12">
        <div className="absolute inset-0 rounded-full border border-cyan-400/30 shadow-[inset_0_0_8px_rgba(6,182,212,0.3),0_0_8px_rgba(6,182,212,0.4)]" />
        <div className="absolute inset-1 rounded-full border border-cyan-400/40" />
        <div className="absolute inset-2 rounded-full border border-cyan-400/50" />
        {/* Inner spinning glyphs */}
        <div className="absolute inset-3 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(165,243,252,1)]" />
        </div>
        {/* Outer angular spokes */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 h-px w-5 origin-left bg-cyan-300/70"
            style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
          />
        ))}
      </div>

      {/* Holographic data stream — vertical lines from arc reactor */}
      <div className="absolute right-3 top-[3.5rem] h-3 w-12 opacity-70">
        <div className="flex justify-around">
          <div className="font-mono text-[5px] leading-none text-cyan-300">10110</div>
          <div className="font-mono text-[5px] leading-none text-cyan-400">FX-9</div>
          <div className="font-mono text-[5px] leading-none text-cyan-300">001</div>
        </div>
        <div className="mt-px flex justify-around">
          <div className="font-mono text-[5px] leading-none text-emerald-300">OK</div>
          <div className="font-mono text-[5px] leading-none text-cyan-300">BOOT</div>
        </div>
      </div>

      {/* Server rack — left bottom */}
      <div className="absolute bottom-2 left-2 h-14 w-8 border border-stone-800 bg-gradient-to-b from-stone-800 to-stone-950 shadow-[inset_0_0_4px_rgba(0,0,0,0.6),2px_2px_3px_rgba(0,0,0,0.4)]">
        <div className="m-1 h-px bg-stone-700" />
        {/* LED column 1 */}
        <div className="absolute left-1 top-3 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className={
                "h-px w-1.5 " +
                (i % 2 === 0
                  ? "bg-yellow-400 shadow-[0_0_2px_rgba(250,204,21,0.7)]"
                  : "bg-yellow-700/50")
              }
            />
          ))}
        </div>
        {/* LED column 2 */}
        <div className="absolute right-1 top-3 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className={
                "h-px w-1.5 " +
                (i % 3 === 0
                  ? "bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.7)]"
                  : "bg-emerald-800/50")
              }
            />
          ))}
        </div>
        {/* Disk drive slits */}
        <div className="absolute bottom-3 left-1 right-1 h-px bg-stone-700" />
        <div className="absolute bottom-2 left-1 right-1 h-px bg-stone-700" />
        <div className="absolute bottom-1 left-1 right-1 h-px bg-stone-700" />
      </div>

      {/* Cooling pipes (vertical, blue glow) — between rack and console */}
      <div className="absolute bottom-2 left-11 h-12 w-px bg-cyan-500/60 shadow-[0_0_2px_rgba(6,182,212,0.5)]" />
      <div className="absolute bottom-2 left-12 h-12 w-px bg-cyan-500/60 shadow-[0_0_2px_rgba(6,182,212,0.5)]" />
      <div className="absolute bottom-12 left-11 h-px w-2 bg-cyan-500/60" />

      {/* Holographic blueprint table — center bottom */}
      <div className="absolute bottom-2 left-1/2 h-8 w-16 -translate-x-1/2">
        {/* Table base */}
        <div className="absolute bottom-0 left-1/2 h-2 w-12 -translate-x-1/2 rounded border border-stone-700 bg-stone-900 shadow-[inset_0_0_3px_rgba(6,182,212,0.3)]">
          {/* Buttons */}
          <div className="absolute left-1 top-0.5 h-px w-px rounded-full bg-red-400" />
          <div className="absolute left-3 top-0.5 h-px w-px rounded-full bg-yellow-400" />
          <div className="absolute left-5 top-0.5 h-px w-px rounded-full bg-emerald-400" />
        </div>
        {/* Holographic projection ABOVE table */}
        <div className="absolute bottom-2 left-1/2 h-6 w-10 -translate-x-1/2 opacity-70">
          {/* Wireframe globe */}
          <div className="absolute left-1/2 top-1 h-4 w-4 -translate-x-1/2 rounded-full border border-cyan-400/70 shadow-[0_0_4px_rgba(6,182,212,0.6)]">
            <div className="absolute inset-0 rounded-full border border-cyan-400/50"
              style={{ transform: "scaleX(0.4)" }}
            />
            <div className="absolute inset-0 rounded-full border border-cyan-400/50"
              style={{ transform: "scaleY(0.4)" }}
            />
          </div>
          {/* Light cone from table to hologram */}
          <div
            className="absolute bottom-0 left-1/2 h-6 w-8 -translate-x-1/2 bg-gradient-to-t from-cyan-400/30 to-transparent"
            style={{ clipPath: "polygon(35% 100%, 65% 100%, 100% 0, 0 0)" }}
          />
        </div>
      </div>

      {/* Side cabinet with red emergency button */}
      <div className="absolute bottom-2 right-2 h-6 w-4 border border-stone-700 bg-stone-900 shadow-[inset_0_0_2px_rgba(0,0,0,0.5)]">
        {/* Big red button */}
        <div className="absolute top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-red-600 shadow-[0_0_3px_rgba(248,113,113,0.8),inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Dial */}
        <div className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-yellow-500/70 bg-stone-950">
          <div className="absolute left-1/2 top-1/2 h-px w-1 -translate-x-1/2 -translate-y-1/2 origin-left rotate-45 bg-yellow-300" />
        </div>
      </div>
    </>
  );
}

/* =================================================================== */
/* NOVA — mad-scientist research lab                                    */
/* =================================================================== */
function NovaFurniture() {
  return (
    <>
      {/* Periodic table on back wall — left */}
      <div className="absolute left-1 top-1 h-8 w-12 border border-cyan-700/70 bg-cyan-950/80 shadow-[inset_0_0_3px_rgba(6,182,212,0.3)]">
        {/* Title bar */}
        <div className="border-b border-cyan-800 px-px py-px font-mono text-[5px] font-bold leading-none tracking-wider text-cyan-300">
          PERIODIC
        </div>
        {/* Element grid */}
        <div className="grid grid-cols-7 gap-px p-px">
          {[...Array(21)].map((_, i) => (
            <div
              key={i}
              className={
                "aspect-square " +
                (i % 4 === 0
                  ? "bg-cyan-400/70"
                  : i % 3 === 0
                  ? "bg-cyan-300/50"
                  : "bg-cyan-600/30")
              }
            />
          ))}
        </div>
      </div>

      {/* Star map / nebula — right back */}
      <div className="absolute right-1 top-1 h-8 w-14 rounded border border-cyan-700/60 bg-gradient-to-br from-cyan-950 via-stone-950 to-stone-950 shadow-[inset_0_0_5px_rgba(6,182,212,0.2)]">
        {[
          [12, 8],
          [28, 15],
          [42, 6],
          [55, 22],
          [70, 10],
          [82, 18],
          [18, 30],
          [38, 40],
          [62, 32],
          [80, 50],
          [25, 60],
          [50, 70],
          [72, 65],
          [90, 80],
          [10, 50],
        ].map(([x, y], i) => (
          <div
            key={i}
            className="absolute h-px w-px rounded-full bg-cyan-200 shadow-[0_0_2px_rgba(165,243,252,0.9)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
        {/* Galaxy spiral */}
        <div className="absolute right-1 bottom-1 h-3 w-3 rounded-full border border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_4px_rgba(6,182,212,0.5)]">
          <div className="absolute inset-0.5 rounded-full border border-cyan-400/40" />
        </div>
      </div>

      {/* DNA helix — center wall, vertical */}
      <div className="absolute left-14 top-1 h-12 w-3">
        <svg viewBox="0 0 12 48" className="h-full w-full" aria-hidden>
          {/* Sine waves crossing */}
          <path
            d="M 2 0 Q 10 6 2 12 Q -6 18 2 24 Q 10 30 2 36 Q -6 42 2 48"
            stroke="rgb(34 211 238)"
            strokeWidth="0.5"
            fill="none"
          />
          <path
            d="M 10 0 Q 2 6 10 12 Q 18 18 10 24 Q 2 30 10 36 Q 18 42 10 48"
            stroke="rgb(125 211 252)"
            strokeWidth="0.5"
            fill="none"
          />
          {/* Base pairs */}
          {[6, 14, 22, 30, 38, 46].map((y) => (
            <line
              key={y}
              x1={3}
              x2={9}
              y1={y}
              y2={y}
              stroke="rgb(34 211 238)"
              strokeWidth="0.3"
            />
          ))}
        </svg>
      </div>

      {/* Lab coat hanging — left wall */}
      <div className="absolute left-2 top-10 flex flex-col items-center">
        <div className="h-px w-2 bg-stone-600" />
        <div className="relative h-7 w-4 bg-stone-100/95 shadow-sm">
          <div className="absolute left-px top-0 h-2 w-px bg-stone-300" />
          <div className="absolute right-px top-0 h-2 w-px bg-stone-300" />
          {/* Pocket */}
          <div className="absolute left-px bottom-2 h-1.5 w-1 border border-stone-400" />
          {/* Pen in pocket */}
          <div className="absolute left-px bottom-2.5 h-px w-px bg-cyan-500" />
          {/* Buttons */}
          <div className="absolute left-1/2 top-2 h-px w-px -translate-x-1/2 rounded-full bg-stone-400" />
          <div className="absolute left-1/2 top-3.5 h-px w-px -translate-x-1/2 rounded-full bg-stone-400" />
          <div className="absolute left-1/2 top-5 h-px w-px -translate-x-1/2 rounded-full bg-stone-400" />
        </div>
      </div>

      {/* "DR. NOVA" name tag */}
      <div className="absolute left-1 top-[1.1rem] rounded border border-cyan-500/60 bg-cyan-950/80 px-1 font-mono text-[5px] font-bold uppercase leading-none tracking-wider text-cyan-300">
        DR.NOVA
      </div>

      {/* Lab counter — bottom (full width) */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-cyan-900/70 bg-gradient-to-b from-cyan-950/80 to-stone-950 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5)]" />

      {/* Bunsen burner with blue flame */}
      <div className="absolute bottom-2.5 left-2 h-4 w-2">
        {/* Base */}
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-sm bg-stone-700" />
        {/* Tube */}
        <div className="absolute bottom-1 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-500" />
        {/* Flame (blue with yellow tip) */}
        <div className="absolute bottom-3 left-1/2 h-2 w-1 -translate-x-1/2 rounded-t-full bg-gradient-to-t from-blue-500 via-cyan-300 to-yellow-200 shadow-[0_0_4px_rgba(6,182,212,0.7),0_0_8px_rgba(34,211,238,0.4)] blur-[0.3px]" />
      </div>

      {/* Erlenmeyer flask with bubbling liquid */}
      <div className="absolute bottom-2.5 left-5 h-5 w-3">
        {/* Cone shape */}
        <div className="absolute bottom-0 left-0 right-0 h-3"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0, transparent 30%, rgba(168,85,247,0.7) 30%, rgba(192,132,252,0.7) 100%)",
            clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
            border: "1px solid rgba(168,85,247,0.6)",
            borderTop: "none",
          }}
        />
        {/* Neck */}
        <div className="absolute bottom-3 left-1/2 h-2 w-1 -translate-x-1/2 rounded-t border border-stone-300/60 bg-purple-200/20" />
        {/* Bubble */}
        <div className="absolute bottom-1 left-1 h-px w-px rounded-full bg-purple-200 opacity-80" />
        <div className="absolute bottom-2 left-1.5 h-px w-px rounded-full bg-purple-100 opacity-60" />
        {/* Steam */}
        <div className="absolute -top-1 left-1/2 h-2 w-px -translate-x-1/2 bg-gradient-to-t from-purple-200/40 to-transparent blur-[0.5px]" />
      </div>

      {/* Beaker with green liquid */}
      <div className="absolute bottom-2.5 left-9 h-3 w-2">
        <div className="absolute bottom-0 left-0 right-0 h-2 border border-stone-300/60 bg-emerald-400/60 rounded-b shadow-[inset_0_0_2px_rgba(16,185,129,0.5)]" />
        {/* Lip */}
        <div className="absolute top-0 left-0 right-0 h-px bg-stone-400" />
        {/* Measurement marks */}
        <div className="absolute right-0 top-1 h-px w-px bg-stone-700" />
        <div className="absolute right-0 top-1.5 h-px w-px bg-stone-700" />
      </div>

      {/* Test-tube rack — center bottom */}
      <div className="absolute bottom-2.5 left-1/2 h-3 w-7 -translate-x-[60%]">
        {/* Rack base */}
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded bg-amber-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Tubes */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute bottom-0.5 h-2.5 w-1 border border-stone-300/60 rounded-b bg-cyan-300/60"
            style={{
              left: `${i * 25 - 5}%`,
              backgroundImage:
                i === 0
                  ? "linear-gradient(to top, rgba(34,197,94,0.7), transparent 60%)"
                  : i === 1
                  ? "linear-gradient(to top, rgba(168,85,247,0.7), transparent 60%)"
                  : i === 2
                  ? "linear-gradient(to top, rgba(244,63,94,0.7), transparent 60%)"
                  : i === 3
                  ? "linear-gradient(to top, rgba(250,204,21,0.7), transparent 60%)"
                  : "linear-gradient(to top, rgba(6,182,212,0.7), transparent 60%)",
            }}
          />
        ))}
      </div>

      {/* Microscope — right of center */}
      <div className="absolute bottom-2.5 right-9 h-7 w-4">
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded bg-stone-700 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Arm */}
        <div className="absolute bottom-1 left-1/2 h-5 w-px -translate-x-1/2 bg-stone-600" />
        {/* Eyepiece */}
        <div className="absolute top-0 left-1/2 h-2 w-1.5 -translate-x-1/2 rounded-t bg-stone-700" />
        {/* Lens */}
        <div className="absolute top-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-cyan-500/80 bg-stone-900 shadow-[0_0_3px_rgba(6,182,212,0.5)]" />
      </div>

      {/* Centrifuge — right side */}
      <div className="absolute bottom-2.5 right-3 h-5 w-5">
        {/* Body */}
        <div className="absolute bottom-0 left-0 right-0 h-3 rounded border border-stone-700 bg-stone-900 shadow-[inset_0_0_3px_rgba(0,0,0,0.6)]">
          {/* LED */}
          <div className="absolute right-1 top-1 h-px w-px rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.9)]" />
        </div>
        {/* Lid */}
        <div className="absolute top-1 left-0 right-0 h-2 rounded-t border border-stone-700 bg-stone-800">
          {/* Spinning rotor inside */}
          <div className="absolute inset-1 rounded-full border border-stone-600">
            <div className="absolute left-1/2 top-1/2 h-px w-3 origin-left -translate-x-1/2 -translate-y-1/2 rotate-45 bg-stone-500" />
            <div className="absolute left-1/2 top-1/2 h-px w-3 origin-left -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-stone-500" />
          </div>
        </div>
      </div>

      {/* Whiteboard with equation — right above counter */}
      <div className="absolute right-3 top-10 h-6 w-10 rounded-sm border border-cyan-700/50 bg-stone-100/95 shadow-sm">
        {/* Equations */}
        <div className="m-px font-mono text-[5px] leading-tight text-stone-800">
          <div>E=mc²</div>
          <div className="text-cyan-700">∂x/∂t</div>
          <div className="text-emerald-700">H₂O+Na</div>
          <div>π·r²·h</div>
        </div>
      </div>
    </>
  );
}

/* =================================================================== */
/* COMMS — wartime operator hub                                         */
/* =================================================================== */
function CommsFurniture() {
  return (
    <>
      {/* World clocks — back wall, 4 timezones */}
      <div className="absolute left-2 top-1 flex gap-1">
        {[
          { label: "ZAG", time: "14:32" },
          { label: "NYC", time: "08:32" },
          { label: "LON", time: "13:32" },
          { label: "TYO", time: "22:32" },
        ].map((c) => (
          <div
            key={c.label}
            className="flex flex-col items-center"
          >
            {/* Label */}
            <div className="font-mono text-[5px] font-bold uppercase leading-none tracking-wider text-sky-300/80">
              {c.label}
            </div>
            {/* Clock face */}
            <div className="mt-px h-4 w-4 rounded-full border border-sky-600/70 bg-stone-950 shadow-[inset_0_0_2px_rgba(14,165,233,0.4)]">
              {/* Hour marks */}
              {[0, 90, 180, 270].map((d) => (
                <div
                  key={d}
                  className="absolute left-1/2 top-1/2 h-px w-1.5 origin-left bg-sky-400/60"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${d}deg) translateX(4px)`,
                  }}
                />
              ))}
              {/* Hands */}
              <div className="absolute left-1/2 top-1/2 h-px w-1.5 -translate-x-px -translate-y-px origin-left rotate-45 bg-sky-300" />
              <div className="absolute left-1/2 top-1/2 h-px w-1 -translate-x-px -translate-y-px origin-left rotate-90 bg-sky-200" />
              {/* Center */}
              <div className="absolute left-1/2 top-1/2 h-px w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200" />
            </div>
            {/* Digital readout */}
            <div className="mt-px font-mono text-[5px] leading-none text-sky-200/70">
              {c.time}
            </div>
          </div>
        ))}
      </div>

      {/* Vintage switchboard with patch cables — center back */}
      <div className="absolute left-2 top-12 h-12 w-20 border border-sky-700/80 bg-sky-950/80 shadow-[inset_0_0_6px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.4)]">
        {/* Plug holes (5x4 grid) */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-stone-950 ring-1 ring-stone-700"
            style={{
              left: `${8 + (i % 5) * 18}%`,
              top: `${15 + Math.floor(i / 5) * 22}%`,
            }}
          />
        ))}
        {/* Active LEDs */}
        <div className="absolute left-[6%] top-[18%] h-px w-px rounded-full bg-sky-300 shadow-[0_0_2px_rgba(125,211,252,0.9)]" />
        <div className="absolute left-[42%] top-[40%] h-px w-px rounded-full bg-emerald-300 shadow-[0_0_2px_rgba(110,231,183,0.9)]" />
        <div className="absolute left-[78%] top-[40%] h-px w-px rounded-full bg-red-400 shadow-[0_0_2px_rgba(248,113,113,0.9)]" />
        <div className="absolute left-[24%] top-[62%] h-px w-px rounded-full bg-yellow-300 shadow-[0_0_2px_rgba(253,224,71,0.9)]" />
        {/* Patch cables */}
        <svg viewBox="0 0 80 48" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M 10 12 Q 20 30, 32 18" fill="none" stroke="rgb(14 165 233)" strokeWidth="0.7" />
          <path d="M 38 18 Q 56 36, 70 18" fill="none" stroke="rgb(244 114 182)" strokeWidth="0.7" />
          <path d="M 24 28 Q 40 14, 60 28" fill="none" stroke="rgb(34 197 94)" strokeWidth="0.7" />
          <path d="M 16 38 Q 32 30, 48 40" fill="none" stroke="rgb(250 204 21)" strokeWidth="0.7" />
        </svg>
      </div>

      {/* "OPERATOR" label */}
      <div className="absolute left-2.5 top-[2.85rem] rounded border border-sky-500/60 bg-sky-950 px-1 font-mono text-[5px] font-bold uppercase leading-none tracking-[0.2em] text-sky-300">
        OPERATOR-1
      </div>

      {/* Big satellite dish — top right */}
      <div className="absolute right-2 top-1 h-9 w-9">
        <div className="absolute inset-0 rounded-full border-2 border-sky-500/80 bg-gradient-to-br from-sky-900 via-stone-900 to-stone-950 shadow-[inset_0_0_4px_rgba(14,165,233,0.4)]" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_3px_rgba(125,211,252,0.8)]" />
        {/* Receiver pole */}
        <div className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 origin-left rotate-12 bg-sky-300" />
        {/* Mount */}
        <div className="absolute -bottom-1 left-1/2 h-1 w-px -translate-x-1/2 bg-stone-700" />
        {/* Signal waves */}
        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-r border-t border-sky-400/40" />
        <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-r border-t border-sky-400/30" />
      </div>

      {/* Smaller dish */}
      <div className="absolute right-12 top-3 h-5 w-5 rounded-full border-2 border-sky-500/60 bg-sky-950/40">
        <div className="absolute left-1/2 top-1/2 h-px w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400" />
      </div>

      {/* Telegraph machine on counter — bottom left */}
      <div className="absolute bottom-2.5 left-2 h-3 w-5">
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-sm bg-amber-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Brass key */}
        <div className="absolute bottom-1 left-1.5 h-px w-2 bg-amber-500 shadow-[0_0_2px_rgba(217,119,6,0.5)]" />
        <div className="absolute bottom-1 left-2 h-1.5 w-1 rounded-full bg-amber-700" />
        {/* Sounder */}
        <div className="absolute bottom-1 right-0.5 h-1.5 w-1 rounded bg-stone-800" />
      </div>

      {/* Radio transceiver — bottom center */}
      <div className="absolute bottom-2.5 left-1/2 h-4 w-12 -translate-x-1/2 border border-sky-700 bg-stone-900 shadow-[inset_0_0_2px_rgba(14,165,233,0.3)]">
        {/* Frequency dial — large */}
        <div className="absolute left-1 top-0.5 h-3 w-3 rounded-full border border-sky-500/70 bg-stone-950 shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]">
          <div className="absolute left-1/2 top-1/2 h-1 w-px -translate-x-1/2 -translate-y-1/2 origin-bottom rotate-45 bg-sky-300" />
          {/* Tick marks */}
          {[0, 90, 180, 270].map((d) => (
            <div
              key={d}
              className="absolute left-1/2 top-1/2 h-px w-1 origin-left bg-sky-400/60"
              style={{ transform: `translate(-50%, -50%) rotate(${d}deg) translateX(3px)` }}
            />
          ))}
        </div>
        {/* Display */}
        <div className="absolute left-5 top-0.5 h-1.5 w-3 border border-sky-700 bg-emerald-950/80 shadow-[inset_0_0_1px_rgba(16,185,129,0.5)]">
          <div className="m-px h-px w-2 bg-emerald-400/80" />
        </div>
        {/* Speaker grille */}
        <div className="absolute right-1 top-0.5 flex flex-col gap-px">
          <div className="h-px w-2 bg-sky-700/70" />
          <div className="h-px w-2 bg-sky-700/70" />
          <div className="h-px w-2 bg-sky-700/70" />
          <div className="h-px w-2 bg-sky-700/70" />
          <div className="h-px w-2 bg-sky-700/70" />
        </div>
      </div>

      {/* Headset hanging on hook — bottom right */}
      <div className="absolute bottom-2.5 right-3 h-4 w-3">
        <div className="absolute right-0 top-0 h-1 w-1 border-l border-t border-stone-600" />
        <div className="absolute top-1 left-0 h-2 w-3 rounded-full border-2 border-stone-700 border-b-transparent" />
        <div className="absolute bottom-0 left-0 h-1.5 w-1.5 rounded-full bg-stone-800" />
        <div className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-stone-800" />
        {/* Mic */}
        <div className="absolute bottom-1 right-0 h-px w-1 -rotate-12 bg-stone-700" />
      </div>

      {/* Ticker tape running across bottom of back wall */}
      <div className="absolute left-2 right-2 top-[5rem] h-1 overflow-hidden border-y border-stone-700 bg-stone-950">
        <div className="font-mono text-[5px] leading-none text-emerald-400 whitespace-nowrap">
          ◂ APX-DENTAL-CTC ✓ · MTG-SCHED 14:30 · INBND-MSG-3 · OUT-BTH ✓ · LEAD-12 HOT ▸
        </div>
      </div>

      {/* Counter */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-sky-900/70 bg-gradient-to-b from-sky-950/80 to-stone-950" />
    </>
  );
}

/* =================================================================== */
/* TREASURY — Scrooge bank vault                                        */
/* =================================================================== */
function TreasuryFurniture() {
  return (
    <>
      {/* Massive vault door — dominant left feature */}
      <div className="absolute left-1 top-1 h-24 w-24 rounded border-2 border-emerald-700/90 bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 shadow-[inset_0_0_12px_rgba(0,0,0,0.7),0_0_10px_rgba(16,185,129,0.18)]">
        {/* Outer dial ring */}
        <div className="absolute inset-1 rounded-full border-2 border-emerald-600/80 bg-stone-950/40 shadow-[inset_0_0_8px_rgba(0,0,0,0.7)]">
          {/* 12 dial ticks */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-px w-2.5 origin-left bg-emerald-500/60"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateX(9px)`,
              }}
            />
          ))}
          {/* Numbers */}
          <div className="absolute left-1/2 top-0.5 -translate-x-1/2 font-mono text-[5px] font-bold leading-none text-emerald-400/80">
            12
          </div>
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 font-mono text-[5px] font-bold leading-none text-emerald-400/80">
            3
          </div>
          <div className="absolute left-1/2 bottom-0.5 -translate-x-1/2 font-mono text-[5px] font-bold leading-none text-emerald-400/80">
            6
          </div>
          {/* Center hub */}
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300 bg-emerald-700 shadow-[0_0_4px_rgba(16,185,129,0.7)]" />
          {/* Spokes */}
          {[0, 60, 120].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-0.5 w-9 origin-center bg-emerald-300/90 shadow-[0_0_2px_rgba(110,231,183,0.5)]"
              style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
            />
          ))}
          {/* Spoke knobs */}
          {[0, 60, 120].map((deg) => (
            <div
              key={`k-${deg}`}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_3px_rgba(110,231,183,0.7)]"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(15px)`,
              }}
            />
          ))}
        </div>
        {/* Hinge bolts */}
        <div className="absolute left-0.5 top-2 h-1 w-1 rounded-full bg-emerald-700 shadow-inner" />
        <div className="absolute left-0.5 top-1/2 h-1 w-1 rounded-full bg-emerald-700 shadow-inner" />
        <div className="absolute left-0.5 bottom-2 h-1 w-1 rounded-full bg-emerald-700 shadow-inner" />
        {/* "VAULT" plate at top */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded border border-emerald-600 bg-emerald-900 px-1 font-mono text-[5px] font-bold leading-none tracking-[0.2em] text-emerald-200 shadow-md">
          VAULT
        </div>
        {/* OPEN/CLOSED LED */}
        <div className="absolute right-1 top-1 flex items-center gap-px">
          <div className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_3px_rgba(16,185,129,0.9)]" />
          <span className="font-mono text-[4px] font-bold uppercase leading-none text-emerald-300">
            OPEN
          </span>
        </div>
      </div>

      {/* Portrait of founder — back right */}
      <div className="absolute right-2 top-1 h-9 w-7 border-2 border-amber-700 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
        {/* Frame inner */}
        <div className="absolute inset-0.5 border border-amber-900/70 bg-stone-800">
          {/* Face silhouette */}
          <div className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-200/80" />
          {/* Body */}
          <div className="absolute left-1/2 top-3 h-3 w-4 -translate-x-1/2 rounded-t bg-stone-700" />
          {/* Bowtie */}
          <div className="absolute left-1/2 top-3 h-px w-1 -translate-x-1/2 bg-red-700" />
        </div>
        {/* Plaque */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-sm border border-amber-700 bg-amber-900 px-px font-mono text-[3px] font-bold uppercase leading-none text-amber-200">
          FOUNDER
        </div>
      </div>

      {/* Cash counter machine — back right below portrait */}
      <div className="absolute right-2 top-12 h-5 w-7 rounded border border-emerald-800 bg-stone-900 shadow-[inset_0_0_2px_rgba(0,0,0,0.5)]">
        {/* Display */}
        <div className="absolute left-1 top-1 h-1.5 w-5 border border-emerald-700 bg-emerald-950 shadow-[inset_0_0_1px_rgba(16,185,129,0.5)]">
          <div className="font-mono text-[4px] font-bold leading-none text-emerald-400">
            €30K
          </div>
        </div>
        {/* Slot for bills */}
        <div className="absolute bottom-1 left-1 right-1 h-px bg-emerald-800" />
        <div className="absolute bottom-1.5 left-1 right-1 h-px bg-emerald-700/60" />
        {/* Bills sticking out */}
        <div className="absolute -bottom-1 left-2 h-1 w-3 bg-emerald-300/90" />
      </div>

      {/* MASSIVE pile of gold coins — bottom center */}
      <div className="absolute bottom-2.5 left-1/2 h-7 w-12 -translate-x-1/2">
        {/* Pile shape */}
        <svg viewBox="0 0 48 28" className="absolute inset-0 h-full w-full">
          {/* Coins */}
          {[
            [4, 22, 3],
            [10, 22, 3],
            [16, 22, 3],
            [22, 22, 3],
            [28, 22, 3],
            [34, 22, 3],
            [40, 22, 3],
            [7, 17, 3],
            [13, 17, 3],
            [19, 17, 3],
            [25, 17, 3],
            [31, 17, 3],
            [37, 17, 3],
            [10, 12, 3],
            [16, 12, 3],
            [22, 12, 3],
            [28, 12, 3],
            [34, 12, 3],
            [13, 7, 3],
            [19, 7, 3],
            [25, 7, 3],
            [31, 7, 3],
            [16, 2, 3],
            [22, 2, 3],
            [28, 2, 3],
          ].map(([cx, cy, r], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="url(#goldGrad)"
              stroke="rgb(180 83 9)"
              strokeWidth="0.4"
            />
          ))}
          <defs>
            <radialGradient id="goldGrad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="rgb(254 240 138)" />
              <stop offset="60%" stopColor="rgb(250 204 21)" />
              <stop offset="100%" stopColor="rgb(202 138 4)" />
            </radialGradient>
          </defs>
        </svg>
        {/* Sparkles on top */}
        <div className="absolute top-0 left-3 h-px w-px bg-yellow-100 shadow-[0_0_3px_rgba(254,240,138,1)]" />
        <div className="absolute top-1 right-3 h-px w-px bg-yellow-100 shadow-[0_0_3px_rgba(254,240,138,1)]" />
      </div>

      {/* Cash brick stacks — bottom right of pile */}
      <div className="absolute bottom-2.5 right-12 flex items-end gap-px">
        <div className="flex flex-col gap-px">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 w-3 border border-emerald-700/80 bg-emerald-800 shadow-[inset_0_0_1px_rgba(16,185,129,0.4)]" />
          ))}
        </div>
        <div className="flex flex-col gap-px">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 w-3 border border-emerald-700/80 bg-emerald-800 shadow-[inset_0_0_1px_rgba(16,185,129,0.4)]" />
          ))}
        </div>
        {/* Gold bar stack */}
        <div className="ml-1 flex flex-col gap-px">
          <div className="h-1 w-3 border border-yellow-700 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 shadow-[0_0_2px_rgba(250,204,21,0.7)]" />
          <div className="h-1 w-3 border border-yellow-700 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 shadow-[0_0_2px_rgba(250,204,21,0.7)]" />
          <div className="h-1 w-3 border border-yellow-700 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 shadow-[0_0_2px_rgba(250,204,21,0.7)]" />
        </div>
      </div>

      {/* Scale (justice) — left of pile */}
      <div className="absolute bottom-2.5 left-[6.5rem] h-5 w-4">
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-stone-600" />
        <div className="absolute top-1 left-0 right-0 h-px bg-stone-500" />
        {/* Left pan */}
        <div className="absolute top-1.5 left-0 h-px w-1.5 bg-stone-600" />
        <div className="absolute top-2 left-0 h-1 w-1.5 border border-stone-600 bg-yellow-700/40" />
        {/* Right pan */}
        <div className="absolute top-1.5 right-0 h-px w-1.5 bg-stone-600" />
        <div className="absolute top-2 right-0 h-1 w-1.5 border border-stone-600 bg-yellow-700/40" />
        {/* Base */}
        <div className="absolute bottom-0 left-1/2 h-px w-3 -translate-x-1/2 bg-stone-700" />
      </div>

      {/* Cigar in glass ashtray — far right corner */}
      <div className="absolute bottom-2.5 right-2">
        <div className="h-1 w-2 rounded-full bg-stone-700/80" />
        <div className="absolute -top-px left-0 h-px w-2.5 -rotate-12 bg-amber-900" />
        <div className="absolute -top-px left-2 h-px w-px rounded-full bg-orange-400 shadow-[0_0_2px_rgba(251,146,60,0.9)]" />
        {/* Smoke */}
        <div className="absolute -top-3 left-1 h-3 w-px bg-gradient-to-t from-stone-400/40 to-transparent blur-[0.5px]" />
      </div>

      {/* Counter strip */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-emerald-900/70 bg-gradient-to-b from-emerald-950/80 to-stone-950" />
    </>
  );
}

/* =================================================================== */
/* STEWARD — boutique reception                                         */
/* =================================================================== */
function StewardFurniture() {
  return (
    <>
      {/* Crystal chandelier — center back wall */}
      <div className="absolute left-1/2 top-0 h-6 w-10 -translate-x-1/2">
        {/* Chain */}
        <div className="absolute top-0 left-1/2 h-1 w-px -translate-x-1/2 bg-stone-600" />
        {/* Frame */}
        <div className="absolute top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded border border-amber-600/80 bg-amber-700/40" />
        {/* Crystal drops */}
        <div className="absolute top-2 left-1 h-3 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        <div className="absolute top-2 left-3 h-3 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        <div className="absolute top-2 left-5 h-4 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        <div className="absolute top-2 left-7 h-3 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        <div className="absolute top-2 right-1 h-3 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        {/* Light bulbs */}
        <div className="absolute top-1.5 left-2 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_4px_rgba(254,240,138,1)]" />
        <div className="absolute top-1.5 left-4.5 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_4px_rgba(254,240,138,1)]" />
        <div className="absolute top-1.5 right-2 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_4px_rgba(254,240,138,1)]" />
      </div>

      {/* "AKTIVNI KLIJENTI" wall display — back left */}
      <div className="absolute left-1 top-1 h-9 w-14 border border-emerald-700/80 bg-emerald-950/60 shadow-[inset_0_0_4px_rgba(16,185,129,0.3)]">
        <div className="border-b border-emerald-800 bg-emerald-900/80 px-1 py-px">
          <div className="font-mono text-[5px] font-bold uppercase leading-none tracking-wider text-emerald-300">
            CLIENTS · 2
          </div>
        </div>
        <div className="space-y-px p-1">
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.8)]" />
            <div className="font-mono text-[4px] text-emerald-200">DORIJAN</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.8)]" />
            <div className="font-mono text-[4px] text-emerald-200">BAYWASH</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-yellow-400" />
            <div className="font-mono text-[4px] text-emerald-200/70">OB-Q</div>
          </div>
        </div>
      </div>

      {/* Framed artwork — back right */}
      <div className="absolute right-2 top-1 h-7 w-9 border-2 border-amber-700 bg-stone-900 shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0.5 bg-gradient-to-br from-emerald-900 via-emerald-700 to-stone-800">
          {/* Mountains */}
          <div className="absolute bottom-0 left-0 right-0 h-3"
            style={{
              clipPath: "polygon(0 100%, 20% 40%, 40% 70%, 60% 30%, 80% 60%, 100% 50%, 100% 100%)",
              background: "linear-gradient(to bottom, rgb(20 83 45), rgb(6 78 59))",
            }}
          />
          {/* Sun */}
          <div className="absolute top-1 right-2 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_3px_rgba(252,211,77,0.8)]" />
        </div>
      </div>

      {/* Reception desk with terminal + clipboard — bottom left */}
      <div className="absolute bottom-2.5 left-2 h-4 w-14 rounded-sm border border-emerald-700/80 bg-gradient-to-b from-emerald-950/80 to-stone-950 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5)]">
        {/* Front panel detail */}
        <div className="absolute bottom-0 left-1 right-1 h-px bg-emerald-700/60" />
        <div className="absolute bottom-1 left-1 right-1 h-px bg-emerald-800/60" />
      </div>
      {/* Terminal screen on desk */}
      <div className="absolute bottom-[1.65rem] left-3 h-3 w-4 border border-emerald-700 bg-emerald-900/80 shadow-[inset_0_0_2px_rgba(16,185,129,0.5)]">
        <div className="m-px h-px w-2 bg-emerald-400/80" />
        <div className="m-px mt-px h-px w-3 bg-emerald-400/60" />
      </div>
      {/* Sign-in clipboard */}
      <div className="absolute bottom-[1.65rem] left-9 h-2 w-1.5 border border-stone-600 bg-stone-100 shadow-sm">
        <div className="m-px h-px w-px bg-stone-700" />
      </div>
      {/* Brass desk lamp */}
      <div className="absolute bottom-[1.65rem] left-12 h-3 w-2">
        <div className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-amber-700" />
        <div className="absolute top-0 left-0 h-1 w-2 rounded-t-full bg-amber-600 shadow-[0_0_3px_rgba(252,211,77,0.6)]" />
        {/* Light cone */}
        <div
          className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 bg-gradient-to-b from-amber-200/40 to-transparent"
          style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }}
        />
      </div>

      {/* Visitor book on pedestal — bottom center */}
      <div className="absolute bottom-2.5 left-1/2 h-4 w-3 -translate-x-1/2">
        <div className="absolute bottom-0 left-1/2 h-3 w-1 -translate-x-1/2 bg-amber-900 shadow-[inset_-1px_0_1px_rgba(0,0,0,0.4)]" />
        <div className="absolute top-0 left-0 right-0 h-1 rounded-sm border border-amber-700 bg-amber-100">
          <div className="m-px h-px w-1 bg-stone-700" />
        </div>
      </div>

      {/* Chesterfield leather sofa — bottom right */}
      <div className="absolute bottom-2.5 right-2 h-4 w-9">
        {/* Backrest */}
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t border border-amber-900 bg-gradient-to-b from-amber-700 to-amber-900 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5)]">
          {/* Tufting buttons */}
          <div className="absolute left-1 top-1 h-px w-px rounded-full bg-amber-300" />
          <div className="absolute left-3 top-1 h-px w-px rounded-full bg-amber-300" />
          <div className="absolute left-5 top-1 h-px w-px rounded-full bg-amber-300" />
          <div className="absolute right-1 top-1 h-px w-px rounded-full bg-amber-300" />
        </div>
        {/* Seat cushion */}
        <div className="absolute top-2 left-0 right-0 h-1 bg-amber-700 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.4)]" />
        {/* Armrests */}
        <div className="absolute top-0 left-0 h-3 w-1 rounded-l border border-amber-900 bg-amber-800" />
        <div className="absolute top-0 right-0 h-3 w-1 rounded-r border border-amber-900 bg-amber-800" />
        {/* Cushion / pillow */}
        <div className="absolute top-1 left-1.5 h-1 w-2 rounded bg-emerald-600/80" />
      </div>

      {/* Coffee table with magazines */}
      <div className="absolute bottom-2.5 right-12 h-1.5 w-4 rounded-sm border-t border-amber-700/70 bg-amber-950">
        <div className="absolute -top-px left-1 h-px w-1.5 bg-rose-300/70" />
        <div className="absolute -top-px right-1 h-px w-1 bg-cyan-300/70" />
      </div>

      {/* Tall potted plant — corner */}
      <div className="absolute bottom-2.5 left-[5.5rem] flex flex-col items-center">
        <div className="relative h-5 w-3">
          {/* Many leaves */}
          <div className="absolute left-0 top-0 h-3 w-1 origin-bottom -rotate-12 rounded-t-full bg-green-700" />
          <div className="absolute left-1 top-0 h-4 w-1 origin-bottom rounded-t-full bg-green-600" />
          <div className="absolute left-2 top-0 h-3 w-1 origin-bottom rotate-12 rounded-t-full bg-green-700" />
          <div className="absolute left-0 top-1 h-2 w-1 origin-bottom -rotate-[30deg] rounded-t-full bg-green-800" />
          <div className="absolute left-2 top-1 h-2 w-1 origin-bottom rotate-[30deg] rounded-t-full bg-green-800" />
        </div>
        {/* Pot */}
        <div className="h-2 w-3 rounded-b border-t border-amber-700 bg-gradient-to-b from-amber-800 to-amber-950" />
      </div>

      {/* Welcome mat / floor pattern */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-emerald-700/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950">
        {/* Marble veining */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 8px)",
          }}
        />
      </div>
    </>
  );
}

/* =================================================================== */
/* ATLAS — Hollywood PR studio                                          */
/* =================================================================== */
function AtlasFurniture() {
  return (
    <>
      {/* Step-and-repeat backdrop — back wall */}
      <div className="absolute left-2 top-1 h-12 w-32 border border-rose-700/80 bg-gradient-to-br from-rose-900/40 via-stone-900 to-rose-900/40 shadow-[inset_0_0_4px_rgba(244,63,94,0.3)]">
        {/* Tiled "LAMON" logos */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 4px, rgba(244,63,94,0.15) 4px 5px), repeating-linear-gradient(90deg, transparent 0 8px, rgba(244,63,94,0.15) 8px 9px)",
          }}
        />
        {/* Logo tiles */}
        <div className="grid h-full grid-cols-4 grid-rows-2 gap-px p-px">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center font-mono text-[5px] font-bold uppercase tracking-wider text-rose-200/60"
            >
              LAMON
            </div>
          ))}
        </div>
      </div>

      {/* Spotlights from above — 3 cones */}
      {[20, 50, 80].map((x, i) => (
        <div key={i}>
          {/* Lamp head */}
          <div
            className="absolute h-1.5 w-2 rounded-b border border-stone-700 bg-stone-800"
            style={{ left: `${x}%`, top: 0, transform: "translateX(-50%)" }}
          />
          {/* Light cone */}
          <div
            className="pointer-events-none absolute h-12 w-8 bg-gradient-to-b from-yellow-200/35 to-transparent"
            style={{
              left: `${x}%`,
              top: "1.5rem",
              transform: "translateX(-50%)",
              clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
              filter: "blur(1px)",
            }}
          />
        </div>
      ))}

      {/* "FAME WALL" sign */}
      <div className="absolute left-2 top-[3.4rem] flex items-center gap-1">
        <span className="text-[6px]">★</span>
        <span className="font-mono text-[6px] font-bold uppercase tracking-[0.3em] text-rose-300">
          FAME WALL
        </span>
        <span className="text-[6px]">★</span>
      </div>

      {/* Trophy shelf — left side, packed */}
      <div className="absolute left-2 top-12 h-10 w-12">
        <div className="h-px w-full bg-rose-700/60" />
        <div className="flex items-end gap-px pl-px">
          <span className="text-[10px] leading-none">🏆</span>
          <span className="text-[10px] leading-none">🥇</span>
          <span className="text-[9px] leading-none">🎬</span>
          <span className="text-[8px] leading-none">⭐</span>
        </div>
        <div className="mt-2 h-px w-full bg-rose-700/40" />
        {/* Magazine covers on shelf */}
        <div className="mt-1 flex items-end gap-px pl-px">
          <div className="h-3 w-2 border border-rose-600/80 bg-gradient-to-b from-rose-200 to-rose-500 shadow-[0_0_2px_rgba(244,63,94,0.4)]">
            <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
          </div>
          <div className="h-3 w-2 border border-rose-600/80 bg-gradient-to-b from-amber-200 to-rose-400">
            <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
          </div>
          <div className="h-3 w-2 border border-rose-600/80 bg-gradient-to-b from-cyan-200 to-rose-400">
            <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
          </div>
          <div className="h-3 w-2 border border-rose-600/80 bg-gradient-to-b from-purple-200 to-rose-400">
            <div className="absolute bottom-px left-px h-px w-1 bg-rose-900/60" />
          </div>
        </div>
      </div>

      {/* Hollywood vanity mirror with bulbs — right back wall */}
      <div className="absolute right-2 top-12 h-10 w-9 border-2 border-amber-600 bg-stone-800 shadow-[inset_0_0_3px_rgba(0,0,0,0.5)]">
        {/* Mirror surface */}
        <div className="absolute inset-1 border border-amber-700/60 bg-gradient-to-b from-stone-300/30 to-stone-500/30" />
        {/* Reflection sheen */}
        <div className="absolute inset-1 bg-gradient-to-tr from-transparent via-white/15 to-transparent" />
        {/* Bulbs around mirror */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`top-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.9)]"
            style={{ top: -1, left: `${(i + 0.5) * 14}%` }}
          />
        ))}
        {[...Array(4)].map((_, i) => (
          <div
            key={`l-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.9)]"
            style={{ left: -1, top: `${(i + 0.5) * 22}%` }}
          />
        ))}
        {[...Array(4)].map((_, i) => (
          <div
            key={`r-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.9)]"
            style={{ right: -1, top: `${(i + 0.5) * 22}%` }}
          />
        ))}
      </div>

      {/* Boom mic from above — center */}
      <div className="absolute left-1/2 top-2 -translate-x-1/2">
        {/* Pole */}
        <div className="h-12 w-px bg-stone-700" />
        {/* Mic head */}
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-stone-500 bg-stone-800 shadow-[inset_0_0_2px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 rounded-full opacity-50"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0 1px, transparent 1px 2px)",
            }}
          />
        </div>
        {/* Wind muff */}
        <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-stone-700/40 blur-[0.5px]" />
      </div>

      {/* Camera on tripod — bottom right */}
      <div className="absolute bottom-2.5 right-2 h-10 w-6">
        {/* Camera body */}
        <div className="absolute top-0 left-1/2 h-3 w-5 -translate-x-1/2 rounded border border-rose-700/80 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[inset_0_0_2px_rgba(244,63,94,0.3)]">
          {/* Lens */}
          <div className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-rose-500 bg-stone-950 shadow-[inset_0_0_2px_rgba(244,63,94,0.5)]">
            <div className="absolute inset-0.5 rounded-full border border-stone-600" />
          </div>
          {/* Red REC light */}
          <div className="absolute left-1 top-1 h-px w-px rounded-full bg-rose-400 shadow-[0_0_3px_rgba(251,113,133,0.9)]" />
          {/* Viewfinder */}
          <div className="absolute -top-1 left-1 h-1 w-1 rounded-sm border border-rose-700 bg-stone-800" />
        </div>
        {/* Tripod legs */}
        <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 origin-top -rotate-12 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 origin-top rotate-12 bg-stone-700" />
        {/* Base feet */}
        <div className="absolute bottom-0 left-0 h-px w-1 bg-stone-800" />
        <div className="absolute bottom-0 right-0 h-px w-1 bg-stone-800" />
        <div className="absolute bottom-0 left-1/2 h-px w-1 -translate-x-1/2 bg-stone-800" />
      </div>

      {/* Ring light — bottom left */}
      <div className="absolute bottom-2.5 left-2 h-9 w-7">
        {/* Ring */}
        <div className="absolute top-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-yellow-200/90 bg-yellow-100/15 shadow-[0_0_8px_rgba(253,224,71,0.6),inset_0_0_4px_rgba(254,240,138,0.5)]">
          <div className="absolute inset-1 rounded-full border border-yellow-300/40" />
        </div>
        {/* Stand */}
        <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 bg-stone-700" />
        {/* Adjustment knob */}
        <div className="absolute bottom-3 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full border border-stone-600 bg-stone-800" />
        {/* Base */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-stone-700" />
      </div>

      {/* Director's chair with name — center bottom */}
      <div className="absolute bottom-2.5 left-1/2 h-7 w-5 -translate-x-1/2">
        {/* Backrest with name */}
        <div className="absolute top-0 left-0 right-0 h-3 rounded-sm border border-rose-800 bg-rose-900 shadow-md">
          <div className="m-px font-mono text-[4px] font-bold uppercase leading-none text-rose-100">
            ATLAS
          </div>
        </div>
        {/* Seat */}
        <div className="absolute top-3 left-0 right-0 h-2 bg-rose-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Legs (X-shape) */}
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 origin-top rotate-[15deg] bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 origin-top -rotate-[15deg] bg-stone-700" />
      </div>

      {/* Red carpet runner — floor strip with darker red */}
      <div className="absolute bottom-1 left-1/4 right-1/4 h-1.5 rounded-sm bg-gradient-to-r from-rose-950 via-rose-800 to-rose-950 shadow-[inset_0_0_2px_rgba(0,0,0,0.5)]">
        {/* Gold trim edges */}
        <div className="absolute inset-x-0 top-0 h-px bg-yellow-500/60" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-yellow-500/60" />
      </div>

      {/* Hollywood star on floor */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] leading-none text-yellow-300 shadow-[0_0_3px_rgba(250,204,21,0.7)]">
        ★
      </div>
    </>
  );
}

/* =================================================================== */
/* MENTAT — strategic war room                                          */
/* =================================================================== */
function MentatFurniture() {
  return (
    <>
      {/* Big tactical map on back wall — center */}
      <div className="absolute left-1/2 top-1 h-10 w-20 -translate-x-1/2 border border-violet-700/80 bg-violet-950/80 shadow-[inset_0_0_4px_rgba(139,92,246,0.3)]">
        {/* Header */}
        <div className="border-b border-violet-800 bg-violet-900/70 px-1 font-mono text-[5px] font-bold leading-none tracking-wider text-violet-300">
          ▼ TACTICAL OVERLAY
        </div>
        {/* Grid */}
        <div
          className="absolute inset-x-0 bottom-0 top-2 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(139,92,246,0.4) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(139,92,246,0.4) 0 1px, transparent 1px 5px)",
          }}
        />
        {/* Croatia outline (rough) */}
        <svg viewBox="0 0 80 32" className="absolute inset-x-0 bottom-0 top-2 h-6 w-full opacity-60">
          <path
            d="M 10 10 L 25 8 L 40 14 L 55 10 L 70 16 L 65 22 L 55 26 L 40 24 L 25 28 L 15 22 Z"
            fill="rgba(139,92,246,0.2)"
            stroke="rgb(167 139 250)"
            strokeWidth="0.4"
          />
        </svg>
        {/* Pinned strategic positions */}
        <div className="absolute left-3 top-4 h-1 w-1 rounded-full bg-red-400 shadow-[0_0_3px_rgba(248,113,113,0.9)]" />
        <div className="absolute right-4 top-3 h-1 w-1 rounded-full bg-yellow-400 shadow-[0_0_3px_rgba(250,204,21,0.9)]" />
        <div className="absolute left-6 bottom-2 h-1 w-1 rounded-full bg-green-400 shadow-[0_0_3px_rgba(74,222,128,0.9)]" />
        <div className="absolute right-6 bottom-3 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_3px_rgba(34,211,238,0.9)]" />
        {/* Strategy lines (dashed) */}
        <svg viewBox="0 0 80 32" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M 12 14 L 60 12" stroke="rgb(248 113 113)" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
          <path d="M 12 14 L 24 26" stroke="rgb(74 222 128)" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
          <path d="M 60 12 L 56 26" stroke="rgb(34 211 238)" strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
        </svg>
      </div>

      {/* Bookshelf — left back wall, packed */}
      <div className="absolute left-1 top-1 h-12 w-7 border border-violet-900 bg-stone-900 shadow-[inset_0_0_3px_rgba(0,0,0,0.5)]">
        {[0, 1, 2, 3].map((shelf) => (
          <div key={shelf} className="border-b border-stone-800 px-px py-px">
            <div className="flex items-end gap-px">
              {[
                "bg-violet-700",
                "bg-stone-700",
                "bg-emerald-800",
                "bg-amber-800",
                "bg-red-800",
                "bg-stone-600",
                "bg-blue-800",
              ]
                .slice(0, 5 + (shelf % 2))
                .map((color, i) => (
                  <div
                    key={i}
                    className={`h-2 w-px ${color}`}
                    style={{ height: `${6 + (i % 3) * 2}px` }}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bust on top of bookshelf */}
      <div className="absolute left-1 top-[1.65rem] h-2 w-7 -mt-2 flex items-end justify-center">
        <div className="flex flex-col items-center">
          <div className="h-1 w-1 rounded-full bg-stone-300" />
          <div className="h-1 w-2 bg-stone-400" />
          <div className="h-px w-3 bg-stone-500" />
        </div>
      </div>

      {/* Country flags row — back right wall */}
      <div className="absolute right-1 top-2 flex flex-col gap-px">
        {[
          ["bg-red-700", "bg-blue-700", "bg-white"],
          ["bg-blue-600", "bg-yellow-400", "bg-blue-600"],
          ["bg-emerald-600", "bg-stone-200", "bg-red-600"],
        ].map((flag, i) => (
          <div key={i} className="flex h-1.5 w-5 overflow-hidden border border-stone-700">
            {flag.map((stripe, j) => (
              <div key={j} className={`flex-1 ${stripe}`} />
            ))}
          </div>
        ))}
      </div>

      {/* Red phone (hotline) — right wall */}
      <div className="absolute right-2 top-9 h-3 w-3">
        <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded bg-red-700 shadow-[0_0_3px_rgba(248,113,113,0.5)]" />
        <div className="absolute top-0 left-0 right-0 h-1 rounded-full bg-red-600" />
        <div className="absolute bottom-0.5 left-1/2 h-px w-px rounded-full bg-yellow-300" />
      </div>

      {/* Big oval war table — bottom center */}
      <div className="absolute bottom-2 left-1/2 h-7 w-24 -translate-x-1/2">
        {/* Table top */}
        <div className="absolute top-0 left-0 right-0 h-4 rounded-full border-2 border-violet-700/90 bg-gradient-to-b from-violet-900/80 to-violet-950 shadow-[inset_0_0_6px_rgba(139,92,246,0.4),0_2px_4px_rgba(0,0,0,0.6)]">
          {/* Tactical grid on table */}
          <div className="absolute inset-1 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(139,92,246,0.5) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(139,92,246,0.5) 0 1px, transparent 1px 6px)",
            }}
          />
          {/* Game pieces */}
          <div className="absolute left-3 top-1 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_2px_rgba(248,113,113,0.7)]" />
          <div className="absolute left-7 top-2 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_2px_rgba(96,165,250,0.7)]" />
          <div className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-yellow-400 shadow-[0_0_2px_rgba(250,204,21,0.7)]" />
          <div className="absolute right-7 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(74,222,128,0.7)]" />
          <div className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_2px_rgba(167,139,250,0.7)]" />
          {/* Flag centerpiece */}
          <div className="absolute left-1/2 bottom-1 h-1.5 w-px -translate-x-1/2 bg-stone-300" />
          <div className="absolute left-1/2 bottom-2 h-1 w-1.5 -translate-x-1/2 bg-violet-500" />
        </div>
        {/* Table base */}
        <div className="absolute bottom-0 left-1/2 h-3 w-2 -translate-x-1/2 bg-stone-800" />
        <div className="absolute bottom-0 left-1/2 h-px w-6 -translate-x-1/2 bg-stone-700" />
      </div>

      {/* Standing globe — bottom right */}
      <div className="absolute bottom-2.5 right-2 h-7 w-4">
        <div className="absolute top-0 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-violet-600/80 bg-gradient-to-br from-cyan-900 via-blue-950 to-stone-950 shadow-[inset_0_0_3px_rgba(139,92,246,0.5)]">
          {/* Continents */}
          <div className="absolute left-0.5 top-1 h-px w-1 bg-emerald-300" />
          <div className="absolute right-0.5 top-1 h-px w-1.5 bg-emerald-300" />
          <div className="absolute left-0.5 bottom-1 h-px w-1.5 bg-emerald-300" />
          <div className="absolute right-1 bottom-1 h-px w-px bg-emerald-300" />
          {/* Equator */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-violet-400/40" />
        </div>
        {/* Stand */}
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-px w-3 -translate-x-1/2 bg-stone-700" />
      </div>

      {/* Chess board — bottom left */}
      <div className="absolute bottom-2.5 left-2 h-3 w-4 border border-stone-700">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "repeating-conic-gradient(rgb(28 25 23) 0% 25%, rgb(245 245 244) 0% 50%) 50% / 4px 4px",
          }}
        />
        {/* Piece on top */}
        <div className="absolute -top-1 left-1 h-1 w-1 rounded-full bg-stone-200" />
      </div>

      {/* Liquor decanter on shelf — back center under map */}
      <div className="absolute left-1/2 top-[3rem] h-3 w-2 -translate-x-1/2">
        {/* Decanter */}
        <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-b border border-amber-300/60 bg-gradient-to-b from-amber-300/40 to-amber-700/80" />
        {/* Stopper */}
        <div className="absolute top-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-t bg-amber-200/80" />
      </div>
    </>
  );
}

/* =================================================================== */
/* FORGE — content blacksmith                                           */
/* =================================================================== */
function ForgeFurniture() {
  return (
    <>
      {/* Wares wall — weapons + tools */}
      <div className="absolute left-12 top-2 h-12 w-20">
        {/* Pegboard background */}
        <div
          className="absolute inset-0 rounded-sm border border-amber-900/70 bg-amber-950/50"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.5) 0.5px, transparent 0.5px)",
            backgroundSize: "4px 4px",
          }}
        />
        {/* Sword 1 */}
        <div className="absolute left-1 top-1 h-10 w-px bg-stone-300/90 shadow-[0_0_2px_rgba(255,255,255,0.3)]" />
        <div className="absolute left-1 top-9 h-px w-2 -translate-x-1/2 bg-amber-700" />
        <div className="absolute left-1 top-1 h-1 w-px -translate-x-1/2 bg-amber-200" />
        {/* Sword 2 */}
        <div className="absolute right-1 top-1 h-10 w-px bg-stone-300/90 shadow-[0_0_2px_rgba(255,255,255,0.3)]" />
        <div className="absolute right-1 top-9 h-px w-2 translate-x-1/2 bg-amber-700" />
        <div className="absolute right-1 top-1 h-1 w-px translate-x-1/2 bg-amber-200" />
        {/* Hammer 1 */}
        <div className="absolute left-5 top-1 h-5 w-px bg-amber-800" />
        <div className="absolute left-4 top-5 h-1.5 w-3 bg-stone-700 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Hammer 2 */}
        <div className="absolute left-1/2 top-1 h-4 w-px bg-amber-800" />
        <div className="absolute left-1/2 top-4 h-1.5 w-2.5 -translate-x-1/2 bg-stone-700 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {/* Tongs */}
        <div className="absolute right-5 top-1 h-5 w-px bg-stone-600" />
        <div className="absolute right-5 top-5 h-px w-1.5 -rotate-[30deg] bg-stone-600" />
        <div className="absolute right-5 top-5 h-px w-1.5 rotate-[30deg] bg-stone-600" />
        {/* Axe */}
        <div className="absolute left-9 top-1 h-6 w-px bg-amber-800" />
        <div className="absolute left-9 top-1 h-2 w-2 bg-stone-600"
          style={{ clipPath: "polygon(0 0, 100% 25%, 100% 75%, 0 100%)" }}
        />
        {/* Horseshoe */}
        <div className="absolute left-[3.25rem] top-7 h-2 w-2 rounded-t-full border-2 border-stone-400 border-b-transparent" />
        {/* Chain links */}
        <div className="absolute right-7 top-7 flex flex-col gap-px">
          <div className="h-1 w-1 rounded-full border border-stone-500" />
          <div className="h-1 w-1 rounded-full border border-stone-500" />
          <div className="h-1 w-1 rounded-full border border-stone-500" />
        </div>
      </div>

      {/* "SMITHY" sign with anvil icon */}
      <div className="absolute left-12 top-[3.7rem] flex items-center gap-1">
        <span className="text-[7px] leading-none">⚒</span>
        <span className="font-mono text-[6px] font-bold uppercase tracking-[0.3em] text-amber-300">
          SMITHY · CONTENT FORGE
        </span>
        <span className="text-[7px] leading-none">⚒</span>
      </div>

      {/* MASSIVE forge furnace — left, glowing */}
      <div className="absolute left-1 top-2 h-16 w-10 rounded-t border border-amber-700/90 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 shadow-[inset_0_0_8px_rgba(0,0,0,0.7),0_0_12px_rgba(251,146,60,0.35)]">
        {/* Brick texture */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(120,53,15,0.5) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(120,53,15,0.5) 0 1px, transparent 1px 7px)",
          }}
        />
        {/* Mouth opening */}
        <div className="absolute inset-x-1 top-3 h-10 rounded-t-md border border-amber-900 bg-gradient-to-t from-yellow-200 via-orange-500 to-red-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_14px_rgba(251,146,60,0.7)]">
          {/* Flame flickers */}
          <div className="absolute bottom-1 left-1 h-3 w-1 rounded-t-full bg-yellow-200/95 blur-[0.4px]" />
          <div className="absolute bottom-1 left-3 h-4 w-1 rounded-t-full bg-yellow-300 blur-[0.4px]" />
          <div className="absolute bottom-1 right-2 h-3 w-1 rounded-t-full bg-orange-300/95 blur-[0.4px]" />
          <div className="absolute bottom-1 right-0.5 h-2 w-1 rounded-t-full bg-yellow-200/90 blur-[0.4px]" />
          {/* Hot center */}
          <div className="absolute bottom-1 left-1.5 right-1.5 h-2 rounded-t bg-gradient-to-t from-yellow-100 to-orange-300 blur-[0.5px]" />
        </div>
        {/* Smoke vent */}
        <div className="absolute -top-2 left-1/2 h-2 w-4 -translate-x-1/2 rounded-t bg-stone-700" />
        {/* Smoke wisps from vent */}
        <div className="absolute -top-6 left-1/2 h-4 w-px -translate-x-1/2 bg-gradient-to-t from-stone-400/60 to-transparent blur-[0.5px]" />
        <div className="absolute -top-5 left-[55%] h-3 w-px bg-gradient-to-t from-stone-300/40 to-transparent blur-[0.5px]" />
        {/* Glowing coal at floor of mouth */}
        <div className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded bg-gradient-to-t from-red-600 to-orange-300 shadow-[0_0_4px_rgba(251,146,60,0.9)]" />
        {/* Vent pipe */}
        <div className="absolute -top-1 right-2 h-1 w-1 rounded-full bg-stone-700" />
      </div>

      {/* Bellows — bottom of forge */}
      <div className="absolute bottom-2.5 left-2 h-3 w-3">
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-amber-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]"
          style={{ clipPath: "polygon(0 50%, 100% 0, 100% 100%, 0 100%)" }}
        />
        {/* Wood handles */}
        <div className="absolute bottom-1 right-0 h-px w-1.5 bg-amber-800" />
      </div>

      {/* Sparks above forge — animated effect via blur */}
      <div className="absolute left-2 top-1 h-px w-px rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.95)]" />
      <div className="absolute left-3 top-2 h-px w-px rounded-full bg-orange-300 shadow-[0_0_4px_rgba(251,146,60,0.95)]" />
      <div className="absolute left-4 top-3 h-px w-px rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(254,240,138,0.95)]" />
      <div className="absolute left-5 top-2 h-px w-px rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.95)]" />

      {/* Anvil — bottom center */}
      <div className="absolute bottom-2.5 left-1/2 h-4 w-9 -translate-x-1/2">
        {/* Top (with horn) */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-l-full rounded-r-sm bg-gradient-to-b from-stone-500 to-stone-700 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.5)]" />
        {/* Waist */}
        <div className="absolute top-1.5 left-2 right-2 h-1.5 bg-stone-800" />
        {/* Base */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b bg-stone-700 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.6)]" />
      </div>

      {/* Glowing red-hot ingot on anvil */}
      <div className="absolute bottom-[2.55rem] left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 shadow-[0_0_5px_rgba(251,146,60,0.95)] blur-[0.3px]" />

      {/* Hammer leaning against anvil */}
      <div className="absolute bottom-2.5 left-[55%] h-5 w-px origin-bottom rotate-[15deg] bg-amber-800" />
      <div className="absolute bottom-[2.9rem] left-[54%] h-1.5 w-2 origin-bottom rotate-[15deg] bg-stone-600 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />

      {/* Water trough for cooling */}
      <div className="absolute bottom-2.5 right-7 h-2 w-5 rounded-sm border border-amber-900 bg-gradient-to-b from-blue-900/80 to-blue-950 shadow-[inset_0_0_3px_rgba(59,130,246,0.3)]">
        {/* Water surface highlight */}
        <div className="absolute inset-x-0.5 top-0 h-px bg-cyan-300/50" />
        {/* Steam from water */}
        <div className="absolute -top-2 left-2 h-2 w-px bg-gradient-to-t from-cyan-200/40 to-transparent blur-[0.5px]" />
        <div className="absolute -top-2 right-2 h-2 w-px bg-gradient-to-t from-cyan-200/40 to-transparent blur-[0.5px]" />
      </div>

      {/* Coal pile — bottom right */}
      <div className="absolute bottom-2.5 right-2 flex items-end gap-px">
        <div className="h-1 w-1 rotate-12 bg-stone-900" />
        <div className="h-1.5 w-1.5 -rotate-6 bg-stone-950" />
        <div className="h-1 w-1 rotate-45 bg-stone-900" />
        <div className="h-1.5 w-1 -rotate-12 bg-stone-950" />
        <div className="h-1 w-1 rotate-[30deg] bg-stone-900" />
      </div>
      {/* Glowing ember on top */}
      <div className="absolute bottom-[1.3rem] right-3 h-px w-1 rounded-full bg-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.9)]" />

      {/* Leather apron hanging on hook — far right */}
      <div className="absolute bottom-[3.3rem] right-2 h-4 w-2.5">
        <div className="absolute top-0 left-1/2 h-px w-1 -translate-x-1/2 bg-stone-600" />
        <div className="absolute top-px left-0 right-0 h-4 bg-amber-900/95 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-x-px top-0 h-px bg-amber-700" />
          <div className="absolute -top-1 left-px h-1 w-px bg-amber-800" />
          <div className="absolute -top-1 right-px h-1 w-px bg-amber-800" />
        </div>
      </div>

      {/* Stone floor */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-stone-700/80 bg-gradient-to-b from-stone-800 to-stone-950"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 8px)",
        }}
      />
    </>
  );
}
