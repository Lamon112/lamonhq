"use client";

import { motion } from "framer-motion";
import type { RoomId } from "@/lib/rooms";

export function RoomScene({ roomId }: { roomId: RoomId }) {
  // Background floor + wall lines (shared, Fallout vibe)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
      {/* Floor line */}
      <div className="absolute bottom-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* Side dim shadows for depth */}
      <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/40 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/40 to-transparent" />

      {/* Per-room scene */}
      <SceneContent roomId={roomId} />
    </div>
  );
}

function SceneContent({ roomId }: { roomId: RoomId }) {
  switch (roomId) {
    case "outreach":
      return <OutreachScene />;
    case "discovery":
      return <DiscoveryScene />;
    case "closing":
      return <ClosingScene />;
    case "lead_scorer":
      return <LeadScorerScene />;
    case "analytics":
      return <AnalyticsScene />;
    case "competitor":
      return <CompetitorScene />;
    case "clients":
      return <ClientsScene />;
    case "calendar":
      return <CalendarScene />;
    case "reports":
      return <ReportsScene />;
    default:
      return null;
  }
}

/* ============================================================
   Helpers — minimal pixel-ish silhouettes in flat SVG, gold + dim
   Position: bottom-right corner, ~50% width
   ============================================================ */

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="absolute bottom-0 right-2 h-[60%] w-[60%]"
      viewBox="0 0 100 60"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function Agent({
  x,
  y,
  hat,
  delay = 0,
}: {
  x: number;
  y: number;
  hat?: string;
  delay?: number;
}) {
  // Tiny dwarf-like figure: round head, body, hat
  return (
    <motion.g
      initial={{ y: y + 1 }}
      animate={{ y: [y + 1, y - 1, y + 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <ellipse cx={x} cy={y + 11} rx="4.5" ry="1.4" fill="rgba(0,0,0,0.5)" />
      {/* Body */}
      <rect
        x={x - 3.5}
        y={y + 3}
        width="7"
        height="7"
        rx="1.5"
        fill="#1a1a1a"
        stroke="#C9A84C"
        strokeWidth="0.6"
      />
      {/* Head */}
      <circle
        cx={x}
        cy={y + 1}
        r="2.5"
        fill="#f5e2b8"
        stroke="#C9A84C"
        strokeWidth="0.5"
      />
      {/* Hat */}
      {hat === "gold" && (
        <path
          d={`M ${x - 3} ${y - 1} Q ${x} ${y - 4} ${x + 3} ${y - 1} Z`}
          fill="#C9A84C"
        />
      )}
      {hat === "cap" && (
        <rect
          x={x - 2.5}
          y={y - 1.5}
          width="5"
          height="1.5"
          rx="0.5"
          fill="#7BB663"
        />
      )}
    </motion.g>
  );
}

/* === Outreach Lab — laptop + agent typing === */
function OutreachScene() {
  return (
    <Stage>
      {/* Desk */}
      <rect x="20" y="44" width="65" height="3" fill="#3a2f1c" />
      <rect x="22" y="47" width="2.5" height="11" fill="#2a2218" />
      <rect x="80.5" y="47" width="2.5" height="11" fill="#2a2218" />

      {/* Laptop base */}
      <rect x="46" y="40" width="22" height="4" rx="0.5" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.5" />
      {/* Laptop screen */}
      <rect x="48" y="28" width="18" height="12" rx="0.5" fill="#0a0a0a" stroke="#C9A84C" strokeWidth="0.5" />
      {/* Screen typing dots */}
      <motion.g
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <circle cx="52" cy="34" r="0.7" fill="#C9A84C" />
        <circle cx="56" cy="34" r="0.7" fill="#C9A84C" />
        <circle cx="60" cy="34" r="0.7" fill="#C9A84C" />
      </motion.g>
      {/* Plant on desk */}
      <rect x="26" y="38" width="3.5" height="3.5" fill="#2a2218" />
      <path d="M 27.5 38 L 26 35 M 27.5 38 L 28.5 34 M 27.5 38 L 29 35.5" stroke="#7BB663" strokeWidth="0.6" strokeLinecap="round" />
      {/* Agent typing */}
      <Agent x={37} y={32} hat="gold" />
    </Stage>
  );
}

/* === Discovery Bay — round table + 2 chairs === */
function DiscoveryScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      <ellipse cx="55" cy="42" rx="14" ry="3" fill="#2a2218" stroke="#C9A84C" strokeWidth="0.5" />
      <rect x="53" y="42" width="4" height="6" fill="#1a1a1a" />
      <rect x="32" y="36" width="6" height="10" rx="1" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.4" />
      <rect x="74" y="36" width="6" height="10" rx="1" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.4" />
      <Agent x={35} y={28} hat="gold" />
      <Agent x={77} y={28} hat="cap" delay={0.6} />
    </Stage>
  );
}

/* === Closing Room — handshake / contract === */
function ClosingScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      {/* Pedestal / podium */}
      <rect x="42" y="36" width="22" height="14" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.5" />
      {/* Contract paper */}
      <motion.rect
        initial={{ y: 28 }}
        animate={{ y: [28, 27, 28] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        x="46"
        width="14"
        height="9"
        fill="#f5efdc"
      />
      <line x1="48" y1="31" x2="58" y2="31" stroke="#0A0A0A" strokeWidth="0.4" />
      <line x1="48" y1="33" x2="56" y2="33" stroke="#0A0A0A" strokeWidth="0.4" />
      {/* Sparkle */}
      <motion.circle
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, delay: 0.5 }}
        cx="64"
        cy="28"
        r="0.8"
        fill="#E0BF5E"
      />
      <Agent x={32} y={36} hat="gold" />
      <Agent x={78} y={36} hat="cap" delay={0.4} />
    </Stage>
  );
}

