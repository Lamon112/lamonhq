"use client";

/**
 * Per-agent furniture vignettes — flat SVG props arranged on the back
 * wall + floor of each vault room. Designed to immediately telegraph
 * what an agent does at a glance (corkboard for Holmes, vault door for
 * Treasury, server rack for Forge, etc.).
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

function HolmesFurniture() {
  return (
    <>
      {/* Corkboard with red string */}
      <div
        className="absolute left-3 top-3 h-14 w-20 rounded border border-amber-900/60 bg-amber-950/80"
        style={{
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.6)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(180,120,60,0.15) 0 2px, transparent 2px 5px)",
        }}
      >
        {/* Photos pinned */}
        <div className="absolute left-1 top-1 h-3 w-3 border border-stone-700 bg-stone-300" />
        <div className="absolute right-2 top-2 h-3 w-3 border border-stone-700 bg-stone-200" />
        <div className="absolute bottom-2 left-3 h-3 w-3 border border-stone-700 bg-stone-300" />
        {/* Red string */}
        <div
          className="absolute left-2 top-3 h-px w-12 bg-red-500/70"
          style={{ transform: "rotate(20deg)" }}
        />
        <div
          className="absolute left-3 top-5 h-px w-10 bg-red-500/70"
          style={{ transform: "rotate(-15deg)" }}
        />
      </div>
      {/* Desk with magnifier */}
      <div className="absolute bottom-3 right-4 h-3 w-14 rounded-sm border-t border-amber-900/60 bg-amber-950" />
      <div className="absolute bottom-5 right-7 text-base">🔍</div>
    </>
  );
}

/* --------------------------------- Jarvis --------------------------------- */

function JarvisFurniture() {
  return (
    <>
      {/* Wall of monitors */}
      <div className="absolute left-3 top-2 grid grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-3 w-5 rounded-sm border border-yellow-900/60 bg-yellow-950"
            style={{
              boxShadow: "inset 0 0 3px rgba(250,204,21,0.4)",
            }}
          />
        ))}
      </div>
      {/* Server rack */}
      <div className="absolute bottom-3 right-3 h-10 w-6 border border-stone-800 bg-stone-900">
        <div className="m-1 h-1 bg-yellow-400/70" />
        <div className="m-1 h-1 bg-yellow-400/40" />
        <div className="m-1 h-1 bg-yellow-400/70" />
        <div className="m-1 h-1 bg-yellow-400/30" />
      </div>
    </>
  );
}

/* --------------------------------- Nova --------------------------------- */

function NovaFurniture() {
  return (
    <>
      {/* Telescope / radar dish */}
      <div className="absolute left-3 top-2">
        <div className="h-6 w-6 rounded-full border-2 border-cyan-500/70 bg-cyan-950" />
        <div className="absolute left-3 top-3 h-4 w-px bg-cyan-400/80" />
      </div>
      {/* Big map / chart */}
      <div className="absolute right-3 top-2 h-10 w-16 border border-cyan-700/60 bg-cyan-950/40">
        <div className="absolute left-2 top-2 h-1 w-3 bg-cyan-400/80" />
        <div className="absolute left-1 top-5 h-1 w-5 bg-cyan-400/60" />
        <div className="absolute right-1 top-7 h-1 w-3 bg-cyan-400/80" />
      </div>
      <div className="absolute bottom-3 left-3 h-3 w-12 rounded-sm border-t border-cyan-900/60 bg-cyan-950" />
    </>
  );
}

/* --------------------------------- Comms --------------------------------- */

function CommsFurniture() {
  return (
    <>
      {/* Switchboard */}
      <div className="absolute left-3 top-3 h-10 w-14 border border-sky-700/60 bg-sky-950/60">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-sky-400/70"
            style={{
              left: `${10 + (i % 3) * 30}%`,
              top: `${20 + Math.floor(i / 3) * 25}%`,
            }}
          />
        ))}
      </div>
      {/* Dish antennas */}
      <div className="absolute right-3 top-1 h-7 w-7 rounded-full border-2 border-sky-500/70 bg-transparent" />
      <div className="absolute right-12 top-2 h-5 w-5 rounded-full border-2 border-sky-500/50 bg-transparent" />
    </>
  );
}

