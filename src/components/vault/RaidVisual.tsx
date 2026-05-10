"use client";

/**
 * Big animated attackers + environmental hazards rendered INSIDE a
 * VaultRoom when raids are active. Inspired by Fallout Shelter's raider
 * incursions + room fires.
 *
 * Layered above floor + dwellers, below the ID plate. Pure SVG + CSS
 * keyframes (no asset deps) so it scales with the room and respects
 * the existing per-agent accent palette.
 *
 * One <RaidVisual /> per VaultRoom. It picks a renderer per raid_type
 * and stacks them — multiple simultaneous raids = multiple attackers.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { ActiveRaid } from "@/app/actions/raids";

interface Props {
  raids: ActiveRaid[];
  /** Used to give each room a slightly different randomized seed. */
  seed?: number;
}

export function RaidVisual({ raids, seed = 0 }: Props) {
  if (raids.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-15 overflow-hidden">
      {/* Ambient damage tint — red wash when any raid present */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-950/0 via-rose-950/20 to-rose-950/40 mix-blend-overlay animate-pulse" />

      <AnimatePresence>
        {raids.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="absolute inset-0"
          >
            <RaidVisualSwitch raidType={r.raid_type} index={i + seed} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RaidVisualSwitch({
  raidType,
  index,
}: {
  raidType: string;
  index: number;
}) {
  switch (raidType) {
    case "counter_scout":
      return <RaiderAttacker index={index} />;
    case "churn_wraith":
      return <ChurnWraith index={index} />;
    case "vendor_swarm":
      return <VendorSwarm index={index} />;
    case "bad_review":
      return <BadReviewGoblin index={index} />;
    case "outage_beast":
      return <OutageFire index={index} />;
    case "gdpr_probe":
      return <GdprProbe index={index} />;
    default:
      return null;
  }
}

// =====================================================================
// 1. RAIDER (counter_scout) — hooded bandit walking from right, knife
//    raised, glowing red eyes. Walks in, idle slash, repeats.
// =====================================================================
function RaiderAttacker({ index }: { index: number }) {
  const startSide = index % 2 === 0 ? "right" : "left";
  return (
    <div
      className="raider-walk absolute bottom-0"
      style={{
        right: startSide === "right" ? "0%" : undefined,
        left: startSide === "left" ? "0%" : undefined,
        animationDuration: "8s",
        animationDelay: `${index * 0.4}s`,
        transform: startSide === "left" ? "scaleX(-1)" : undefined,
      }}
    >
      <RaiderSvg />
      <style jsx>{`
        .raider-walk {
          animation-name: ${startSide === "right" ? "raider-pace-right" : "raider-pace-left"};
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        @keyframes raider-pace-right {
          0% {
            right: -20%;
            opacity: 0;
          }
          15% {
            right: 5%;
            opacity: 1;
          }
          50% {
            right: 35%;
          }
          100% {
            right: 50%;
          }
        }
        @keyframes raider-pace-left {
          0% {
            left: -20%;
            opacity: 0;
          }
          15% {
            left: 5%;
            opacity: 1;
          }
          50% {
            left: 35%;
          }
          100% {
            left: 50%;
          }
        }
      `}</style>
    </div>
  );
}

function RaiderSvg() {
  return (
    <svg
      width="78"
      height="110"
      viewBox="0 0 78 110"
      style={{ filter: "drop-shadow(0 4px 6px rgba(244,63,94,0.5))" }}
    >
      {/* Knife arm — animated swing */}
      <g className="raider-arm" style={{ transformOrigin: "39px 60px" }}>
        <line
          x1="39"
          y1="60"
          x2="64"
          y2="40"
          stroke="#a8a29e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Knife blade */}
        <polygon points="60,42 76,18 70,16 56,40" fill="#e7e5e4" />
        <polygon points="60,42 76,18 70,16 56,40" fill="url(#bladeShine)" opacity="0.4" />
      </g>

      {/* Body / coat */}
      <path
        d="M22,52 L22,98 Q22,106 28,106 L50,106 Q56,106 56,98 L56,52 Z"
        fill="#1c1917"
      />
      <path
        d="M22,52 L22,75 L56,75 L56,52 Z"
        fill="#292524"
      />
      {/* Belt */}
      <rect x="22" y="74" width="34" height="3" fill="#7c2d12" />
      {/* Coat tear */}
      <polygon points="34,82 38,100 32,90" fill="#7f1d1d" />

      {/* Other arm */}
      <line
        x1="32"
        y1="58"
        x2="22"
        y2="84"
        stroke="#1c1917"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="22" cy="84" r="4" fill="#fed7aa" />

      {/* Hood */}
      <path
        d="M18,38 Q18,18 39,18 Q60,18 60,38 L56,52 Q39,46 22,52 Z"
        fill="#0c0a09"
      />
      {/* Face shadow */}
      <ellipse cx="39" cy="36" rx="14" ry="10" fill="#1c1917" />
      {/* Glowing eyes */}
      <circle cx="33" cy="36" r="2.4" fill="#ef4444">
        <animate
          attributeName="opacity"
          values="0.7;1;0.7"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="45" cy="36" r="2.4" fill="#ef4444">
        <animate
          attributeName="opacity"
          values="0.7;1;0.7"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Eye glow halo */}
      <circle cx="33" cy="36" r="5" fill="#ef4444" opacity="0.25" />
      <circle cx="45" cy="36" r="5" fill="#ef4444" opacity="0.25" />

      {/* Mouth — sneer */}
      <path d="M34,42 Q39,45 44,42" stroke="#7f1d1d" strokeWidth="1" fill="none" />

      {/* Boots */}
      <rect x="26" y="100" width="9" height="6" fill="#0c0a09" />
      <rect x="43" y="100" width="9" height="6" fill="#0c0a09" />

      <defs>
        <linearGradient id="bladeShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <style jsx>{`
        .raider-arm {
          animation: raider-slash 1.6s ease-in-out infinite;
        }
        @keyframes raider-slash {
          0%,
          70%,
          100% {
            transform: rotate(0deg);
          }
          80% {
            transform: rotate(-50deg);
          }
          90% {
            transform: rotate(20deg);
          }
        }
      `}</style>
    </svg>
  );
}

// =====================================================================
// 2. CHURN WRAITH — ghostly silhouette drifting + hovering, semi-trans
//    purple/blue glow, sad eye sockets.
// =====================================================================
function ChurnWraith({ index }: { index: number }) {
  return (
    <div
      className="wraith-drift absolute"
      style={{
        bottom: "20%",
        animationDelay: `${index * 0.6}s`,
        animationDuration: "10s",
      }}
    >
      <div className="wraith-bob">
        <WraithSvg />
      </div>
      <style jsx>{`
        .wraith-drift {
          animation-name: wraith-pace;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        .wraith-bob {
          animation: wraith-hover 2.4s ease-in-out infinite alternate;
        }
        @keyframes wraith-pace {
          from {
            left: 10%;
          }
          to {
            left: 70%;
          }
        }
        @keyframes wraith-hover {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-12px);
          }
        }
      `}</style>
    </div>
  );
}

function WraithSvg() {
  return (
    <svg
      width="90"
      height="120"
      viewBox="0 0 90 120"
      style={{ filter: "drop-shadow(0 0 16px rgba(167,139,250,0.7))" }}
    >
      {/* Ethereal trail */}
      <path
        d="M20,108 Q24,112 30,110 Q36,114 42,110 Q48,114 54,110 Q60,114 66,108 Q72,112 78,108 L78,118 L20,118 Z"
        fill="url(#wraithFade)"
        opacity="0.6"
      />
      {/* Body */}
      <path
        d="M30,10 Q22,12 18,28 L15,80 Q14,98 22,108 Q34,114 45,108 Q56,114 68,108 Q76,98 75,80 L72,28 Q68,12 60,10 Q45,4 30,10 Z"
        fill="url(#wraithBody)"
        opacity="0.85"
      />
      {/* Inner glow */}
      <ellipse cx="45" cy="60" rx="22" ry="40" fill="#a78bfa" opacity="0.18" />
      {/* Hollow eye sockets */}
      <ellipse cx="35" cy="38" rx="5" ry="8" fill="#1e1b4b" />
      <ellipse cx="55" cy="38" rx="5" ry="8" fill="#1e1b4b" />
      {/* Eye glow */}
      <circle cx="35" cy="40" r="2.5" fill="#c4b5fd">
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="55" cy="40" r="2.5" fill="#c4b5fd">
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Mouth — ghastly oval */}
      <ellipse cx="45" cy="58" rx="6" ry="10" fill="#1e1b4b" opacity="0.7" />

      <defs>
        <linearGradient id="wraithBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="wraithFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// =====================================================================
// 3. VENDOR SWARM — 6 scuttling bug sprites across floor at varying
//    speeds + directions.
// =====================================================================
function VendorSwarm({ index }: { index: number }) {
  const bugs = [
    { left: "5%", duration: 4, delay: 0 },
    { left: "20%", duration: 5, delay: 0.7 },
    { left: "38%", duration: 3.5, delay: 1.2 },
    { left: "55%", duration: 4.5, delay: 0.4 },
    { left: "72%", duration: 5.5, delay: 1.8 },
    { left: "88%", duration: 3.8, delay: 0.2 },
  ];
  return (
    <div className="absolute inset-0">
      {bugs.map((b, i) => (
        <div
          key={i}
          className="vendor-bug absolute bottom-1"
          style={{
            left: b.left,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay + index * 0.1}s`,
          }}
        >
          <BugSvg />
        </div>
      ))}
      <style jsx>{`
        .vendor-bug {
          animation-name: bug-scuttle;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        @keyframes bug-scuttle {
          0% {
            transform: translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateX(-8px) rotate(-3deg);
          }
          50% {
            transform: translateX(0px) rotate(0deg);
          }
          75% {
            transform: translateX(8px) rotate(3deg);
          }
          100% {
            transform: translateX(0px) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}

function BugSvg() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26">
      {/* Body */}
      <ellipse cx="17" cy="14" rx="10" ry="6" fill="#0c4a6e" />
      <ellipse cx="13" cy="13" rx="3" ry="2" fill="#0e7490" opacity="0.8" />
      {/* Head */}
      <circle cx="26" cy="14" r="4" fill="#155e75" />
      {/* Pincers */}
      <path
        d="M30,12 Q34,10 32,8"
        stroke="#0c4a6e"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M30,16 Q34,18 32,20"
        stroke="#0c4a6e"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Eyes */}
      <circle cx="28" cy="13" r="0.8" fill="#fef08a" />
      <circle cx="28" cy="15" r="0.8" fill="#fef08a" />
      {/* Legs */}
      <line x1="11" y1="14" x2="6" y2="22" stroke="#0c4a6e" strokeWidth="1.2" />
      <line x1="14" y1="14" x2="10" y2="22" stroke="#0c4a6e" strokeWidth="1.2" />
      <line x1="17" y1="14" x2="14" y2="22" stroke="#0c4a6e" strokeWidth="1.2" />
      <line x1="20" y1="14" x2="22" y2="22" stroke="#0c4a6e" strokeWidth="1.2" />
      {/* Tail/stinger */}
      <path
        d="M7,14 Q2,8 4,4"
        stroke="#0c4a6e"
        strokeWidth="2"
        fill="none"
      />
      <polygon points="3,3 6,5 5,2" fill="#fbbf24" />
    </svg>
  );
}

// =====================================================================
// 4. BAD REVIEW GOBLIN — giant red downward arrow + 1-star icons
//    floating up from the floor.
// =====================================================================
function BadReviewGoblin({ index }: { index: number }) {
  return (
    <div className="absolute inset-0">
      {/* Big arrow */}
      <div
        className="absolute"
        style={{
          right: "12%",
          top: "20%",
          animation: "review-arrow-bob 2s ease-in-out infinite alternate",
        }}
      >
        <svg width="80" height="120" viewBox="0 0 80 120">
          <defs>
            <linearGradient id="badArrowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
          </defs>
          <path
            d="M30,0 L50,0 L50,72 L72,72 L40,118 L8,72 L30,72 Z"
            fill="url(#badArrowGrad)"
            stroke="#7f1d1d"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 4px 8px rgba(244,63,94,0.6))" }}
          />
        </svg>
      </div>
      {/* Floating 1-stars */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 18}%`,
            bottom: "5%",
            animation: `review-star-float ${3 + i * 0.4}s ease-in-out ${index * 0.2 + i * 0.6}s infinite`,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24">
            <polygon
              points="12,2 14.6,9.3 22,9.3 16.2,13.8 18.4,21 12,16.5 5.6,21 7.8,13.8 2,9.3 9.4,9.3"
              fill="#fbbf24"
              stroke="#92400e"
              strokeWidth="0.8"
            />
            <text
              x="12"
              y="15"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#7f1d1d"
            >
              1★
            </text>
          </svg>
        </div>
      ))}
      <style jsx>{`
        @keyframes review-arrow-bob {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(8px);
          }
        }
        @keyframes review-star-float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-60px) rotate(180deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-120px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// 5. OUTAGE FIRE — flickering flame sprites + smoke plumes covering
//    the lower half of the room. Critical/destructive.
// =====================================================================
function OutageFire({ index }: { index: number }) {
  const flames = [
    { left: "10%", scale: 1.0, delay: 0 },
    { left: "28%", scale: 1.3, delay: 0.3 },
    { left: "48%", scale: 1.1, delay: 0.6 },
    { left: "68%", scale: 1.4, delay: 0.2 },
    { left: "84%", scale: 1.0, delay: 0.5 },
  ];
  return (
    <div className="absolute inset-0">
      {/* Heat haze tint at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-600/40 via-orange-500/10 to-transparent mix-blend-screen animate-pulse" />
      {flames.map((f, i) => (
        <div
          key={i}
          className="absolute bottom-1"
          style={{
            left: f.left,
            transform: `scale(${f.scale})`,
            transformOrigin: "bottom center",
            animation: `flame-flicker ${0.4 + (i % 3) * 0.15}s ease-in-out ${f.delay + index * 0.1}s infinite alternate`,
          }}
        >
          <FlameSvg />
        </div>
      ))}
      {/* Smoke plumes */}
      {[0, 1, 2].map((i) => (
        <div
          key={`smoke-${i}`}
          className="absolute"
          style={{
            left: `${20 + i * 28}%`,
            bottom: "30%",
            animation: `smoke-rise ${4 + i * 0.5}s ease-out ${i * 1.2}s infinite`,
          }}
        >
          <svg width="50" height="60" viewBox="0 0 50 60">
            <ellipse cx="25" cy="40" rx="20" ry="14" fill="#1c1917" opacity="0.5" />
            <ellipse cx="20" cy="25" rx="15" ry="11" fill="#292524" opacity="0.4" />
            <ellipse cx="30" cy="12" rx="12" ry="8" fill="#44403c" opacity="0.3" />
          </svg>
        </div>
      ))}
      <style jsx>{`
        @keyframes flame-flicker {
          from {
            transform: scaleY(0.92) scaleX(1.05);
            filter: brightness(1);
          }
          to {
            transform: scaleY(1.08) scaleX(0.95);
            filter: brightness(1.3);
          }
        }
        @keyframes smoke-rise {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          30% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-100px) scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function FlameSvg() {
  return (
    <svg
      width="50"
      height="80"
      viewBox="0 0 50 80"
      style={{ filter: "drop-shadow(0 0 14px rgba(251,146,60,0.8))" }}
    >
      <defs>
        <radialGradient id="flameGrad" cx="0.5" cy="1" r="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="40%" stopColor="#fb923c" />
          <stop offset="70%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="flameCore" cx="0.5" cy="0.9" r="0.6">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="60%" stopColor="#fde047" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M25,80 Q5,60 8,40 Q12,30 18,28 Q14,16 25,4 Q36,16 32,28 Q38,30 42,40 Q45,60 25,80 Z"
        fill="url(#flameGrad)"
      />
      <path
        d="M25,76 Q14,60 18,44 Q22,34 25,30 Q28,34 32,44 Q36,60 25,76 Z"
        fill="url(#flameCore)"
      />
      {/* Embers */}
      <circle cx="22" cy="22" r="1.2" fill="#fde047" opacity="0.9" />
      <circle cx="30" cy="18" r="1" fill="#fbbf24" opacity="0.8" />
      <circle cx="26" cy="10" r="0.8" fill="#fef3c7" opacity="0.7" />
    </svg>
  );
}

// =====================================================================
// 6. GDPR PROBE — slithering scroll/snake with red wax seal pulsing
// =====================================================================
function GdprProbe({ index }: { index: number }) {
  return (
    <div
      className="gdpr-slither absolute bottom-2"
      style={{ animationDelay: `${index * 0.4}s` }}
    >
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
      >
        {/* Scroll body */}
        <rect x="14" y="20" width="92" height="50" rx="6" fill="#fef3c7" />
        <rect x="14" y="20" width="92" height="50" rx="6" fill="url(#paperShade)" opacity="0.4" />
        {/* Tape lines */}
        <line x1="22" y1="32" x2="98" y2="32" stroke="#a8a29e" strokeWidth="1" />
        <line x1="22" y1="40" x2="92" y2="40" stroke="#a8a29e" strokeWidth="1" />
        <line x1="22" y1="48" x2="98" y2="48" stroke="#a8a29e" strokeWidth="1" />
        <line x1="22" y1="56" x2="86" y2="56" stroke="#a8a29e" strokeWidth="1" />
        {/* AZOP header */}
        <text
          x="60"
          y="18"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#1e3a8a"
        >
          AZOP · GDPR PROBE
        </text>
        {/* Wax seal */}
        <circle
          cx="86"
          cy="52"
          r="14"
          fill="#9f1239"
          stroke="#7f1d1d"
          strokeWidth="1.5"
        >
          <animate
            attributeName="r"
            values="13;15;13"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x="86"
          y="56"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="#fef3c7"
        >
          §
        </text>
        {/* Scroll ends */}
        <ellipse cx="14" cy="45" rx="4" ry="25" fill="#a8a29e" />
        <ellipse cx="106" cy="45" rx="4" ry="25" fill="#a8a29e" />

        <defs>
          <linearGradient id="paperShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>
      <style jsx>{`
        .gdpr-slither {
          animation: gdpr-pace 7s ease-in-out infinite alternate;
        }
        @keyframes gdpr-pace {
          from {
            left: 5%;
          }
          to {
            left: 55%;
          }
        }
      `}</style>
    </div>
  );
}
