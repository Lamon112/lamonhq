"use client";

/**
 * Per-agent themed scenes — HERO-FIRST design.
 *
 * Each room has ONE dominant feature (huge window, marquee, world map,
 * holo viewport, neon sign, banner) that takes 50-65% of back wall so
 * the room's function reads in milliseconds without reading text.
 *
 * Plus secondary furniture vignette in the lower half + side walls
 * for richness.
 *
 *   Holmes   → noir bureau · HERO: arched window with venetian blinds +
 *              dramatic streetlight + city silhouette + rain
 *   Jarvis   → arc-reactor command · HERO: massive holographic Earth
 *              with orbiting rings + "AI CORE ONLINE"
 *   Nova     → mad-scientist lab · HERO: specimen observation tank with
 *              floating atom inside + biohazard frame
 *   Comms    → operator hub · HERO: huge world map with pulsing
 *              connection arcs from Croatia to global hubs
 *   Treasury → bank vault · HERO: massive vault door + "€30K GOAL"
 *              progress banner + giant € insignia
 *   Steward  → reception · HERO: cursive neon "Welcome" sign + panoramic
 *              city window + "CLIENT HQ" text
 *   Atlas    → PR studio · HERO: marquee bulbs spelling "★ ATLAS ★" +
 *              ON-AIR red light + step-and-repeat backdrop
 *   Mentat   → war room · HERO: huge tactical world map covering full
 *              back wall + "▼ WAR ROOM ▼" stencil + strategy lines
 *   Forge    → smithy · HERO: enormous glowing furnace + tall flames +
 *              "⚒ FORGE ⚒" iron crest sign
 */

import type { AgentId } from "@/lib/vault";
import { LaptopStation, PhoneStation } from "./Humans";

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
/* HERO 1: floor-to-ceiling bookshelf in CENTER (10 shelves of books    */
/*         + skull on top + globe + rolling ladder)                     */
/* HERO 2: arched noir window on LEFT with city silhouette + moon       */
/* =================================================================== */
function HolmesFurniture() {
  return (
    <>
      {/* === HERO 1 (CENTER): MASSIVE floor-to-ceiling bookshelf === */}
      <div className="absolute left-1/2 top-0 h-[7.5rem] w-20 -translate-x-1/2 border-2 border-amber-950 bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950 shadow-[inset_0_0_8px_rgba(0,0,0,0.8),0_2px_4px_rgba(0,0,0,0.6)]">
        {/* Wood grain wallpaper */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(120,53,15,0.4) 0 1px, transparent 1px 6px)",
          }}
        />
        {/* 10 packed shelves */}
        {[...Array(10)].map((_, shelf) => {
          // book color palette per shelf — varied for organic feel
          const palettes = [
            ["bg-red-800", "bg-stone-700", "bg-emerald-900", "bg-amber-700", "bg-stone-800"],
            ["bg-amber-800", "bg-red-900", "bg-stone-600", "bg-emerald-800", "bg-amber-900"],
            ["bg-stone-700", "bg-emerald-800", "bg-red-700", "bg-amber-800", "bg-stone-800"],
            ["bg-red-900", "bg-amber-700", "bg-stone-700", "bg-emerald-900"],
            ["bg-amber-900", "bg-stone-800", "bg-red-800", "bg-amber-700", "bg-emerald-800"],
          ];
          const books = palettes[shelf % palettes.length];
          return (
            <div
              key={shelf}
              className="relative h-3 border-b border-amber-950 px-px"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.4) 0, transparent 8%)",
              }}
            >
              {/* Books standing up */}
              <div className="absolute bottom-px left-px right-px flex items-end gap-px">
                {books.concat(books).slice(0, 13).map((color, i) => (
                  <div
                    key={i}
                    className={`${color} shadow-[inset_-1px_0_0_rgba(0,0,0,0.4)]`}
                    style={{
                      width: i % 4 === 0 ? "2px" : "1px",
                      height: `${7 + ((i * 3) % 4)}px`,
                    }}
                  />
                ))}
              </div>
              {/* Occasional sideways book */}
              {shelf === 3 && (
                <div className="absolute bottom-px right-2 h-1 w-2 bg-amber-800 shadow-[inset_-1px_0_0_rgba(0,0,0,0.4)]" />
              )}
              {shelf === 6 && (
                <div className="absolute bottom-px left-2 h-1 w-2 bg-emerald-800 shadow-[inset_-1px_0_0_rgba(0,0,0,0.4)]" />
              )}
              {/* Shelf wood plank front edge */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-950 shadow-[0_1px_0_rgba(0,0,0,0.5)]" />
            </div>
          );
        })}

        {/* Skull on top shelf */}
        <div className="absolute left-2 -top-3 text-[12px] leading-none">💀</div>

        {/* Globe on top shelf */}
        <div className="absolute right-2 -top-3 h-3 w-3">
          <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-amber-700/80 bg-gradient-to-br from-cyan-800 via-blue-900 to-stone-950 shadow-[0_0_2px_rgba(6,182,212,0.4)]">
            <div className="absolute left-0.5 top-0.5 h-px w-px bg-emerald-300" />
            <div className="absolute right-0.5 top-1 h-px w-px bg-emerald-300" />
          </div>
          <div className="absolute bottom-0 left-1/2 h-1 w-px -translate-x-1/2 bg-amber-700" />
        </div>

        {/* Rolling brass ladder leaning on shelf */}
        <div className="absolute -right-2 bottom-0 h-[7rem] w-px origin-bottom rotate-[8deg] bg-amber-700/80" />
        <div className="absolute -right-3 bottom-0 h-[7rem] w-px origin-bottom rotate-[8deg] bg-amber-700/80" />
        {/* Ladder rungs */}
        {[10, 25, 40, 55, 70, 85].map((y, i) => (
          <div
            key={i}
            className="absolute -right-3 h-px w-2 origin-right rotate-[8deg] bg-amber-700/80"
            style={{ bottom: `${y}%` }}
          />
        ))}

        {/* Brass picture light (shelf-top lamp) */}
        <div className="absolute left-1/2 -top-1 h-1 w-4 -translate-x-1/2 rounded-t bg-amber-600 shadow-[0_0_4px_rgba(252,211,77,0.6)]" />
      </div>

      {/* === HERO 2 (LEFT): smaller noir window === */}
      <div className="absolute left-2 top-1 h-20 w-16 rounded-t-[40%] border-2 border-amber-900/90 bg-gradient-to-b from-stone-900 via-stone-950 to-blue-950 shadow-[inset_0_0_6px_rgba(0,0,0,0.7),0_2px_4px_rgba(0,0,0,0.5)]">
        {/* Sky gradient (night) */}
        <div className="absolute inset-0 rounded-t-[40%] bg-gradient-to-b from-amber-100/8 via-blue-900/20 to-stone-950" />

        {/* MOON */}
        <div className="absolute right-1.5 top-2 h-3 w-3 rounded-full bg-gradient-to-br from-amber-100 to-amber-300 shadow-[0_0_8px_rgba(254,240,138,0.7),inset_-1px_-1px_2px_rgba(180,120,60,0.4)]" />

        {/* City silhouettes (compact) */}
        <div className="absolute bottom-0 left-0 right-0 h-6">
          <div className="absolute bottom-0 left-0.5 h-3 w-2 bg-stone-950">
            <div className="absolute left-0.5 top-1 h-px w-px bg-amber-300" />
          </div>
          <div className="absolute bottom-0 left-3 h-5 w-3 bg-stone-950">
            <div className="absolute left-0.5 top-1 h-px w-px bg-amber-300" />
            <div className="absolute right-0.5 top-3 h-px w-px bg-amber-300" />
          </div>
          <div className="absolute bottom-0 left-7 h-4 w-2 bg-stone-950" />
          <div className="absolute bottom-0 left-10 h-5 w-3 bg-stone-950">
            <div className="absolute left-0.5 top-1 h-px w-px bg-amber-300" />
            <div className="absolute right-0.5 top-3 h-px w-px bg-amber-300" />
          </div>
          <div className="absolute bottom-0 right-0.5 h-3 w-2 bg-stone-950">
            <div className="absolute left-0.5 top-1 h-px w-px bg-amber-300" />
          </div>
          {/* Red BAR sign on roof */}
          <div className="absolute bottom-3 left-3 rounded-sm bg-red-700/90 px-px font-mono text-[4px] font-bold leading-none text-red-100 shadow-[0_0_3px_rgba(239,68,68,0.9)]">
            BAR
          </div>
        </div>

        {/* Rain streaks */}
        <div className="absolute inset-0 rounded-t-[40%] opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(15deg, rgba(165,243,252,0.3) 0 1px, transparent 1px 5px)",
          }}
        />

        {/* Venetian blinds */}
        <div className="absolute inset-0 rounded-t-[40%] overflow-hidden">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 h-px bg-stone-700/90 shadow-[0_1px_0_rgba(0,0,0,0.5)]"
              style={{ top: `${12 + i * 12}%` }}
            />
          ))}
          <div className="absolute right-1 top-1 h-full w-px bg-stone-600" />
        </div>

        {/* Window frame cross */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-amber-950/80" />
      </div>

      {/* Streetlight beam from window into room (yellow noir light) */}
      <div
        className="pointer-events-none absolute left-2 top-20 h-12 w-16 bg-gradient-to-br from-amber-200/20 via-amber-100/8 to-transparent"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 30% 100%)",
          filter: "blur(1.5px)",
        }}
      />

      {/* === SIDE: Coat rack with fedora + trench coat === */}
      <div className="absolute right-1 top-1 flex flex-col items-center">
        <div className="h-1.5 w-4 rounded-full border border-stone-700 bg-stone-800" />
        <div className="h-2 w-3 -mt-px bg-stone-800" />
        <div className="h-px w-3 bg-stone-600" />
        <div className="relative mt-px h-9 w-4 bg-amber-800/95 shadow-md">
          <div className="absolute inset-x-px top-0 h-px bg-amber-700" />
          <div className="absolute left-0 right-0 top-4 h-px bg-amber-950" />
          <div className="absolute left-px top-1 h-3 w-px bg-amber-900" />
          <div className="absolute right-px top-1 h-3 w-px bg-amber-900" />
        </div>
        <div className="absolute -bottom-2 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-600" />
      </div>

      {/* === BOTTOM: Desk packed with noir props === */}
      <div className="absolute right-2 bottom-2 h-2 w-24 rounded-sm border border-amber-950 bg-gradient-to-b from-amber-900 to-amber-950 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(180,120,60,0.1)]" />
      <div className="absolute right-3 bottom-0 h-2 w-0.5 bg-amber-950" />
      <div className="absolute right-24 bottom-0 h-2 w-0.5 bg-amber-950" />

      {/* Banker's lamp */}
      <div className="absolute right-3 bottom-4 h-3 w-3">
        <div className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-600" />
        <div className="absolute top-0 left-0 h-1.5 w-3 rounded-t-full bg-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <div
          className="absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 bg-gradient-to-b from-emerald-200/50 to-transparent"
          style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }}
        />
      </div>

      {/* Typewriter */}
      <div className="absolute right-7 bottom-4 h-3 w-5 rounded-sm border border-stone-800 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]">
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-stone-600" />
        <div className="absolute -top-2.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 bg-stone-100">
          <div className="m-px h-px w-1.5 bg-stone-700" />
          <div className="m-px mt-px h-px w-1 bg-stone-700" />
        </div>
        <div className="absolute inset-x-0.5 top-1 flex flex-col gap-px">
          <div className="flex justify-around">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-px w-px rounded-full bg-stone-300" />
            ))}
          </div>
          <div className="flex justify-around">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-px w-px rounded-full bg-stone-300" />
            ))}
          </div>
        </div>
      </div>

      {/* Magnifier */}
      <div className="absolute right-[3.25rem] bottom-3 text-[14px] leading-none">🔍</div>

      {/* Case files stack */}
      <div className="absolute right-[4.5rem] bottom-3.5 h-1 w-3 bg-amber-100/90" />
      <div className="absolute right-[4.5rem] bottom-[1.05rem] h-px w-3 bg-stone-300" />
      <div className="absolute right-[4.5rem] bottom-[1.2rem] h-1 w-3 bg-amber-200/90" />

      {/* Rotary phone */}
      <div className="absolute right-[5.25rem] bottom-3.5 h-2 w-2.5">
        <div className="absolute bottom-0 left-0 h-1 w-2.5 rounded-sm bg-stone-900" />
        <div className="absolute top-0 left-0 right-0 h-1 rounded-full bg-stone-800" />
        <div className="absolute bottom-0.5 left-1 h-px w-px rounded-full bg-stone-600" />
      </div>

      {/* Ashtray with cigarette */}
      <div className="absolute right-1.5 bottom-3.5">
        <div className="h-1 w-2 rounded-full bg-stone-700" />
        <div className="absolute -top-px left-0 h-px w-2.5 bg-stone-200" />
        <div className="absolute -top-px left-2.5 h-px w-px rounded-full bg-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.9)]" />
        <div className="absolute -top-4 left-1.5 h-4 w-px bg-gradient-to-t from-stone-400/60 to-transparent blur-[0.5px]" />
      </div>

      {/* "OPEN" red stamp on right side */}
      <div className="absolute right-[5.5rem] bottom-9 -rotate-12 rounded-sm border-2 border-red-500/90 bg-red-950/30 px-1 py-0.5 font-mono text-[7px] font-bold uppercase leading-none tracking-[0.15em] text-red-400 shadow-[0_0_4px_rgba(239,68,68,0.4)]">
        CASE OPEN
      </div>
    </>
  );
}

