"use client";

import { motion } from "framer-motion";
import { Plus, Send, Pencil, Sparkles } from "lucide-react";

interface Action {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  variant: "primary" | "ghost";
}

const ACTIONS: Action[] = [
  { label: "Add Lead", icon: Plus, variant: "primary" },
  { label: "Send Outreach", icon: Send, variant: "ghost" },
  { label: "Manual Entry", icon: Pencil, variant: "ghost" },
  { label: "Quick Note", icon: Sparkles, variant: "ghost" },
];

export function ActionBar() {
  return (
    <footer className="sticky bottom-0 z-30 border-t border-border-strong bg-bg-elevated/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 lg:px-8">
        {ACTIONS.map((a, i) => {
          const Icon = a.icon;
          const isPrimary = a.variant === "primary";
          return (
            <motion.button
              key={a.label}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className={
                "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
                (isPrimary
                  ? "bg-gold text-bg hover:bg-gold-bright"
                  : "border border-border bg-bg-card text-text-dim hover:border-gold/50 hover:text-text")
              }
            >
              <Icon size={16} />
              <span>{a.label}</span>
            </motion.button>
          );
        })}
        <div className="ml-auto hidden text-[10px] uppercase tracking-wider text-text-muted sm:block">
          Phase 1 · MVP
        </div>
      </div>
    </footer>
  );
}
