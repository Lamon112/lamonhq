"use client";

/**
 * Yellow paint droplet that follows the cursor — adds wet/shine premium
 * feel without being noisy.
 *
 * - Disabled on touch devices (no cursor to follow).
 * - Disabled on visitors who prefer reduced motion.
 * - Uses spring physics for soft trailing (not 1:1 with cursor).
 * - GPU-accelerated transform-only updates, no layout thrash.
 */

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function PaintCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 180, damping: 22, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 180, damping: 22, mass: 0.5 });
  const enabled = useRef(false);

  useEffect(() => {
    // Touch + reduced-motion users skip entirely
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (isTouch || reducedMotion) return;

    enabled.current = true;
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (typeof window !== "undefined" && !enabled.current) {
    // SSR-safe — return null on touch/reduced (after mount the ref is set,
    // but the listener is already registered or skipped)
  }

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 md:block"
      style={{ x: springX, y: springY }}
    >
      <div className="relative h-full w-full">
        {/* Outer soft glow */}
        <div className="absolute inset-[-6px] rounded-full bg-yellow-400/30 blur-md" />
        {/* Core droplet */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg shadow-yellow-500/40" />
        {/* Highlight shine */}
        <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/70 blur-[1px]" />
      </div>
    </motion.div>
  );
}
