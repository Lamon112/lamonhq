"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function MoneyFly({ trigger }: { trigger: number }) {
  const [flights, setFlights] = useState<
    { id: number; target: { x: number; y: number } | null }[]
  >([]);

  useEffect(() => {
    if (trigger === 0) return;
    const tile = document.querySelector(
      "[data-resource-tile=\"mrr\"]",
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
    }, 1800);
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
              scale: 0.5,
            }}
            animate={
              f.target
                ? {
                    left: f.target.x,
                    top: f.target.y,
                    x: "-50%",
                    y: "-50%",
                    opacity: [0, 1, 1, 0],
                    scale: [0.5, 1.4, 1.1, 0.6],
                    rotate: [0, -8, 8, 0],
                  }
                : {
                    top: 60,
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.6],
                  }
            }
            transition={{ duration: 1.6, ease: "easeInOut" }}
            className="absolute"
            style={{ position: "absolute" }}
          >
            <div className="flex items-center gap-1 rounded-full border-2 border-gold bg-gold/30 px-3 py-1 backdrop-blur shadow-[0_0_24px_rgba(201,168,76,0.55)]">
              <span className="text-2xl">💰</span>
              <span className="text-base font-bold text-gold-bright">+€</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
