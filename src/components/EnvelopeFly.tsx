"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function EnvelopeFly({ trigger }: { trigger: number }) {
  const [flights, setFlights] = useState<{ id: number; target: { x: number; y: number } | null }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    // Find Leads tile in DOM
    const tile = document.querySelector(
      "[data-resource-tile=\"leads\"]",
    ) as HTMLElement | null;
    let target: { x: number; y: number } | null = null;
    if (tile) {
      const rect = tile.getBoundingClientRect();
      target = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    setFlights((prev) => [...prev, { id: trigger, target }]);
    const t = setTimeout(() => {
      setFlights((prev) => prev.filter((f) => f.id !== trigger));
    }, 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <AnimatePresence>
        {flights.map((f) => (
          <motion.div
            key={f.id}
            initial={{
              left: "50%",
              top: "50%",
              x: "-50%",
              y: "-50%",
              opacity: 0,
              scale: 0.6,
              rotate: -10,
            }}
            animate={
              f.target
                ? {
                    left: f.target.x,
                    top: f.target.y,
                    x: "-50%",
                    y: "-50%",
                    opacity: [0, 1, 1, 0],
                    scale: [0.6, 1.1, 1, 0.4],
                    rotate: [0, -10, 8, 0],
                  }
                : {
                    top: 60,
                    opacity: [0, 1, 0],
                    scale: [0.6, 1, 0.5],
                  }
            }
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute"
            style={{ position: "absolute" }}
          >
            <svg width="36" height="28" viewBox="0 0 36 28" aria-hidden>
              <defs>
                <linearGradient id="env-gold" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#E0BF5E" />
                  <stop offset="100%" stopColor="#8B7530" />
                </linearGradient>
              </defs>
              <rect
                x="1"
                y="3"
                width="34"
                height="22"
                rx="3"
                fill="url(#env-gold)"
                stroke="#0A0A0A"
                strokeWidth="1.5"
              />
              <path
                d="M2 5 L18 17 L34 5"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
