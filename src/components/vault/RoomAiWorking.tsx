"use client";

/**
 * Big dramatic overlay shown inside a VaultRoom when an agent_actions
 * row is currently running for that agent. Replaces the tiny "researching"
 * banner with a full-room "AI in action" production:
 *
 *   - Pulsing amber border + intensified room glow (CSS class on parent)
 *   - Top banner: "🧠 AI U AKCIJI · [agent name] · [progress text]"
 *   - Sparkle particles rising from agent desk
 *   - Vertical data-stream bars (Matrix style) sweeping
 *   - Big floating progress label that types the latest progress text
 *   - Glowing focus halo around the seated agent
 *
 * Pure SVG/CSS, no extra deps.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";

interface Props {
  /** Visible name of the agent (e.g. "Comms"). */
  agentName: string;
  /** Latest progress text streamed from agent_actions.progress_text. */
  progress: string | null;
}

export function RoomAiWorking({ agentName, progress }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-25 overflow-hidden">
      {/* Amber wash overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-amber-500/15 animate-pulse" />

      {/* Vertical data-stream bars (Matrix style) */}
      <div className="absolute inset-0 opacity-40">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-px"
            style={{
              left: `${(i + 1) * 10}%`,
              background:
                "linear-gradient(180deg, transparent 0%, rgba(252,211,77,0.55) 35%, rgba(252,211,77,0.9) 50%, rgba(252,211,77,0.55) 65%, transparent 100%)",
              backgroundSize: "100% 60%",
              animation: `ai-data-stream ${1.4 + (i % 3) * 0.4}s linear ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Sparkle particles rising from desk area (deterministic positions) */}
      {[
        { left: 28, dur: 2.4, delay: 0 },
        { left: 42, dur: 3.1, delay: 0.4 },
        { left: 36, dur: 2.7, delay: 0.85 },
        { left: 55, dur: 2.2, delay: 1.2 },
        { left: 64, dur: 3.4, delay: 0.15 },
        { left: 48, dur: 2.9, delay: 1.6 },
        { left: 71, dur: 2.5, delay: 0.7 },
        { left: 34, dur: 3.2, delay: 2.0 },
      ].map((s, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute bottom-6 h-1.5 w-1.5 rounded-full bg-amber-300"
          style={{
            left: `${s.left}%`,
            boxShadow: "0 0 8px rgba(252,211,77,0.95)",
            animation: `ai-sparkle-rise ${s.dur}s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* Glowing halo around agent's workstation (mid-room) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 120,
          height: 120,
          background:
            "radial-gradient(circle, rgba(252,211,77,0.55) 0%, rgba(252,211,77,0.15) 40%, transparent 70%)",
          animation: "ai-halo-pulse 1.6s ease-in-out infinite",
        }}
      />

      {/* === TOP BANNER — "AI U AKCIJI" === */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.92 }}
          className="absolute left-1/2 top-7 -translate-x-1/2"
        >
          <div
            className="flex items-center gap-2 rounded-md border-2 border-amber-400/80 bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 px-3 py-1.5 backdrop-blur-md shadow-[0_0_24px_rgba(252,211,77,0.6)]"
            style={{ animation: "ai-banner-pulse 1.2s ease-in-out infinite alternate" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
            </span>
            <Brain size={12} className="text-amber-200" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-100 whitespace-nowrap">
              AI · {agentName}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* === BOTTOM TYPING PROGRESS LABEL === */}
      {progress && (
        <motion.div
          key={progress}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-2 right-2 bottom-10"
        >
          <div className="rounded border border-amber-500/60 bg-black/80 px-2 py-1 backdrop-blur-md shadow-lg">
            <p className="font-mono text-[8.5px] text-amber-200 leading-tight">
              <span className="inline-block animate-pulse">▸</span> {progress}
            </p>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        @keyframes ai-data-stream {
          0% {
            background-position: 0 -100%;
          }
          100% {
            background-position: 0 200%;
          }
        }
        @keyframes ai-sparkle-rise {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translateY(-160px) scale(1.4);
            opacity: 0;
          }
        }
        @keyframes ai-halo-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.85);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 1;
          }
        }
        @keyframes ai-banner-pulse {
          0% {
            box-shadow: 0 0 24px rgba(252, 211, 77, 0.5);
          }
          100% {
            box-shadow: 0 0 38px rgba(252, 211, 77, 0.85);
          }
        }
      `}</style>
    </div>
  );
}
