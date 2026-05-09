"use client";

import { motion } from "framer-motion";
import type { RoomData } from "../RoomModal";
import { vaultFloors, FLOOR_LABEL, type Agent } from "@/lib/vault";
import { VaultRoom } from "./VaultRoom";

interface VaultProps {
  data: RoomData;
}

/**
 * Cross-section side-view of the Lamon Vault — top-down floors with
 * agent rooms. Inspired by Fallout Shelter mobile, but rendered with
 * an Iron-Man steel-and-amber aesthetic so it sits comfortably on top
 * of our existing dark theme.
 */
export function Vault({}: VaultProps) {
  const floors = vaultFloors();

  return (
    <main className="vault-bg relative flex-1 overflow-hidden">
      {/* Dot-grid + scanlines background layer */}
      <div className="pointer-events-none absolute inset-0 vault-scanlines" />

      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-8 lg:px-8">
        {/* Minimal terminal banner — no logos, just nameplate */}
        <div className="mb-4 flex items-baseline justify-between border-b border-amber-700/30 pb-2 font-mono text-amber-300/80">
          <div className="text-[10px] uppercase tracking-[0.3em]">
            ▸ Lamon Vault · cross-section
          </div>
          <div className="hidden text-[10px] uppercase tracking-[0.2em] text-amber-400/50 sm:block">
            overseer · Leonardo Lamon
          </div>
        </div>

        {/* Steel ribcage container — vault hull */}
        <div className="relative rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-zinc-950 via-stone-950 to-black shadow-[0_0_60px_rgba(245,158,11,0.08),inset_0_0_60px_rgba(0,0,0,0.6)]">
          {/* Rivets along the side */}
          <div className="pointer-events-none absolute inset-y-0 left-2 flex flex-col justify-around">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full border border-amber-700/60 bg-amber-900/30"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex flex-col justify-around">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full border border-amber-700/60 bg-amber-900/30"
              />
            ))}
          </div>

          <div className="px-6 py-5 lg:px-10 lg:py-8">
            {floors.map((floor, fi) => (
              <FloorRow
                key={floor.number}
                floorNumber={floor.number}
                rooms={floor.rooms}
                isLast={fi === floors.length - 1}
                index={fi}
              />
            ))}
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-amber-500/30">
          ▸ Lamon Vault · Alt+V → Classic
        </p>
      </div>

      {/* Inline styles for vault textures (kept here so the global stylesheet
          stays clean — these only render in vault view) */}
      <style jsx>{`
        .vault-bg {
          background:
            radial-gradient(ellipse at top, rgba(245, 158, 11, 0.04), transparent 60%),
            radial-gradient(ellipse at bottom, rgba(220, 38, 38, 0.03), transparent 70%),
            #050505;
        }
        .vault-scanlines {
          background-image: repeating-linear-gradient(
            0deg,
            rgba(245, 158, 11, 0.025) 0,
            rgba(245, 158, 11, 0.025) 1px,
            transparent 1px,
            transparent 4px
          );
          mix-blend-mode: overlay;
        }
      `}</style>
    </main>
  );
}

function FloorRow({
  floorNumber,
  rooms,
  isLast,
  index,
}: {
  floorNumber: number;
  rooms: Agent[];
  isLast: boolean;
  index: number;
}) {
  const label = FLOOR_LABEL[floorNumber] ?? `Floor ${floorNumber}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className={
        "relative " + (isLast ? "" : "border-b border-dashed border-amber-700/30 pb-5 mb-5")
      }
    >
      {/* Floor label badge — left side */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded border border-amber-500/40 bg-amber-500/10 font-mono text-[10px] font-bold text-amber-300">
          {floorNumber}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/70">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-amber-700/30 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <VaultRoom key={room.id} agent={room} />
        ))}
      </div>
    </motion.div>
  );
}