/* === Lead Scorer — computer with scrolling data === */
function LeadScorerScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      {/* Monitor */}
      <rect x="40" y="22" width="28" height="20" rx="1" fill="#0a0a0a" stroke="#C9A84C" strokeWidth="0.5" />
      <rect x="50" y="42" width="8" height="3" fill="#1a1a1a" />
      <rect x="46" y="45" width="16" height="2" fill="#1a1a1a" />
      {/* Scrolling green lines */}
      <motion.g
        initial={{ y: -2 }}
        animate={{ y: [-2, -8, -2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <rect x="42" y="26" width="8" height="0.8" fill="#7BB663" />
        <rect x="42" y="29" width="14" height="0.8" fill="#7BB663" />
        <rect x="42" y="32" width="10" height="0.8" fill="#C9A84C" />
        <rect x="42" y="35" width="16" height="0.8" fill="#7BB663" />
        <rect x="42" y="38" width="6" height="0.8" fill="#7BB663" />
      </motion.g>
      <Agent x={28} y={36} hat="gold" />
    </Stage>
  );
}

/* === Performance Analytics — bar chart === */
function AnalyticsScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      <rect x="40" y="22" width="36" height="22" rx="1" fill="#0a0a0a" stroke="#C9A84C" strokeWidth="0.5" />
      {[
        { x: 44, h: 6 },
        { x: 50, h: 12 },
        { x: 56, h: 9 },
        { x: 62, h: 16 },
        { x: 68, h: 11 },
      ].map((b, i) => (
        <motion.rect
          key={i}
          x={b.x}
          width="3"
          fill="#C9A84C"
          initial={{ height: 0, y: 42 }}
          animate={{ height: b.h, y: 42 - b.h }}
          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity, repeatType: "reverse", repeatDelay: 2 }}
        />
      ))}
      <Agent x={28} y={36} hat="cap" />
    </Stage>
  );
}

/* === Competitor Watch — telescope === */
function CompetitorScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      {/* Telescope */}
      <line x1="50" y1="42" x2="65" y2="28" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="65" cy="28" r="2.5" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.5" />
      <line x1="50" y1="42" x2="48" y2="46" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="50" y1="42" x2="52" y2="46" stroke="#1a1a1a" strokeWidth="2" />
      {/* Stars */}
      <motion.g
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <circle cx="78" cy="20" r="0.7" fill="#E0BF5E" />
        <circle cx="82" cy="26" r="0.5" fill="#E0BF5E" />
        <circle cx="74" cy="14" r="0.6" fill="#E0BF5E" />
      </motion.g>
      <Agent x={36} y={36} hat="gold" />
    </Stage>
  );
}

/* === Client Manager — filing cabinet === */
function ClientsScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      {/* Cabinet */}
      <rect x="46" y="22" width="24" height="24" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.5" />
      <line x1="46" y1="30" x2="70" y2="30" stroke="#C9A84C" strokeWidth="0.4" />
      <line x1="46" y1="38" x2="70" y2="38" stroke="#C9A84C" strokeWidth="0.4" />
      <circle cx="58" cy="26" r="0.8" fill="#C9A84C" />
      <circle cx="58" cy="34" r="0.8" fill="#C9A84C" />
      <circle cx="58" cy="42" r="0.8" fill="#C9A84C" />
      <Agent x={32} y={36} hat="gold" />
    </Stage>
  );
}

/* === Calendar / Tasks === */
function CalendarScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      {/* Wall calendar */}
      <rect x="44" y="22" width="28" height="22" rx="1" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.5" />
      <rect x="44" y="22" width="28" height="4" fill="#C9A84C" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x={46 + (i % 4) * 6}
          y={28 + Math.floor(i / 4) * 4.5}
          width="5"
          height="3.5"
          fill={i === 5 ? "#C9A84C" : "#0a0a0a"}
          stroke="#2c2c2c"
          strokeWidth="0.3"
        />
      ))}
      <Agent x={32} y={36} hat="cap" />
    </Stage>
  );
}

/* === Weekly Reports — printer === */
function ReportsScene() {
  return (
    <Stage>
      <rect x="20" y="50" width="65" height="3" fill="#3a2f1c" />
      {/* Printer */}
      <rect x="44" y="32" width="28" height="14" rx="1" fill="#1a1a1a" stroke="#C9A84C" strokeWidth="0.5" />
      <rect x="46" y="34" width="24" height="3" fill="#0a0a0a" />
      {/* Paper coming out */}
      <motion.rect
        initial={{ y: 32, height: 0 }}
        animate={{ y: [32, 22, 32], height: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        x="52"
        width="12"
        fill="#f5efdc"
      />
      <line x1="54" y1="26" x2="62" y2="26" stroke="#0A0A0A" strokeWidth="0.3" />
      <line x1="54" y1="28" x2="60" y2="28" stroke="#0A0A0A" strokeWidth="0.3" />
      <Agent x={32} y={36} hat="gold" />
    </Stage>
  );
}