/* =================================================================== */
/* JARVIS — arc-reactor command center                                  */
/* HERO: massive holographic Earth + AI CORE banner                     */
/* =================================================================== */
function JarvisFurniture() {
  return (
    <>
      {/* === HERO: Giant holographic Earth viewport === */}
      <div className="absolute left-1/2 top-1 h-[5.5rem] w-32 -translate-x-1/2">
        {/* Holographic frame brackets (corner markers) */}
        <div className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-cyan-400/80 shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
        <div className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-cyan-400/80 shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
        <div className="absolute -left-1 -bottom-1 h-3 w-3 border-l-2 border-b-2 border-cyan-400/80 shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
        <div className="absolute -right-1 -bottom-1 h-3 w-3 border-r-2 border-b-2 border-cyan-400/80 shadow-[0_0_4px_rgba(6,182,212,0.6)]" />

        {/* Holographic Earth in center */}
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2">
          {/* Planet sphere */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-700 via-blue-900 to-stone-950 shadow-[inset_-3px_-3px_8px_rgba(0,0,0,0.7),0_0_16px_rgba(6,182,212,0.6)]">
            {/* Continent shapes */}
            <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full opacity-90">
              <ellipse cx="32" cy="32" rx="30" ry="30" fill="none" stroke="rgba(34,211,238,0.4)" strokeWidth="0.5" />
              {/* Continents (rough shapes) */}
              <path d="M 18 22 Q 22 20 26 24 Q 28 30 22 32 Q 16 30 18 22 Z" fill="rgba(16,185,129,0.6)" />
              <path d="M 35 18 Q 42 16 46 22 Q 48 28 42 30 Q 36 28 35 18 Z" fill="rgba(16,185,129,0.6)" />
              <path d="M 25 38 Q 30 36 38 42 Q 36 48 30 50 Q 22 46 25 38 Z" fill="rgba(16,185,129,0.6)" />
              <path d="M 44 40 Q 50 42 50 48 Q 46 52 42 50 Q 40 44 44 40 Z" fill="rgba(16,185,129,0.6)" />
              {/* Latitude lines */}
              <ellipse cx="32" cy="32" rx="30" ry="8" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="0.3" />
              <ellipse cx="32" cy="32" rx="30" ry="20" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="0.3" />
              {/* Longitude lines */}
              <ellipse cx="32" cy="32" rx="8" ry="30" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="0.3" />
              <ellipse cx="32" cy="32" rx="20" ry="30" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="0.3" />
            </svg>
          </div>
          {/* Orbiting rings */}
          <div className="absolute inset-0 rounded-full border border-cyan-400/40 shadow-[0_0_4px_rgba(6,182,212,0.3)]"
            style={{ transform: "scale(1.2) rotateX(60deg)" }}
          />
          <div className="absolute inset-0 rounded-full border border-cyan-300/40"
            style={{ transform: "scale(1.4) rotateX(60deg) rotateZ(30deg)" }}
          />
          {/* Satellite */}
          <div className="absolute right-0 top-1/2 h-1 w-1 rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.9)]"
            style={{ transform: "translateX(8px)" }}
          />
        </div>

        {/* Telemetry text — top */}
        <div className="absolute left-0 top-0 font-mono text-[5px] leading-none text-cyan-400/80">
          LAT: 45.81°N
        </div>
        <div className="absolute right-0 top-0 font-mono text-[5px] leading-none text-cyan-400/80">
          LON: 15.97°E
        </div>
        {/* Stats — bottom */}
        <div className="absolute left-0 bottom-0 font-mono text-[5px] leading-none text-emerald-400/90">
          PING: 12ms
        </div>
        <div className="absolute right-0 bottom-0 font-mono text-[5px] leading-none text-emerald-400/90">
          UPTIME: 247d
        </div>
      </div>

      {/* === BIG GLOWING SIGN: AI CORE ONLINE === */}
      <div className="absolute left-1/2 top-[5.8rem] -translate-x-1/2 flex items-center gap-1 rounded-sm border border-cyan-400/60 bg-cyan-950/80 px-2 py-px shadow-[0_0_6px_rgba(6,182,212,0.6),inset_0_0_3px_rgba(34,211,238,0.4)]">
        <div className="h-1 w-1 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_3px_rgba(125,211,252,1)]" />
        <span className="font-mono text-[7px] font-bold uppercase leading-none tracking-[0.2em] text-cyan-200">
          AI CORE · ONLINE
        </span>
      </div>

      {/* === SIDE: 6-monitor wall (left side, smaller) === */}
      <div className="absolute left-1 top-1 grid grid-cols-2 gap-0.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-3 w-4 rounded-sm border border-yellow-900/80 bg-yellow-950/90 shadow-[inset_0_0_3px_rgba(250,204,21,0.5)]"
          >
            {i === 0 && (
              <>
                <div className="m-px h-px w-2 bg-yellow-400/80" />
                <div className="m-px h-px w-3 bg-yellow-400/60" />
              </>
            )}
            {i === 1 && (
              <div className="flex h-full items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full border border-cyan-300/80" />
              </div>
            )}
            {i === 2 && (
              <div className="m-px flex h-2 items-end gap-px">
                <div className="h-1 w-px bg-emerald-400" />
                <div className="h-2 w-px bg-emerald-400" />
                <div className="h-1.5 w-px bg-emerald-400" />
              </div>
            )}
            {i === 3 && (
              <div className="m-px h-px w-3 bg-red-400/80" />
            )}
            {i === 4 && (
              <div className="m-px h-px w-2 bg-cyan-400/80" />
            )}
            {i === 5 && (
              <>
                <div className="m-px h-px w-2 bg-emerald-400/80" />
                <div className="m-px h-px w-3 bg-emerald-400/60" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* === SIDE: Server rack (right) === */}
      <div className="absolute right-1 top-1 h-12 w-7 border border-stone-800 bg-gradient-to-b from-stone-800 to-stone-950 shadow-[inset_0_0_3px_rgba(0,0,0,0.6)]">
        <div className="m-1 h-px bg-stone-700" />
        <div className="absolute left-1 top-3 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
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
        <div className="absolute right-1 top-3 flex flex-col gap-px">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
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
      </div>

      {/* === BOTTOM: Holo console with controls === */}
      <div className="absolute bottom-2.5 left-1/2 h-3 w-20 -translate-x-1/2 rounded border border-stone-700 bg-gradient-to-b from-stone-800 to-stone-950 shadow-[inset_0_0_3px_rgba(6,182,212,0.4)]">
        {/* Buttons */}
        <div className="absolute left-1 top-0.5 flex gap-1">
          <div className="h-1 w-1 rounded-full bg-red-500 shadow-[0_0_2px_rgba(239,68,68,0.7)]" />
          <div className="h-1 w-1 rounded-full bg-yellow-400 shadow-[0_0_2px_rgba(250,204,21,0.7)]" />
          <div className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.7)]" />
        </div>
        {/* Sliders */}
        <div className="absolute right-2 top-0.5 flex gap-px">
          <div className="h-2 w-px bg-cyan-400/70" />
          <div className="h-2 w-px bg-cyan-400/40" />
          <div className="h-2 w-px bg-cyan-400/70" />
          <div className="h-2 w-px bg-cyan-400/40" />
          <div className="h-2 w-px bg-cyan-400/70" />
        </div>
      </div>

      {/* Cooling pipes (sides of console) */}
      <div className="absolute bottom-2.5 left-3 h-3 w-px bg-cyan-500/60 shadow-[0_0_2px_rgba(6,182,212,0.5)]" />
      <div className="absolute bottom-2.5 right-3 h-3 w-px bg-cyan-500/60 shadow-[0_0_2px_rgba(6,182,212,0.5)]" />
    </>
  );
}

