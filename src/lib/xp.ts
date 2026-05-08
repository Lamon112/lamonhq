/**
 * XP & level system for Lamon HQ.
 *
 * Cumulative XP required to reach level N: 50 * N * (N+1)
 *   Lvl 2  = 100
 *   Lvl 3  = 300
 *   Lvl 5  = 1000
 *   Lvl 10 = 5500
 *   Lvl 20 = 21000
 */

export const XP_REWARDS: Record<string, number> = {
  outreach_sent: 5,
  lead_scored: 15,
  discovery_booked: 50,
  calendly_booking_created: 50,
  calendly_booking_canceled: 0,
  client_added: 200,
  deal_won: 1000,
  report_sent: 30,
  task_done: 10,
};

export function xpForAction(action: string): number {
  return XP_REWARDS[action] ?? 0;
}

/**
 * Cumulative XP required to *reach* the start of `level`.
 * cumulativeXpForLevel(1) = 0
 * cumulativeXpForLevel(2) = 100
 * cumulativeXpForLevel(3) = 300
 */
export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 50 * n * (n + 1);
}

/**
 * Returns the current level for a given total XP.
 * Lvl 1 = 0 XP
 * Lvl 2 = 100+ XP
 * Lvl 3 = 300+ XP
 */
export function levelFromXp(totalXp: number): number {
  if (totalXp < 100) return 1;
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= totalXp) level++;
  return level;
}

export interface XpStats {
  totalXp: number;
  level: number;
  xpInLevel: number; // XP earned within current level
  xpForNextLevel: number; // XP gap to next level
  progressPct: number; // 0-100 fill for the bar
  recentXp24h: number;
}

export function computeXpStats(totalXp: number, recentXp24h: number): XpStats {
  const level = levelFromXp(totalXp);
  const start = cumulativeXpForLevel(level);
  const next = cumulativeXpForLevel(level + 1);
  const xpInLevel = totalXp - start;
  const xpForNextLevel = next - start;
  const progressPct = Math.min(100, Math.round((xpInLevel / xpForNextLevel) * 100));
  return {
    totalXp,
    level,
    xpInLevel,
    xpForNextLevel,
    progressPct,
    recentXp24h,
  };
}
