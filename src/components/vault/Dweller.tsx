"use client";

/**
 * Pixel-ish humanoid figure that paces left-right inside a vault room.
 * Pure SVG + CSS keyframe animation — no sprite assets, no JS tick.
 *
 * Each instance has a deterministic walk cycle so multiple dwellers in
 * the same room don't move in lockstep.
 */

interface DwellerProps {
  /** 0-1 horizontal start position inside the room */
  startPct?: number;
  /** Seconds for one full pace cycle (left → right → left) */
  cycleSec?: number;
  /** Tailwind color class for the suit (e.g. "fill-amber-400") */
  suitColor?: string;
  /** Tailwind color class for the head */
  skinColor?: string;
  /** Optional name shown on hover */
  label?: string;
  /** Animation phase offset (0-1) — desync from siblings */
  delaySec?: number;
  /** Visual scale (default 1) */
  scale?: number;
}

export function Dweller({
  startPct = 0.2,
  cycleSec = 12,
  suitColor = "fill-amber-500",
  skinColor = "fill-orange-200",
  label,
  delaySec = 0,
  scale = 1,
}: DwellerProps) {
  // CSS variables on the wrapper drive the keyframes so multiple
  // dwellers share the same animation but with different ranges/timings.
  const styleVars: React.CSSProperties = {
    left: `${startPct * 100}%`,
    animationDuration: `${cycleSec}s`,
    animationDelay: `${delaySec}s`,
    transform: `translateX(-50%) scale(${scale})`,
    transformOrigin: "bottom center",
  };
  const bobStyle: React.CSSProperties = {
    animationDuration: `${cycleSec / 12}s`,
    animationDelay: `${delaySec}s`,
  };
  return (
    <div
      className="dweller absolute bottom-1 z-10 origin-bottom"
      style={styleVars}
      title={label}
    >
      <div className="dweller-bob" style={bobStyle}>
        <svg
          width="14"
          height="22"
          viewBox="0 0 14 22"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          {/* head */}
          <rect className={skinColor} x="4" y="0" width="6" height="6" />
          {/* hair shadow */}
          <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
          {/* body / suit */}
          <rect className={suitColor} x="3" y="6" width="8" height="8" />
          {/* belt */}
          <rect className="fill-stone-900" x="3" y="13" width="8" height="1" />
          {/* legs */}
          <rect className="fill-stone-800" x="4" y="14" width="2" height="6" />
          <rect className="fill-stone-800" x="8" y="14" width="2" height="6" />
          {/* feet */}
          <rect className="fill-black" x="3" y="20" width="3" height="2" />
          <rect className="fill-black" x="8" y="20" width="3" height="2" />
        </svg>
      </div>
      <style jsx>{`
        .dweller {
          animation-name: pace;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        .dweller-bob {
          animation-name: bob;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        @keyframes pace {
          from {
            left: 8%;
          }
          to {
            left: 88%;
          }
        }
        @keyframes bob {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-1px);
          }
        }
      `}</style>
    </div>
  );
}