/* =================================================================== */
/* NOVA — mad-scientist research lab                                    */
/* HERO: huge specimen tank + biohazard frame                           */
/* =================================================================== */
function NovaFurniture() {
  return (
    <>
      {/* === HERO: Massive specimen observation tank === */}
      <div className="absolute left-1/2 top-1 h-24 w-28 -translate-x-1/2">
        {/* Yellow biohazard warning stripes around frame */}
        <div className="absolute -inset-1 rounded-sm bg-gradient-to-br from-yellow-400/20 to-stone-900"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(250,204,21,0.6) 0 3px, rgba(0,0,0,0.6) 3px 6px)",
          }}
        />
        {/* Glass tank */}
        <div className="absolute inset-0 rounded border-2 border-cyan-700/80 bg-gradient-to-b from-cyan-900/30 via-cyan-950/50 to-emerald-950/60 shadow-[inset_0_0_8px_rgba(6,182,212,0.4),0_0_8px_rgba(6,182,212,0.2)]">
          {/* Glass reflection sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded" />

          {/* Bubbles rising */}
          <div className="absolute bottom-3 left-3 h-1 w-1 rounded-full bg-cyan-200/80" />
          <div className="absolute bottom-6 left-5 h-px w-px rounded-full bg-cyan-100/80" />
          <div className="absolute bottom-4 right-4 h-1 w-1 rounded-full bg-cyan-200/80" />
          <div className="absolute bottom-8 left-1/2 h-px w-px rounded-full bg-cyan-100/80" />
          <div className="absolute bottom-12 right-3 h-px w-px rounded-full bg-cyan-100/80" />
          <div className="absolute bottom-10 left-3 h-px w-px rounded-full bg-cyan-100/80" />

          {/* Floating atomic structure / specimen in center */}
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2">
            {/* Nucleus */}
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-300 to-emerald-500 shadow-[0_0_8px_rgba(34,211,238,0.9),inset_-1px_-1px_2px_rgba(0,0,0,0.4)]" />
            {/* Electron orbits */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/60"
              style={{ transform: "rotateX(70deg)" }}
            />
            <div className="absolute inset-0 rounded-full border border-cyan-400/60"
              style={{ transform: "rotateX(70deg) rotateZ(60deg)" }}
            />
            <div className="absolute inset-0 rounded-full border border-cyan-400/60"
              style={{ transform: "rotateX(70deg) rotateZ(120deg)" }}
            />
            {/* Electrons */}
            <div className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.9)]" />
            <div className="absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-pink-400 shadow-[0_0_4px_rgba(244,114,182,0.9)]" />
            <div className="absolute left-1/2 bottom-0 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_4px_rgba(110,231,183,0.9)]" />
          </div>

          {/* Scanline */}
          <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-cyan-300/60 shadow-[0_0_4px_rgba(6,182,212,0.7)]" />
        </div>

        {/* Top warning label */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded border border-yellow-500/80 bg-yellow-950 px-1.5 font-mono text-[6px] font-bold uppercase leading-none tracking-wider text-yellow-300 shadow-[0_0_4px_rgba(250,204,21,0.5)]">
          ⚠ BIOHAZARD · LV-4
        </div>

        {/* Sample data readouts */}
        <div className="absolute -bottom-1 left-1 font-mono text-[5px] leading-none text-cyan-300/80">
          pH 7.2
        </div>
        <div className="absolute -bottom-1 right-1 font-mono text-[5px] leading-none text-emerald-300/80">
          T: 36.6°C
        </div>
      </div>

      {/* === SIDE: Periodic table — left === */}
      <div className="absolute left-1 top-1 h-12 w-7 border border-cyan-700/70 bg-cyan-950/80 shadow-[inset_0_0_3px_rgba(6,182,212,0.3)]">
        <div className="border-b border-cyan-800 px-px py-px font-mono text-[4px] font-bold leading-none text-cyan-300">
          PT
        </div>
        <div className="grid grid-cols-3 gap-px p-px">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={
                "aspect-square " +
                (i % 4 === 0 ? "bg-cyan-400/70" : i % 3 === 0 ? "bg-cyan-300/50" : "bg-cyan-600/30")
              }
            />
          ))}
        </div>
      </div>

      {/* === SIDE: DNA helix on right wall === */}
      <div className="absolute right-1 top-1 h-12 w-3">
        <svg viewBox="0 0 12 48" className="h-full w-full" aria-hidden>
          <path d="M 2 0 Q 10 6 2 12 Q -6 18 2 24 Q 10 30 2 36 Q -6 42 2 48"
            stroke="rgb(34 211 238)" strokeWidth="0.6" fill="none" />
          <path d="M 10 0 Q 2 6 10 12 Q 18 18 10 24 Q 2 30 10 36 Q 18 42 10 48"
            stroke="rgb(125 211 252)" strokeWidth="0.6" fill="none" />
          {[6, 14, 22, 30, 38, 46].map((y) => (
            <line key={y} x1={3} x2={9} y1={y} y2={y}
              stroke="rgb(34 211 238)" strokeWidth="0.4" />
          ))}
        </svg>
      </div>

      {/* === BOTTOM: Lab counter packed with experiments === */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-cyan-900/70 bg-gradient-to-b from-cyan-950/80 to-stone-950" />

      {/* Bunsen burner */}
      <div className="absolute bottom-2.5 left-2 h-4 w-2">
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-sm bg-stone-700" />
        <div className="absolute bottom-1 left-1/2 h-2 w-px -translate-x-1/2 bg-stone-500" />
        <div className="absolute bottom-3 left-1/2 h-2.5 w-1.5 -translate-x-1/2 rounded-t-full bg-gradient-to-t from-blue-500 via-cyan-300 to-yellow-200 shadow-[0_0_5px_rgba(6,182,212,0.8),0_0_10px_rgba(34,211,238,0.5)] blur-[0.3px]" />
      </div>

      {/* Erlenmeyer with bubbling purple */}
      <div className="absolute bottom-2.5 left-5 h-5 w-3">
        <div className="absolute bottom-0 left-0 right-0 h-3"
          style={{
            background: "linear-gradient(to bottom, transparent 0, transparent 25%, rgba(168,85,247,0.8) 25%, rgba(192,132,252,0.85) 100%)",
            clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
            border: "1px solid rgba(168,85,247,0.7)",
            borderTop: "none",
          }}
        />
        <div className="absolute bottom-3 left-1/2 h-2 w-1 -translate-x-1/2 rounded-t border border-stone-300/60 bg-purple-200/20" />
        <div className="absolute -top-2 left-1/2 h-2 w-px -translate-x-1/2 bg-gradient-to-t from-purple-200/50 to-transparent blur-[0.5px]" />
      </div>

      {/* Test-tube rack */}
      <div className="absolute bottom-2.5 left-1/2 h-4 w-7 -translate-x-[60%]">
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded bg-amber-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute bottom-0.5 h-3 w-1 border border-stone-300/60 rounded-b"
            style={{
              left: `${i * 25 - 5}%`,
              backgroundImage:
                i === 0
                  ? "linear-gradient(to top, rgba(34,197,94,0.8), transparent 60%)"
                  : i === 1
                  ? "linear-gradient(to top, rgba(168,85,247,0.8), transparent 60%)"
                  : i === 2
                  ? "linear-gradient(to top, rgba(244,63,94,0.8), transparent 60%)"
                  : i === 3
                  ? "linear-gradient(to top, rgba(250,204,21,0.8), transparent 60%)"
                  : "linear-gradient(to top, rgba(6,182,212,0.8), transparent 60%)",
            }}
          />
        ))}
      </div>

      {/* Microscope */}
      <div className="absolute bottom-2.5 right-9 h-7 w-4">
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded bg-stone-700" />
        <div className="absolute bottom-1 left-1/2 h-5 w-px -translate-x-1/2 bg-stone-600" />
        <div className="absolute top-0 left-1/2 h-2 w-1.5 -translate-x-1/2 rounded-t bg-stone-700" />
        <div className="absolute top-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-cyan-500/80 bg-stone-900 shadow-[0_0_3px_rgba(6,182,212,0.6)]" />
      </div>

      {/* Centrifuge */}
      <div className="absolute bottom-2.5 right-3 h-5 w-5">
        <div className="absolute bottom-0 left-0 right-0 h-3 rounded border border-stone-700 bg-stone-900">
          <div className="absolute right-1 top-1 h-px w-px rounded-full bg-emerald-400 shadow-[0_0_2px_rgba(16,185,129,0.9)]" />
        </div>
        <div className="absolute top-1 left-0 right-0 h-2 rounded-t border border-stone-700 bg-stone-800">
          <div className="absolute inset-1 rounded-full border border-stone-600">
            <div className="absolute left-1/2 top-1/2 h-px w-3 origin-left -translate-x-1/2 -translate-y-1/2 rotate-45 bg-stone-500" />
            <div className="absolute left-1/2 top-1/2 h-px w-3 origin-left -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-stone-500" />
          </div>
        </div>
      </div>
    </>
  );
}

