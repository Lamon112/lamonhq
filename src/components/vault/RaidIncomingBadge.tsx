"use client";

/**
 * Small pulsing badge overlay shown in the top-right of a VaultRoom
 * when one or more raids are currently targeting that room.
 *
 * Click → opens the global RaidDefenseModal scrolled to the most urgent
 * raid for this room. The badge color matches the highest severity
 * across this room's incoming raids.
 */
import type { RaidSeverity } from "@/lib/raids";
import { SEVERITY_COLOR } from "@/lib/raids";
import { ShieldAlert } from "lucide-react";

interface Props {
  count: number;
  highestSeverity: RaidSeverity;
  onClick: () => void;
}

export function RaidIncomingBadge({ count, highestSeverity, onClick }: Props) {
  if (count <= 0) return null;
  const c = SEVERITY_COLOR[highestSeverity];
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={
        "group/raid absolute -right-2 -top-2 z-30 flex items-center gap-1 rounded-full border-2 px-1.5 py-0.5 backdrop-blur-sm shadow-[0_0_14px_rgba(244,63,94,0.55)] transition-transform hover:scale-110 " +
        `${c.border} ${c.bg}`
      }
      title={`${count} raid${count > 1 ? "s" : ""} u tijeku — klikni za obranu`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${c.pulse}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${c.pulse}`} />
      </span>
      <ShieldAlert size={10} className={c.text} />
      <span className={`font-mono text-[9px] font-bold leading-none ${c.text}`}>
        {count}
      </span>
    </button>
  );
}