/* --------------------------------- Treasury --------------------------------- */

function TreasuryFurniture() {
  return (
    <>
      {/* Vault door */}
      <div className="absolute left-3 top-2 h-14 w-14 rounded border-2 border-emerald-700/80 bg-emerald-950/80 shadow-[inset_0_0_8px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-1 rounded-full border-2 border-emerald-600/70" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400" />
        {/* spokes */}
        {[0, 45, 90, 135].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 h-px w-6 origin-left bg-emerald-400/70"
            style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
          />
        ))}
      </div>
      {/* Stacks of cash bricks */}
      <div className="absolute bottom-3 right-4 flex gap-1">
        <div className="h-4 w-5 border border-emerald-700/70 bg-emerald-900/80" />
        <div className="h-5 w-5 border border-emerald-700/70 bg-emerald-900/80" />
        <div className="h-3 w-5 border border-emerald-700/70 bg-emerald-900/80" />
      </div>
    </>
  );
}

/* --------------------------------- Steward (Client HQ) ------------------- */

function StewardFurniture() {
  return (
    <>
      {/* Reception desk + screens */}
      <div className="absolute left-3 top-3 h-7 w-12 rounded-sm border border-emerald-700/70 bg-emerald-950/50">
        <div className="absolute left-1 top-1 h-2 w-3 bg-emerald-400/70" />
        <div className="absolute right-1 top-1 h-2 w-3 bg-emerald-400/70" />
      </div>
      {/* Couches */}
      <div className="absolute bottom-3 right-3 h-3 w-10 rounded-sm border-t border-emerald-700/70 bg-emerald-900/70" />
      <div className="absolute bottom-3 right-15 h-3 w-6 rounded-sm border-t border-emerald-700/70 bg-emerald-900/70" />
      {/* Plant */}
      <div className="absolute bottom-3 left-3 h-4 w-2 rounded-t bg-green-700" />
    </>
  );
}

/* --------------------------------- Atlas (Brand) ------------------------- */

function AtlasFurniture() {
  return (
    <>
      {/* Trophy shelf */}
      <div className="absolute left-3 top-2 flex gap-1">
        <div className="text-base">🏆</div>
        <div className="text-base">🥇</div>
        <div className="text-base">🎬</div>
      </div>
      {/* Camera + lights */}
      <div className="absolute right-3 top-3">
        <div className="h-4 w-5 border border-rose-700/60 bg-rose-950" />
        <div className="absolute -top-1 left-2 h-2 w-2 rounded-full bg-rose-400" />
      </div>
      <div className="absolute bottom-3 right-4 h-3 w-12 rounded-sm border-t border-rose-700/70 bg-rose-950" />
    </>
  );
}

/* --------------------------------- Mentat (War Room) -------------------- */

function MentatFurniture() {
  return (
    <>
      {/* Round table */}
      <div className="absolute left-1/2 top-1/2 h-10 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-700/70 bg-violet-950/40 shadow-[inset_0_0_8px_rgba(139,92,246,0.2)]" />
      {/* Strategy map on wall */}
      <div className="absolute right-3 top-2 h-7 w-12 border border-violet-700/60 bg-violet-950/60">
        <div className="absolute left-1 top-1 h-1 w-2 bg-red-400" />
        <div className="absolute right-1 top-3 h-1 w-2 bg-yellow-400" />
        <div className="absolute left-2 bottom-1 h-1 w-2 bg-green-400" />
      </div>
    </>
  );
}

/* --------------------------------- Forge --------------------------------- */

function ForgeFurniture() {
  return (
    <>
      {/* Forge / furnace */}
      <div className="absolute left-3 top-3 h-10 w-12 rounded-t border border-amber-700/80 bg-stone-900">
        <div className="absolute inset-2 rounded-t bg-gradient-to-t from-orange-500 to-yellow-300" />
      </div>
      {/* Anvil */}
      <div className="absolute bottom-3 right-3 h-3 w-8 bg-stone-700" />
      <div className="absolute bottom-3 right-4 h-2 w-6 bg-stone-600" />
    </>
  );
}