/* =================================================================== */
/* COMMS — global operator hub · SPLIT SCREEN                           */
/* LEFT half: PHONE BULLPEN — Wall Street chaos (amber/red, 4 callers)  */
/* RIGHT half: STRATEGY DESK — laptop strategists (cool cyan, 4 typers) */
/* =================================================================== */
function CommsFurniture() {
  return (
    <>
      {/* === Glass partition (center divider) === */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-stone-500/60 via-stone-400/40 to-stone-500/60 shadow-[0_0_4px_rgba(255,255,255,0.2)]" />
      {/* Glass panel highlight */}
      <div className="absolute left-1/2 top-2 bottom-9 w-1 -translate-x-1/2 rounded bg-gradient-to-b from-white/15 via-white/5 to-white/15" />

      {/* Center divider sign */}
      <div className="absolute left-1/2 top-1 -translate-x-1/2 z-30 rounded-sm border border-stone-500 bg-stone-950 px-1 font-mono text-[5px] font-bold uppercase leading-none tracking-[0.2em] text-stone-300 shadow-md">
        ◆ COMMS HUB ◆
      </div>

      {/* ╔══════════════════════════════════════════════════════════ */}
      {/* ║ LEFT HALF: PHONE BULLPEN — chaos energy                    */}
      {/* ╚══════════════════════════════════════════════════════════ */}
      <div className="absolute left-0 top-0 bottom-0 w-1/2">
        {/* Warm amber tint background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/25 via-amber-950/10 to-stone-950" />

        {/* Section label — top left */}
        <div className="absolute left-1 top-3 flex items-center gap-1 rounded-sm border border-amber-500/60 bg-amber-950/80 px-1 py-px shadow-[0_0_4px_rgba(245,158,11,0.4)]">
          <div className="h-1 w-1 animate-pulse rounded-full bg-amber-300 shadow-[0_0_3px_rgba(252,211,77,1)]" />
          <span className="font-mono text-[5px] font-bold uppercase leading-none tracking-[0.15em] text-amber-200">
            BULLPEN · CALLS
          </span>
        </div>

        {/* Stock ticker scroll — top */}
        <div className="absolute left-0 right-0 top-7 h-2 overflow-hidden border-y border-amber-700/40 bg-stone-950/80">
          <div className="font-mono text-[5px] leading-none text-amber-300 whitespace-nowrap pl-1">
            ▲ APX +3.2 · SPHR -1.8 · ORTO +5.4 · DENT +0.9 · IMPL ▲ · CALL HOLD-3 ◂
          </div>
        </div>

        {/* Phone-cord wall hub (where all cords go up to) */}
        <div className="absolute left-1/2 top-9 h-2 w-3 -translate-x-1/2 rounded border border-stone-600 bg-stone-800 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]">
          <div className="absolute left-0.5 top-0.5 h-px w-px rounded-full bg-red-400" />
          <div className="absolute right-0.5 top-0.5 h-px w-px rounded-full bg-amber-400" />
        </div>
        {/* Cords radiating out */}
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-9 h-12 w-full opacity-60">
          <path d="M 50 4 Q 35 20 18 36" stroke="rgb(28 25 23)" strokeWidth="0.6" fill="none" strokeDasharray="0.7 0.5" />
          <path d="M 50 4 Q 60 22 75 38" stroke="rgb(28 25 23)" strokeWidth="0.6" fill="none" strokeDasharray="0.7 0.5" />
          <path d="M 50 4 Q 30 28 8 42" stroke="rgb(28 25 23)" strokeWidth="0.6" fill="none" strokeDasharray="0.7 0.5" />
          <path d="M 50 4 Q 70 26 92 40" stroke="rgb(28 25 23)" strokeWidth="0.6" fill="none" strokeDasharray="0.7 0.5" />
        </svg>

        {/* === 4 PHONE CALLERS in 2 rows === */}
        {/* Back row */}
        <PhoneStation left={4} bottom={48} suit="fill-amber-500" arm="right" />
        <PhoneStation left={50} bottom={48} suit="fill-red-500" arm="left" />
        {/* Front row */}
        <PhoneStation left={20} bottom={12} suit="fill-amber-400" arm="right" />
        <PhoneStation left={68} bottom={12} suit="fill-red-400" arm="left" />

        {/* Scattered ambient: coffee cup */}
        <div className="absolute bottom-3 left-1 h-1.5 w-1 rounded-b border border-stone-400 bg-amber-100" />
        <div className="absolute bottom-4.5 left-[0.35rem] h-1 w-px bg-gradient-to-t from-stone-300/50 to-transparent blur-[0.5px]" />
        {/* Scattered loose papers */}
        <div className="absolute bottom-3 right-2 h-1 w-1.5 -rotate-12 bg-amber-100/80" />
        <div className="absolute bottom-3.5 right-3 h-1 w-1.5 rotate-6 bg-stone-200/70" />
      </div>

      {/* ╔══════════════════════════════════════════════════════════ */}
      {/* ║ RIGHT HALF: STRATEGY DESK — focused calm                   */}
      {/* ╚══════════════════════════════════════════════════════════ */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2">
        {/* Cool cyan/violet tint background */}
        <div className="absolute inset-0 bg-gradient-to-bl from-cyan-900/25 via-violet-950/10 to-stone-950" />

        {/* Section label — top right */}
        <div className="absolute right-1 top-3 flex items-center gap-1 rounded-sm border border-cyan-500/60 bg-cyan-950/80 px-1 py-px shadow-[0_0_4px_rgba(6,182,212,0.4)]">
          <div className="h-1 w-1 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_3px_rgba(125,211,252,1)]" />
          <span className="font-mono text-[5px] font-bold uppercase leading-none tracking-[0.15em] text-cyan-200">
            STRATEGY · DATA
          </span>
        </div>

        {/* Wall-mounted dashboard with charts — top */}
        <div className="absolute left-2 top-9 right-2 h-7 border border-cyan-700/70 bg-cyan-950/60 shadow-[inset_0_0_3px_rgba(6,182,212,0.4)]">
          {/* Header strip */}
          <div className="border-b border-cyan-800/80 bg-cyan-900/60 px-px py-px font-mono text-[4px] font-bold leading-none tracking-wider text-cyan-300">
            ▼ ANALYTICS
          </div>
          {/* Mini charts row */}
          <div className="flex h-5 items-end gap-1 px-1 py-px">
            {/* Bar chart */}
            <div className="flex h-full items-end gap-px">
              <div className="h-2 w-px bg-cyan-400" />
              <div className="h-3 w-px bg-cyan-400" />
              <div className="h-1.5 w-px bg-cyan-400" />
              <div className="h-4 w-px bg-cyan-400" />
              <div className="h-2.5 w-px bg-emerald-400" />
            </div>
            {/* Line chart */}
            <svg viewBox="0 0 24 12" className="h-full w-6">
              <polyline
                points="0,8 4,6 8,9 12,4 16,6 20,2 24,4"
                fill="none"
                stroke="rgb(110 231 183)"
                strokeWidth="0.8"
              />
            </svg>
            {/* Pie chart */}
            <div className="h-3 w-3 rounded-full"
              style={{
                background:
                  "conic-gradient(rgb(34 211 238) 0deg 130deg, rgb(167 139 250) 130deg 230deg, rgb(110 231 183) 230deg 360deg)",
              }}
            />
            {/* Number readout */}
            <div className="ml-auto font-mono text-[5px] font-bold leading-none text-emerald-300">
              +24%
            </div>
          </div>
        </div>

        {/* === 4 LAPTOP STRATEGISTS in 2 rows === */}
        {/* Back row (slightly smaller / further) */}
        <LaptopStation left={4} bottom={48} suit="fill-cyan-400" screenColor="cyan" />
        <LaptopStation left={50} bottom={48} suit="fill-violet-400" screenColor="violet" />
        {/* Front row */}
        <LaptopStation left={18} bottom={12} suit="fill-cyan-500" screenColor="emerald" withMug />
        <LaptopStation left={64} bottom={12} suit="fill-violet-500" screenColor="cyan" withMug />

        {/* Floor accent — cool */}
        <div className="absolute inset-x-2 bottom-2 h-px bg-cyan-400/30" />
      </div>

      {/* === Floor strip across whole room === */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-stone-700/70 bg-gradient-to-b from-stone-800 to-stone-950" />
    </>
  );
}

/* =================================================================== */
/* TREASURY — Scrooge bank vault                                        */
/* HERO: massive vault door + €30K GOAL banner                          */
/* =================================================================== */
function TreasuryFurniture() {
  return (
    <>
      {/* === HERO: Massive vault door (left) === */}
      <div className="absolute left-2 top-1 h-24 w-24 rounded border-2 border-emerald-700/90 bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 shadow-[inset_0_0_12px_rgba(0,0,0,0.7),0_0_12px_rgba(16,185,129,0.25)]">
        {/* Outer dial ring */}
        <div className="absolute inset-1 rounded-full border-2 border-emerald-600/80 bg-stone-950/40 shadow-[inset_0_0_8px_rgba(0,0,0,0.7)]">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-px w-2.5 origin-left bg-emerald-500/60"
              style={{ transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateX(9px)` }}
            />
          ))}
          <div className="absolute left-1/2 top-0.5 -translate-x-1/2 font-mono text-[6px] font-bold leading-none text-emerald-400/90">
            12
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 font-mono text-[6px] font-bold leading-none text-emerald-400/90">
            3
          </div>
          <div className="absolute left-1/2 bottom-0.5 -translate-x-1/2 font-mono text-[6px] font-bold leading-none text-emerald-400/90">
            6
          </div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 font-mono text-[6px] font-bold leading-none text-emerald-400/90">
            9
          </div>
          {/* Center hub */}
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300 bg-emerald-700 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          {/* Spokes */}
          {[0, 60, 120].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-0.5 w-9 origin-center bg-emerald-300/95 shadow-[0_0_3px_rgba(110,231,183,0.6)]"
              style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
            />
          ))}
          {[0, 60, 120].map((deg) => (
            <div
              key={`k-${deg}`}
              className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_4px_rgba(110,231,183,0.9)]"
              style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(15px)` }}
            />
          ))}
        </div>
        {/* Hinge bolts */}
        <div className="absolute left-0.5 top-2 h-1.5 w-1.5 rounded-full bg-emerald-700 shadow-inner" />
        <div className="absolute left-0.5 top-1/2 h-1.5 w-1.5 rounded-full bg-emerald-700 shadow-inner" />
        <div className="absolute left-0.5 bottom-2 h-1.5 w-1.5 rounded-full bg-emerald-700 shadow-inner" />
        {/* "VAULT" plate */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded border border-emerald-600 bg-emerald-900 px-1.5 font-mono text-[6px] font-bold leading-none tracking-[0.2em] text-emerald-200 shadow-md">
          VAULT
        </div>
        {/* OPEN LED */}
        <div className="absolute right-1 top-1 flex items-center gap-px">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,1)]" />
          <span className="font-mono text-[5px] font-bold uppercase leading-none text-emerald-300">
            OPEN
          </span>
        </div>
      </div>

      {/* === HERO COMPANION: HUGE €30K GOAL banner (right) === */}
      <div className="absolute right-2 top-1 h-24 w-24 rounded-sm border-2 border-yellow-500/80 bg-gradient-to-b from-yellow-950 via-stone-950 to-emerald-950 shadow-[inset_0_0_8px_rgba(250,204,21,0.3),0_0_10px_rgba(250,204,21,0.25)]">
        {/* Header */}
        <div className="absolute inset-x-0 top-0 border-b border-yellow-700/80 bg-yellow-900/80 py-px text-center font-mono text-[6px] font-bold uppercase leading-none tracking-[0.2em] text-yellow-200">
          ◆ MRR GOAL ◆
        </div>
        {/* GIANT € symbol */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[36px] font-bold leading-none text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.6)] drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]">
          €
        </div>
        {/* Target */}
        <div className="absolute inset-x-0 bottom-3 text-center font-mono text-[8px] font-bold leading-none tracking-wider text-yellow-100">
          30K
        </div>
        {/* Progress bar */}
        <div className="absolute inset-x-1 bottom-1 h-1 rounded-full border border-yellow-700/60 bg-stone-950">
          <div className="h-full w-[2%] rounded-full bg-gradient-to-r from-yellow-400 to-emerald-400 shadow-[0_0_3px_rgba(250,204,21,0.7)]" />
        </div>
        {/* Falling money particles */}
        <div className="absolute left-2 top-3 font-mono text-[5px] leading-none text-emerald-300/70">$</div>
        <div className="absolute right-2 top-5 font-mono text-[5px] leading-none text-emerald-300/70">€</div>
        <div className="absolute left-3 top-7 font-mono text-[5px] leading-none text-emerald-300/70">$</div>
        <div className="absolute right-3 top-9 font-mono text-[5px] leading-none text-emerald-300/70">€</div>
      </div>

      {/* === BOTTOM: Pile of gold + cash bricks === */}
      <div className="absolute bottom-2.5 left-1/2 h-8 w-14 -translate-x-1/2">
        <svg viewBox="0 0 56 32" className="absolute inset-0 h-full w-full">
          {[
            [4, 26, 3], [10, 26, 3], [16, 26, 3], [22, 26, 3], [28, 26, 3],
            [34, 26, 3], [40, 26, 3], [46, 26, 3], [52, 26, 3],
            [7, 21, 3], [13, 21, 3], [19, 21, 3], [25, 21, 3], [31, 21, 3],
            [37, 21, 3], [43, 21, 3], [49, 21, 3],
            [10, 16, 3], [16, 16, 3], [22, 16, 3], [28, 16, 3], [34, 16, 3],
            [40, 16, 3], [46, 16, 3],
            [13, 11, 3], [19, 11, 3], [25, 11, 3], [31, 11, 3], [37, 11, 3], [43, 11, 3],
            [16, 6, 3], [22, 6, 3], [28, 6, 3], [34, 6, 3], [40, 6, 3],
            [22, 1, 3], [28, 1, 3], [34, 1, 3],
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
        <div className="absolute top-0 left-3 h-px w-px bg-yellow-100 shadow-[0_0_4px_rgba(254,240,138,1)]" />
        <div className="absolute top-2 right-3 h-px w-px bg-yellow-100 shadow-[0_0_4px_rgba(254,240,138,1)]" />
      </div>

      {/* Cash brick stack */}
      <div className="absolute bottom-2.5 right-3 flex items-end gap-px">
        <div className="flex flex-col gap-px">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 w-3 border border-emerald-700/80 bg-emerald-800" />
          ))}
        </div>
        <div className="ml-1 flex flex-col gap-px">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 w-3 border border-yellow-700 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 shadow-[0_0_2px_rgba(250,204,21,0.7)]" />
          ))}
        </div>
      </div>

      {/* Counter strip */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-emerald-900/70 bg-gradient-to-b from-emerald-950/80 to-stone-950" />
    </>
  );
}

