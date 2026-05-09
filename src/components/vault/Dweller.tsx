"use client";

/**
 * Pixel-ish humanoid figures inhabiting vault rooms.
 *   - Dweller        — paces left ↔ right with a CSS keyframe walk cycle
 *   - SitterDweller  — static figure (sitting/standing at workstation)
 *
 * Pure SVG + CSS — no sprite assets, no JS tick.
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
      className="dweller absolute bottom-2 z-10 origin-bottom"
      style={styleVars}
      title={label}
    >
      <div className="dweller-bob" style={bobStyle}>
        <HumanoidSvg suitColor={suitColor} skinColor={skinColor} />
        {/* Cast shadow */}
        <div className="absolute -bottom-px left-1/2 h-px w-3 -translate-x-1/2 rounded-full bg-black/50 blur-[0.5px]" />
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
          position: relative;
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

interface SitterDwellerProps {
  /** 0-1 horizontal position */
  posPct: number;
  /** px from floor (default 4) */
  bottomPx?: number;
  suitColor?: string;
  skinColor?: string;
  label?: string;
  scale?: number;
}

export function SitterDweller({
  posPct,
  bottomPx = 4,
  suitColor = "fill-amber-500",
  skinColor = "fill-orange-200",
  label,
  scale = 1,
}: SitterDwellerProps) {
  return (
    <div
      className="sitter absolute z-10 origin-bottom"
      style={{
        left: `${posPct * 100}%`,
        bottom: bottomPx,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: "bottom center",
      }}
      title={label}
    >
      {/* Subtle idle sway */}
      <div className="sitter-sway">
        <HumanoidSvg suitColor={suitColor} skinColor={skinColor} />
        {/* Cast shadow */}
        <div className="absolute -bottom-px left-1/2 h-px w-3 -translate-x-1/2 rounded-full bg-black/50 blur-[0.5px]" />
      </div>
      <style jsx>{`
        .sitter-sway {
          animation: sitter-sway 4s ease-in-out infinite alternate;
          position: relative;
        }
        @keyframes sitter-sway {
          from {
            transform: translateY(0) rotate(-0.5deg);
          }
          to {
            transform: translateY(-0.5px) rotate(0.5deg);
          }
        }
      `}</style>
    </div>
  );
}

function HumanoidSvg({
  suitColor,
  skinColor,
}: {
  suitColor: string;
  skinColor: string;
}) {
  return (
    <svg
      width="14"
      height="22"
      viewBox="0 0 14 22"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))",
      }}
    >
      {/* head */}
      <rect className={skinColor} x="4" y="0" width="6" height="6" />
      {/* hair shadow */}
      <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
      {/* face shading (light side) */}
      <rect className="fill-white/10" x="4" y="2" width="2" height="4" />
      {/* body / suit */}
      <rect className={suitColor} x="3" y="6" width="8" height="8" />
      {/* suit highlight (left edge) */}
      <rect className="fill-white/15" x="3" y="6" width="1" height="7" />
      {/* suit shadow (right edge) */}
      <rect className="fill-black/25" x="10" y="6" width="1" height="7" />
      {/* belt */}
      <rect className="fill-stone-900" x="3" y="13" width="8" height="1" />
      {/* legs */}
      <rect className="fill-stone-800" x="4" y="14" width="2" height="6" />
      <rect className="fill-stone-800" x="8" y="14" width="2" height="6" />
      {/* feet */}
      <rect className="fill-black" x="3" y="20" width="3" height="2" />
      <rect className="fill-black" x="8" y="20" width="3" height="2" />
    </svg>
  );
}
