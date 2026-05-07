"use client";

import { motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { formatEuro } from "@/lib/format";
import type { HQStats } from "@/lib/queries";

interface ResourceBarProps {
  stats: HQStats;
  user: {
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function ResourceBar({ stats, user }: ResourceBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = Math.min((stats.mrrCents / stats.goalTargetCents) * 100, 100);

  const tiles = [
    {
      label: "MRR",
      value: formatEuro(stats.mrrCents, { compact: true }),
      delta:
        stats.monthlyDeltaCents > 0
          ? `+${formatEuro(stats.monthlyDeltaCents)} ovaj mj`
          : `${stats.activeClients} klijenata`,
      emoji: "💰",
    },
    {
      label: "Active",
      value: stats.activeClients.toString(),
      delta:
        stats.newClientsThisMonth > 0
          ? `+${stats.newClientsThisMonth} ovaj mj`
          : "klijenata",
      emoji: "👥",
    },
    {
      label: "Leads",
      value: stats.totalLeads.toString(),
      delta: `Hot: ${stats.hotLeads}`,
      emoji: "📥",
    },
    {
      label: "Content",
      value: stats.contentPostsThisMonth.toString(),
      delta: "posts ovaj mj",
      emoji: "📊",
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-strong bg-bg-elevated/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold">
            <span className="text-lg font-bold">L</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-text">
              LAMON <span className="text-gold">HQ</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Agency Operations
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-2 lg:gap-3">
          {tiles.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex min-w-[140px] flex-1 items-center gap-3 rounded-lg border border-border bg-bg-card/60 px-3 py-2"
              data-resource-tile={s.label.toLowerCase()}
            >
              <span className="text-xl">{s.emoji}</span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  {s.label}
                </div>
                <div className="text-base font-semibold text-text">
                  {s.value}
                </div>
                {s.delta && (
                  <div className="text-[10px] text-text-dim">{s.delta}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex min-w-[200px] flex-col gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider">
            <span className="text-text-muted">Goal · 30K€/mj</span>
            <span className="text-gold font-semibold">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright"
            />
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-card text-text-dim transition-colors hover:border-gold/50 hover:text-text"
            aria-label="Account menu"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.fullName ?? user.email ?? ""}
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-12 w-56 rounded-lg border border-border bg-bg-elevated p-1 shadow-xl"
            >
              <div className="border-b border-border px-3 py-2 text-xs">
                <div className="font-medium text-text">
                  {user.fullName ?? "Logged in"}
                </div>
                <div className="text-text-muted">{user.email}</div>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-dim transition-colors hover:bg-bg-card hover:text-text"
                >
                  <LogOut size={14} />
                  Odjava
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