/* =================================================================== */
/* STEWARD — boutique reception                                         */
/* HERO: cursive neon "Welcome" sign + panoramic city window            */
/* =================================================================== */
function StewardFurniture() {
  return (
    <>
      {/* === HERO: Big panoramic city window === */}
      <div className="absolute left-1/2 top-1 h-14 w-32 -translate-x-1/2 rounded-sm border-2 border-amber-700/80 bg-gradient-to-b from-blue-300/40 via-amber-200/15 to-amber-300/20 shadow-[inset_0_0_6px_rgba(0,0,0,0.4),0_2px_3px_rgba(0,0,0,0.3)]">
        {/* Daylight gradient (warm afternoon) */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-200/30 via-amber-100/15 to-amber-300/20 rounded-sm" />

        {/* Sun */}
        <div className="absolute right-3 top-1 h-3 w-3 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(254,240,138,0.9)]" />

        {/* Cityscape silhouettes */}
        <div className="absolute bottom-0 left-0 right-0 h-7">
          {/* buildings */}
          <div className="absolute bottom-0 left-1 h-4 w-4 bg-stone-700/80" />
          <div className="absolute bottom-0 left-6 h-5 w-3 bg-stone-700/80" />
          <div className="absolute bottom-0 left-10 h-6 w-4 bg-stone-700/80" />
          <div className="absolute bottom-0 left-[3.75rem] h-3 w-3 bg-stone-700/80" />
          <div className="absolute bottom-0 left-20 h-5 w-5 bg-stone-700/80" />
          <div className="absolute bottom-0 left-[6.5rem] h-7 w-4 bg-stone-700/80" />
          <div className="absolute bottom-0 right-1 h-4 w-3 bg-stone-700/80" />
          {/* Tiny office windows */}
          <div className="absolute bottom-1 left-2 h-px w-px bg-amber-300/80" />
          <div className="absolute bottom-3 left-3 h-px w-px bg-amber-300/80" />
          <div className="absolute bottom-1 left-7 h-px w-px bg-amber-300/80" />
          <div className="absolute bottom-2 left-8 h-px w-px bg-amber-300/80" />
          <div className="absolute bottom-1 left-11 h-px w-px bg-amber-300/80" />
          <div className="absolute bottom-3 left-12 h-px w-px bg-amber-300/80" />
        </div>

        {/* Window frame cross */}
        <div className="absolute left-1/3 top-0 h-full w-px bg-amber-800/70" />
        <div className="absolute left-2/3 top-0 h-full w-px bg-amber-800/70" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-amber-800/70" />

        {/* Window sill */}
        <div className="absolute -bottom-1 -inset-x-2 h-1 bg-amber-800 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
      </div>

      {/* === HERO: Glowing "Welcome" cursive neon === */}
      <div className="absolute left-1/2 top-[3.85rem] -translate-x-1/2 rounded border-2 border-emerald-400/80 bg-emerald-950/40 px-2 py-0.5 shadow-[0_0_10px_rgba(16,185,129,0.7),inset_0_0_4px_rgba(110,231,183,0.5)]">
        <span
          className="font-serif text-[12px] font-bold italic leading-none text-emerald-200"
          style={{
            textShadow:
              "0 0 4px rgba(110,231,183,0.9), 0 0 8px rgba(16,185,129,0.7)",
          }}
        >
          Welcome
        </span>
      </div>

      {/* === Subtitle: CLIENT HQ === */}
      <div className="absolute left-1/2 top-[5.4rem] -translate-x-1/2 font-mono text-[6px] font-bold uppercase leading-none tracking-[0.4em] text-emerald-300/90">
        ◇ CLIENT HQ ◇
      </div>

      {/* === SIDE: Crystal chandelier === */}
      <div className="absolute left-2 top-1 h-7 w-7">
        <div className="absolute top-0 left-1/2 h-1 w-px -translate-x-1/2 bg-stone-600" />
        <div className="absolute top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded border border-amber-600/80 bg-amber-700/40" />
        {/* Drops */}
        <div className="absolute top-2 left-1 h-3 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        <div className="absolute top-2 left-3 h-4 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        <div className="absolute top-2 right-1 h-3 w-px bg-gradient-to-b from-amber-200/80 to-transparent shadow-[0_0_2px_rgba(254,240,138,0.6)]" />
        {/* Bulbs */}
        <div className="absolute top-1 left-1 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_4px_rgba(254,240,138,1)]" />
        <div className="absolute top-1 right-1 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_4px_rgba(254,240,138,1)]" />
      </div>

      {/* === SIDE: Client roster screen (right) === */}
      <div className="absolute right-2 top-1 h-9 w-9 border border-emerald-700/80 bg-emerald-950/60 shadow-[inset_0_0_3px_rgba(16,185,129,0.3)]">
        <div className="border-b border-emerald-800 bg-emerald-900/80 px-px font-mono text-[5px] font-bold leading-none tracking-wider text-emerald-300">
          CLIENTS · 2
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

      {/* === BOTTOM: Reception desk + chesterfield + plant === */}
      <div className="absolute bottom-2.5 left-2 h-4 w-12 rounded-sm border border-emerald-700/80 bg-gradient-to-b from-emerald-950/80 to-stone-950 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5)]" />
      {/* Terminal */}
      <div className="absolute bottom-[1.7rem] left-3 h-3 w-3.5 border border-emerald-700 bg-emerald-900/80 shadow-[inset_0_0_2px_rgba(16,185,129,0.5)]">
        <div className="m-px h-px w-2 bg-emerald-400/80" />
        <div className="m-px mt-px h-px w-2.5 bg-emerald-400/60" />
      </div>
      {/* Brass lamp */}
      <div className="absolute bottom-[1.7rem] left-10 h-3 w-2">
        <div className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-amber-700" />
        <div className="absolute top-0 left-0 h-1 w-2 rounded-t-full bg-amber-600 shadow-[0_0_4px_rgba(252,211,77,0.7)]" />
        <div
          className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 bg-gradient-to-b from-amber-200/40 to-transparent"
          style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }}
        />
      </div>

      {/* Chesterfield sofa */}
      <div className="absolute bottom-2.5 right-2 h-4 w-9">
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t border border-amber-900 bg-gradient-to-b from-amber-700 to-amber-900">
          <div className="absolute left-1 top-1 h-px w-px rounded-full bg-amber-300" />
          <div className="absolute left-3 top-1 h-px w-px rounded-full bg-amber-300" />
          <div className="absolute left-5 top-1 h-px w-px rounded-full bg-amber-300" />
          <div className="absolute right-1 top-1 h-px w-px rounded-full bg-amber-300" />
        </div>
        <div className="absolute top-2 left-0 right-0 h-1 bg-amber-700" />
        <div className="absolute top-0 left-0 h-3 w-1 rounded-l border border-amber-900 bg-amber-800" />
        <div className="absolute top-0 right-0 h-3 w-1 rounded-r border border-amber-900 bg-amber-800" />
        <div className="absolute top-1 left-1.5 h-1 w-2 rounded bg-emerald-600/80" />
      </div>

      {/* Coffee table with magazines */}
      <div className="absolute bottom-2.5 right-12 h-1.5 w-4 rounded-sm border-t border-amber-700/70 bg-amber-950">
        <div className="absolute -top-px left-1 h-px w-1.5 bg-rose-300/70" />
        <div className="absolute -top-px right-1 h-px w-1 bg-cyan-300/70" />
      </div>

      {/* Tall potted plant */}
      <div className="absolute bottom-2.5 right-[5.5rem] flex flex-col items-center">
        <div className="relative h-5 w-3">
          <div className="absolute left-0 top-0 h-3 w-1 origin-bottom -rotate-12 rounded-t-full bg-green-700" />
          <div className="absolute left-1 top-0 h-4 w-1 origin-bottom rounded-t-full bg-green-600" />
          <div className="absolute left-2 top-0 h-3 w-1 origin-bottom rotate-12 rounded-t-full bg-green-700" />
        </div>
        <div className="h-2 w-3 rounded-b border-t border-amber-700 bg-gradient-to-b from-amber-800 to-amber-950" />
      </div>

      {/* Marble floor */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-emerald-700/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950">
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
/* HERO: marquee bulbs spelling ATLAS + ON AIR red light                */
/* =================================================================== */
function AtlasFurniture() {
  return (
    <>
      {/* === HERO: Big marquee with bulbs spelling "★ ATLAS ★" === */}
      <div className="absolute left-1/2 top-1 h-10 w-32 -translate-x-1/2 rounded border-2 border-amber-600 bg-gradient-to-b from-rose-950 via-stone-900 to-rose-950 shadow-[0_0_8px_rgba(244,63,94,0.4),inset_0_0_4px_rgba(0,0,0,0.5)]">
        {/* Bulbs — top row */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`top-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(254,240,138,1)]"
            style={{ top: -1, left: `${(i + 0.5) * 8}%` }}
          />
        ))}
        {/* Bulbs — bottom row */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`bot-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(254,240,138,1)]"
            style={{ bottom: -1, left: `${(i + 0.5) * 8}%` }}
          />
        ))}
        {/* Bulbs — left side */}
        {[...Array(4)].map((_, i) => (
          <div
            key={`l-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(254,240,138,1)]"
            style={{ left: -1, top: `${(i + 0.5) * 24}%` }}
          />
        ))}
        {/* Bulbs — right side */}
        {[...Array(4)].map((_, i) => (
          <div
            key={`r-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(254,240,138,1)]"
            style={{ right: -1, top: `${(i + 0.5) * 24}%` }}
          />
        ))}
        {/* Marquee text */}
        <div
          className="flex h-full items-center justify-center font-serif text-[16px] font-bold leading-none tracking-[0.2em] text-yellow-300"
          style={{
            textShadow:
              "0 0 6px rgba(254,240,138,0.9), 0 0 12px rgba(250,204,21,0.7), 0 1px 0 rgba(0,0,0,0.6)",
          }}
        >
          ★ ATLAS ★
        </div>
      </div>

      {/* === ON AIR red light === */}
      <div className="absolute right-2 top-12 flex items-center gap-1 rounded-sm border-2 border-red-500/90 bg-red-950 px-1.5 py-0.5 shadow-[0_0_8px_rgba(239,68,68,0.9),inset_0_0_3px_rgba(248,113,113,0.5)]">
        <div className="h-1 w-1 animate-pulse rounded-full bg-red-300 shadow-[0_0_3px_rgba(252,165,165,1)]" />
        <span className="font-mono text-[6px] font-bold uppercase leading-none tracking-[0.3em] text-red-100">
          ON AIR
        </span>
      </div>

      {/* === Step-and-repeat backdrop (smaller, behind) === */}
      <div className="absolute left-2 top-12 h-9 w-20 border border-rose-700/60 bg-gradient-to-br from-rose-900/30 via-stone-900 to-rose-900/30">
        <div className="grid h-full grid-cols-3 grid-rows-3 gap-px p-px">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center font-mono text-[5px] font-bold uppercase tracking-wider text-rose-200/60"
            >
              LAMON
            </div>
          ))}
        </div>
      </div>

      {/* === Movie-poster frame === */}
      <div className="absolute right-[3.25rem] top-12 h-9 w-7 border-2 border-amber-700 bg-stone-900 shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0.5 bg-gradient-to-b from-rose-700 via-rose-500 to-amber-300">
          {/* Star */}
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[8px] leading-none text-yellow-200">★</div>
          {/* Title */}
          <div className="absolute inset-x-0 bottom-1 text-center font-serif text-[5px] font-bold leading-none text-yellow-100">
            BLOCKBUSTER
          </div>
        </div>
      </div>

      {/* === Spotlights (3 cones) === */}
      {[20, 50, 80].map((x, i) => (
        <div key={i}>
          <div
            className="absolute h-1.5 w-2 rounded-b border border-stone-700 bg-stone-800"
            style={{ left: `${x}%`, top: "5.7rem", transform: "translateX(-50%)" }}
          />
          <div
            className="pointer-events-none absolute h-12 w-10 bg-gradient-to-b from-yellow-200/40 to-transparent"
            style={{
              left: `${x}%`,
              top: "6.4rem",
              transform: "translateX(-50%)",
              clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
              filter: "blur(1px)",
            }}
          />
        </div>
      ))}

      {/* === BOTTOM: Vanity mirror + camera + ring light + director chair === */}
      {/* Vanity mirror */}
      <div className="absolute bottom-2.5 left-2 h-9 w-8 border-2 border-amber-600 bg-stone-800">
        <div className="absolute inset-1 border border-amber-700/60 bg-gradient-to-b from-stone-300/30 to-stone-500/30" />
        <div className="absolute inset-1 bg-gradient-to-tr from-transparent via-white/15 to-transparent" />
        {[...Array(5)].map((_, i) => (
          <div
            key={`top-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.95)]"
            style={{ top: -1, left: `${(i + 0.5) * 18}%` }}
          />
        ))}
        {[...Array(3)].map((_, i) => (
          <div
            key={`l-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.95)]"
            style={{ left: -1, top: `${(i + 0.5) * 28}%` }}
          />
        ))}
        {[...Array(3)].map((_, i) => (
          <div
            key={`r-${i}`}
            className="absolute h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_3px_rgba(254,240,138,0.95)]"
            style={{ right: -1, top: `${(i + 0.5) * 28}%` }}
          />
        ))}
      </div>

      {/* Director chair */}
      <div className="absolute bottom-2.5 left-1/2 h-7 w-5 -translate-x-1/2">
        <div className="absolute top-0 left-0 right-0 h-3 rounded-sm border border-rose-800 bg-rose-900 shadow-md">
          <div className="m-px font-mono text-[4px] font-bold uppercase leading-none text-rose-100">
            ATLAS
          </div>
        </div>
        <div className="absolute top-3 left-0 right-0 h-2 bg-rose-900" />
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 origin-top rotate-[15deg] bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 origin-top -rotate-[15deg] bg-stone-700" />
      </div>

      {/* Ring light */}
      <div className="absolute bottom-2.5 right-12 h-9 w-7">
        <div className="absolute top-0 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-[2.5px] border-yellow-200/90 bg-yellow-100/15 shadow-[0_0_8px_rgba(253,224,71,0.7),inset_0_0_4px_rgba(254,240,138,0.5)]">
          <div className="absolute inset-1 rounded-full border border-yellow-300/40" />
        </div>
        <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 bg-stone-700" />
      </div>

      {/* Camera tripod */}
      <div className="absolute bottom-2.5 right-2 h-9 w-6">
        <div className="absolute top-0 left-1/2 h-3 w-5 -translate-x-1/2 rounded border border-rose-700/80 bg-gradient-to-b from-stone-700 to-stone-900">
          <div className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-rose-500 bg-stone-950 shadow-[inset_0_0_2px_rgba(244,63,94,0.5)]">
            <div className="absolute inset-0.5 rounded-full border border-stone-600" />
          </div>
          <div className="absolute left-1 top-1 h-px w-px rounded-full bg-rose-400 shadow-[0_0_3px_rgba(251,113,133,0.9)]" />
        </div>
        <div className="absolute bottom-0 left-1/2 h-6 w-px -translate-x-1/2 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-6 w-px -translate-x-1/2 origin-top -rotate-12 bg-stone-700" />
        <div className="absolute bottom-0 left-1/2 h-6 w-px -translate-x-1/2 origin-top rotate-12 bg-stone-700" />
      </div>

      {/* Red carpet */}
      <div className="absolute bottom-1 left-1/4 right-1/4 h-1.5 rounded-sm bg-gradient-to-r from-rose-950 via-rose-800 to-rose-950 shadow-[inset_0_0_2px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-yellow-500/70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-yellow-500/70" />
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] leading-none text-yellow-300 shadow-[0_0_4px_rgba(250,204,21,0.8)]">
        ★
      </div>
    </>
  );
}

