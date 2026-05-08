"use server";

import { createClient } from "@/lib/supabase/server";
import { computeXpStats, xpForAction, type XpStats } from "@/lib/xp";

export async function getXpStats(): Promise<XpStats> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return computeXpStats(0, 0);
  }

  const { data, error } = await supabase
    .from("activity_log")
    .select("action, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error || !data) return computeXpStats(0, 0);

  let totalXp = 0;
  let recentXp24h = 0;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  for (const row of data) {
    const xp = xpForAction(row.action);
    if (xp <= 0) continue;
    totalXp += xp;
    if (new Date(row.created_at).getTime() >= cutoff) {
      recentXp24h += xp;
    }
  }

  return computeXpStats(totalXp, recentXp24h);
}
