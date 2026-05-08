"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Zap, Sparkles } from "lucide-react";
import type { XpStats } from "@/lib/xp";

const LEVEL_KEY = "lamon-hq:last-level";

export function PlayerLevel({ stats }: { stats: XpStats }) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showXpGain, setShowXpGain] = useState(false);
  const [previousXp, setPreviousXp] = useState<number | null>(null);

  // Detect level-up across renders / sessions.
  useEffect(() => {
    const stored = localStorage.getItem(LEVEL_KEY);
    const prev = stored ? parseInt(stored, 10) : stats.level;
    if (stats.level > prev) {
      setShowLevelUp(true);
      const t = setTimeout(() => setShowLevelUp(false), 4000);
      localStorage.setItem(LEVEL_KEY, String(stats.level));
      return () => clearTimeout(t);
    }
    localStorage.setItem(LEVEL_KEY, String(stats.level));
  }, [stats.level]);

  // Detect XP gain across renders.
  useEffect(() => {
    if (previousXp !== null && stats.totalXp > previousXp) {
      setShowXpGain(true);
      const t = setTimeout(() => setShowXpGain(false), 2200);
      return () => clearTimeout(t);
    }
    setPreviousXp(stats.totalXp);
  }, [stats.totalXp, previousXp]);

  const xpDelta =
    previousXp !== null && stats.totalXp > previousXp
      ? stats.totalXp - previousXp
      : 0;

  return (
    <div
      className="relative flex min-w-[170px] flex-col gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2"
      data-resource-tile="player-level"
    >
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider">
        <span className="flex items-center gap-1 text-purple-300">
          <Zap size={10} className="fill-purple-400 text-purple-400" />
          Lvl {stats.level}
        </span>
        <span className="font-semibold text-text">
          {stats.xpInLevel.toLocaleString("hr-HR")}
          <span className="text-text-muted">
            /{stats.xpForNextLevel.toLocaleString("hr-HR")} XP
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${stats.progressPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
        />
      </div>
      <div className="flex items-center justify-between text-[9px] text-text-muted">
        <span>{stats.totalXp.toLocaleString("hr-HR")} XP total</span>
        {stats.recentXp24h > 0 && (
          <span className="font-semibold text-cyan-400">
            +{stats.recentXp24h} u 24h
          </span>
        )}
      </div>

      {/* Floating +XP gain indicator */}
      <AnimatePresence>
        {showXpGain && xpDelta > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.7 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0, y: -48 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute right-2 top-2 rounded-full border border-cyan-400/50 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300 shadow-lg"
          >
            +{xpDelta} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-up celebration overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/3 z-50 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{
                rotate: [0, -3, 3, -3, 0],
                scale: [1, 1.05, 1, 1.05, 1],
              }}
              transition={{ duration: 1.6, repeat: 1 }}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-purple-500/60 bg-gradient-to-br from-purple-900/90 via-bg-elevated/95 to-cyan-900/80 px-12 py-8 shadow-2xl backdrop-blur-md"
            >
              <Sparkles size={40} className="text-gold drop-shadow-glow" />
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-[0.3em] text-purple-300">
                  Level Up!
                </div>
                <div className="mt-1 text-4xl font-black text-text">
                  Lvl{" "}
                  <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {stats.level}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  Next milestone: Lvl {stats.level + 1} ·{" "}
                  {stats.xpForNextLevel.toLocaleString("hr-HR")} XP
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