/* =================================================================== */
/* MENTAT — strategic war room                                          */
/* HERO: huge tactical world map dominating the back wall               */
/* =================================================================== */
function MentatFurniture() {
  return (
    <>
      {/* === HERO: Massive tactical world map === */}
      <div className="absolute left-1/2 top-1 h-[5.5rem] w-36 -translate-x-1/2 border-2 border-violet-700/90 bg-violet-950/80 shadow-[inset_0_0_6px_rgba(139,92,246,0.4),0_0_8px_rgba(139,92,246,0.15)]">
        {/* Header */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-violet-700/80 bg-violet-900/80 px-1 py-px">
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 animate-pulse rounded-full bg-red-400 shadow-[0_0_3px_rgba(248,113,113,1)]" />
            <span className="font-mono text-[5px] font-bold uppercase leading-none tracking-[0.2em] text-violet-200">
              ▼ WAR ROOM · TACTICAL
            </span>
          </div>
          <span className="font-mono text-[5px] leading-none text-violet-300/80">
            CONFIDENTIAL
          </span>
        </div>

        {/* Grid background */}
        <div
          className="absolute inset-0 mt-2 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(139,92,246,0.4) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgba(139,92,246,0.4) 0 1px, transparent 1px 8px)",
          }}
        />

        {/* World map (continents) */}
        <svg viewBox="0 0 144 80" className="absolute inset-0 mt-3 h-full w-full">
          {/* North America */}
          <path d="M 12 18 Q 18 14 28 16 Q 32 22 30 30 Q 24 36 16 32 Q 10 26 12 18 Z" fill="rgba(139,92,246,0.3)" stroke="rgb(167 139 250)" strokeWidth="0.4" />
          {/* South America */}
          <path d="M 26 38 Q 30 36 32 42 Q 30 50 26 52 Q 24 46 26 38 Z" fill="rgba(139,92,246,0.3)" stroke="rgb(167 139 250)" strokeWidth="0.4" />
          {/* Europe */}
          <path d="M 60 18 Q 70 16 78 20 Q 76 26 70 28 Q 62 26 60 18 Z" fill="rgba(139,92,246,0.3)" stroke="rgb(167 139 250)" strokeWidth="0.4" />
          {/* Africa */}
          <path d="M 64 30 Q 72 28 76 36 Q 74 46 68 48 Q 62 42 64 30 Z" fill="rgba(139,92,246,0.3)" stroke="rgb(167 139 250)" strokeWidth="0.4" />
          {/* Asia */}
          <path d="M 80 18 Q 100 14 120 22 Q 118 30 110 32 Q 90 30 80 18 Z" fill="rgba(139,92,246,0.3)" stroke="rgb(167 139 250)" strokeWidth="0.4" />
          {/* Australia */}
          <path d="M 110 42 Q 120 40 124 46 Q 120 50 112 48 Q 108 44 110 42 Z" fill="rgba(139,92,246,0.3)" stroke="rgb(167 139 250)" strokeWidth="0.4" />

          {/* Strategy lines */}
          <g opacity="0.85">
            <path d="M 70 22 L 22 22" stroke="rgb(248 113 113)" strokeWidth="0.6" strokeDasharray="3 1" fill="none" />
            <path d="M 70 22 L 100 22" stroke="rgb(74 222 128)" strokeWidth="0.6" strokeDasharray="3 1" fill="none" />
            <path d="M 70 22 L 70 38" stroke="rgb(250 204 21)" strokeWidth="0.6" strokeDasharray="3 1" fill="none" />
            <path d="M 22 22 L 26 42" stroke="rgb(248 113 113)" strokeWidth="0.4" strokeDasharray="2 1" fill="none" />
            <path d="M 100 22 L 116 44" stroke="rgb(74 222 128)" strokeWidth="0.4" strokeDasharray="2 1" fill="none" />
          </g>

          {/* Pinned positions */}
          <circle cx="70" cy="22" r="2" fill="rgb(254 240 138)" stroke="rgb(250 204 21)" strokeWidth="0.5">
            <animate attributeName="r" from="2" to="2.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="22" cy="22" r="1.5" fill="rgb(248 113 113)" />
          <circle cx="100" cy="22" r="1.5" fill="rgb(74 222 128)" />
          <circle cx="70" cy="38" r="1.5" fill="rgb(34 211 238)" />
          <circle cx="116" cy="44" r="1.5" fill="rgb(167 139 250)" />
          <circle cx="26" cy="42" r="1.5" fill="rgb(244 114 182)" />
        </svg>

        {/* HQ marker label */}
        <div className="absolute left-[48%] top-[35%] font-mono text-[4px] font-bold leading-none tracking-wider text-yellow-200/95 shadow-[0_0_2px_rgba(250,204,21,0.7)]">
          ◆HQ
        </div>

        {/* Compass rose — corner */}
        <div className="absolute top-3 right-1 h-3 w-3 rounded-full border border-violet-400/60 bg-violet-950/40">
          <div className="absolute left-1/2 top-0 h-1 w-px -translate-x-1/2 bg-red-400" />
          <div className="absolute left-1/2 bottom-0 h-1 w-px -translate-x-1/2 bg-violet-300" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[3px] font-bold leading-none text-violet-200">
            N
          </div>
        </div>
      </div>

      {/* === Bookshelf — left back === */}
      <div className="absolute left-1 top-1 h-12 w-5 border border-violet-900 bg-stone-900 shadow-[inset_0_0_3px_rgba(0,0,0,0.5)]">
        {[0, 1, 2, 3].map((shelf) => (
          <div key={shelf} className="border-b border-stone-800 px-px py-px">
            <div className="flex items-end gap-px">
              {[
                "bg-violet-700",
                "bg-stone-700",
                "bg-emerald-800",
                "bg-amber-800",
                "bg-red-800",
              ]
                .slice(0, 3 + (shelf % 2))
                .map((color, i) => (
                  <div
                    key={i}
                    className={`w-px ${color}`}
                    style={{ height: `${5 + (i % 3) * 2}px` }}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* === Country flags row — right back === */}
      <div className="absolute right-1 top-1 flex flex-col gap-px">
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

      {/* === Red phone (hotline) === */}
      <div className="absolute right-1 top-9 h-3 w-4">
        <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded bg-red-700 shadow-[0_0_4px_rgba(248,113,113,0.6)]" />
        <div className="absolute top-0 left-0 right-0 h-1 rounded-full bg-red-600" />
        <div className="absolute bottom-0.5 left-1/2 h-px w-px rounded-full bg-yellow-300" />
      </div>

      {/* === BOTTOM: Big oval war table === */}
      <div className="absolute bottom-2 left-1/2 h-7 w-[5.5rem] -translate-x-1/2">
        <div className="absolute top-0 left-0 right-0 h-4 rounded-full border-2 border-violet-700/90 bg-gradient-to-b from-violet-900/80 to-violet-950 shadow-[inset_0_0_6px_rgba(139,92,246,0.4),0_2px_4px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-1 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(139,92,246,0.5) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(139,92,246,0.5) 0 1px, transparent 1px 6px)",
            }}
          />
          {/* Game pieces */}
          <div className="absolute left-3 top-1 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_2px_rgba(248,113,113,0.7)]" />
          <div className="absolute left-7 top-2 h-1.5 w-1.5 rounded-full bg-blue-400" />
          <div className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-yellow-400" />
          <div className="absolute right-7 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <div className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
          {/* Centerpiece flag */}
          <div className="absolute left-1/2 bottom-1 h-1.5 w-px -translate-x-1/2 bg-stone-300" />
          <div className="absolute left-1/2 bottom-2 h-1 w-1.5 -translate-x-1/2 bg-violet-500" />
        </div>
        <div className="absolute bottom-0 left-1/2 h-3 w-2 -translate-x-1/2 bg-stone-800" />
      </div>

      {/* === Globe === */}
      <div className="absolute bottom-2.5 right-2 h-7 w-4">
        <div className="absolute top-0 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-violet-600/80 bg-gradient-to-br from-cyan-900 via-blue-950 to-stone-950">
          <div className="absolute left-0.5 top-1 h-px w-1 bg-emerald-300" />
          <div className="absolute right-0.5 top-1 h-px w-1.5 bg-emerald-300" />
          <div className="absolute left-0.5 bottom-1 h-px w-1.5 bg-emerald-300" />
        </div>
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-stone-700" />
      </div>

      {/* === Chess board === */}
      <div className="absolute bottom-2.5 left-2 h-3 w-4 border border-stone-700">
        <div className="h-full w-full"
          style={{
            backgroundImage:
              "repeating-conic-gradient(rgb(28 25 23) 0% 25%, rgb(245 245 244) 0% 50%) 50% / 4px 4px",
          }}
        />
      </div>
    </>
  );
}

/* =================================================================== */
/* FORGE — content blacksmith                                           */
/* HERO: enormous glowing furnace + crossed-hammer iron crest           */
/* =================================================================== */
function ForgeFurniture() {
  return (
    <>
      {/* === HERO: ENORMOUS forge furnace dominating left === */}
      <div className="absolute left-1 top-1 h-24 w-16 rounded-t border-2 border-amber-700/90 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 shadow-[inset_0_0_10px_rgba(0,0,0,0.7),0_0_16px_rgba(251,146,60,0.45)]">
        {/* Brick texture */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(120,53,15,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(120,53,15,0.6) 0 1px, transparent 1px 7px)",
          }}
        />
        {/* Mouth opening with raging fire */}
        <div className="absolute inset-x-1 top-3 h-[4.5rem] rounded-t-md border border-amber-900 bg-gradient-to-t from-yellow-200 via-orange-500 to-red-700 shadow-[inset_0_0_12px_rgba(0,0,0,0.5),0_0_18px_rgba(251,146,60,0.8)]">
          {/* Tall flame flickers */}
          <div className="absolute bottom-1 left-1 h-6 w-1.5 rounded-t-full bg-yellow-200/95 blur-[0.4px]" />
          <div className="absolute bottom-1 left-4 h-8 w-1.5 rounded-t-full bg-yellow-300 blur-[0.4px]" />
          <div className="absolute bottom-1 right-3 h-7 w-1.5 rounded-t-full bg-orange-300/95 blur-[0.4px]" />
          <div className="absolute bottom-1 right-1 h-5 w-1.5 rounded-t-full bg-yellow-200/90 blur-[0.4px]" />
          {/* Hot center glow */}
          <div className="absolute bottom-1 left-2 right-2 h-4 rounded-t bg-gradient-to-t from-yellow-100 to-orange-300 blur-[0.5px]" />
        </div>
        {/* Smoke vent */}
        <div className="absolute -top-2 left-1/2 h-2 w-6 -translate-x-1/2 rounded-t bg-stone-700" />
        {/* Smoke wisps */}
        <div className="absolute -top-7 left-1/2 h-5 w-px -translate-x-1/2 bg-gradient-to-t from-stone-400/60 to-transparent blur-[0.5px]" />
        <div className="absolute -top-6 left-[55%] h-4 w-px bg-gradient-to-t from-stone-300/40 to-transparent blur-[0.5px]" />
        <div className="absolute -top-6 left-[40%] h-4 w-px bg-gradient-to-t from-stone-400/40 to-transparent blur-[0.5px]" />
        {/* Glowing coals at floor */}
        <div className="absolute bottom-1 left-2 right-2 h-1.5 rounded bg-gradient-to-t from-red-700 to-orange-300 shadow-[0_0_5px_rgba(251,146,60,0.95)]" />
      </div>

      {/* Sparks above furnace */}
      <div className="absolute left-3 top-1 h-px w-px rounded-full bg-yellow-300 shadow-[0_0_4px_rgba(253,224,71,0.95)]" />
      <div className="absolute left-5 top-2 h-px w-px rounded-full bg-orange-300 shadow-[0_0_4px_rgba(251,146,60,0.95)]" />
      <div className="absolute left-7 top-3 h-px w-px rounded-full bg-yellow-200 shadow-[0_0_4px_rgba(254,240,138,0.95)]" />

      {/* === HERO: Crossed-hammer iron crest sign (right back) === */}
      <div className="absolute right-2 top-1 h-[5.5rem] w-[4.5rem] rounded border-2 border-amber-700/80 bg-gradient-to-b from-stone-800 to-stone-950 shadow-[inset_0_0_6px_rgba(0,0,0,0.6)]">
        {/* "FORGE" iron lettering */}
        <div
          className="mt-2 text-center font-serif text-[14px] font-black leading-none tracking-[0.15em] text-stone-300"
          style={{
            textShadow:
              "0 0 4px rgba(251,146,60,0.4), 0 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.6), inset 0 0 2px rgba(0,0,0,0.5)",
          }}
        >
          FORGE
        </div>
        {/* Crossed hammers — large emoji */}
        <div className="mt-1 flex items-center justify-center text-[26px] leading-none">
          ⚒
        </div>
        {/* Bottom motto */}
        <div className="absolute bottom-2 inset-x-0 text-center font-mono text-[5px] font-bold uppercase leading-none tracking-[0.2em] text-amber-300/80">
          ◆ CONTENT ◆
        </div>
      </div>

      {/* === BOTTOM: Anvil + bellows + water trough + coal === */}

      {/* Anvil */}
      <div className="absolute bottom-2.5 left-1/2 h-4 w-9 -translate-x-1/2">
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-l-full rounded-r-sm bg-gradient-to-b from-stone-500 to-stone-700 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.5)]" />
        <div className="absolute top-1.5 left-2 right-2 h-1.5 bg-stone-800" />
        <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b bg-stone-700" />
      </div>

      {/* Glowing red-hot ingot on anvil */}
      <div className="absolute bottom-[2.55rem] left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600 via-yellow-300 to-red-600 shadow-[0_0_5px_rgba(251,146,60,0.95)] blur-[0.3px]" />

      {/* Hammer leaning */}
      <div className="absolute bottom-2.5 left-[55%] h-5 w-px origin-bottom rotate-[15deg] bg-amber-800" />
      <div className="absolute bottom-[2.9rem] left-[54%] h-1.5 w-2 origin-bottom rotate-[15deg] bg-stone-600" />

      {/* Bellows */}
      <div className="absolute bottom-2.5 left-[5.5rem] h-3 w-3">
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-amber-900"
          style={{ clipPath: "polygon(0 50%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="absolute bottom-1 right-0 h-px w-1.5 bg-amber-800" />
      </div>

      {/* Water trough */}
      <div className="absolute bottom-2.5 right-7 h-2 w-5 rounded-sm border border-amber-900 bg-gradient-to-b from-blue-900/80 to-blue-950 shadow-[inset_0_0_3px_rgba(59,130,246,0.3)]">
        <div className="absolute inset-x-0.5 top-0 h-px bg-cyan-300/60" />
        <div className="absolute -top-2 left-2 h-2 w-px bg-gradient-to-t from-cyan-200/40 to-transparent blur-[0.5px]" />
        <div className="absolute -top-2 right-2 h-2 w-px bg-gradient-to-t from-cyan-200/40 to-transparent blur-[0.5px]" />
      </div>

      {/* Coal pile */}
      <div className="absolute bottom-2.5 right-2 flex items-end gap-px">
        <div className="h-1 w-1 rotate-12 bg-stone-900" />
        <div className="h-1.5 w-1.5 -rotate-6 bg-stone-950" />
        <div className="h-1 w-1 rotate-45 bg-stone-900" />
        <div className="h-1.5 w-1 -rotate-12 bg-stone-950" />
      </div>
      <div className="absolute bottom-[1.3rem] right-3 h-px w-1 rounded-full bg-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.9)]" />

      {/* Stone tile floor */}
      <div className="absolute bottom-1 left-1 right-1 h-1.5 rounded-sm border-t border-stone-700/80 bg-gradient-to-b from-stone-800 to-stone-950"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 8px)",
        }}
      />
    </>
  );
}
