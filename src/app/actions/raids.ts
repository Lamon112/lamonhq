"use server";

/**
 * Raids server actions — spawn, list, defend, expire.
 *
 * Used by:
 *   - <RaidIncomingBadge />   reads listActiveRaids() per room
 *   - <RaidDefenseModal />    fires defendRaid() when player picks a choice
 *   - dev "Spawn test raid"   button calls spawnRandomRaid()
 *   - Inngest raidScanner     uses helpers below via service-role
 *
 * Side-effects on a WIN/LOSE:
 *   1. Update raids row (status='resolved', outcome, defended_at, detail)
 *   2. Insert into activity_log so the feed tells the story
 *   3. Apply cash via cash_ledger if defense had cashOnWin/cashOnLose
 *   4. If raid was critical → push Telegram via Jarvis
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appendCashTxn } from "@/lib/cashLedger";
import { pushTelegramNotification } from "@/app/actions/telegram";
import { triggerAgentResearch } from "@/app/actions/agentResearch";
import {
  RAID_TYPES_LIST,
  raidArchetype,
  rollDefense,
  type RaidType,
  type RaidScope,
} from "@/lib/raids";

// =====================================================================
// Types
// =====================================================================

export interface ActiveRaid {
  id: string;
  raid_type: RaidType;
  severity: "low" | "medium" | "high" | "critical";
  scope: RaidScope;
  target_room: string;
  context: Record<string, unknown>;
  spawned_at: string;
  expires_at: string;
}

interface OkResult<T = unknown> {
  ok: true;
  data?: T;
}
interface ErrResult {
  ok: false;
  error: string;
}
type Result<T = unknown> = OkResult<T> | ErrResult;

// =====================================================================
// Read
// =====================================================================

export async function listActiveRaids(): Promise<ActiveRaid[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("raids")
    .select("id, raid_type, severity, scope, target_room, context, spawned_at, expires_at")
    .eq("status", "incoming")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: true });
  if (error || !data) return [];
  return data as ActiveRaid[];
}

export async function getRaid(raidId: string): Promise<ActiveRaid | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("raids")
    .select("id, raid_type, severity, scope, target_room, context, spawned_at, expires_at")
    .eq("id", raidId)
    .maybeSingle();
  return (data as ActiveRaid | null) ?? null;
}

// =====================================================================
// Spawn
// =====================================================================

async function resolveOwnerUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user?.id) return userData.user.id;
  // Fallback: single-user app — pick from any existing row.
  // Check tables most likely to have rows: integrations (Telegram wired)
  // first, then leads, then cash_ledger, then profiles.
  const integ = await supabase
    .from("integrations")
    .select("user_id")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (integ.data?.user_id) return integ.data.user_id as string;
  const lead = await supabase
    .from("leads")
    .select("user_id")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (lead.data?.user_id) return lead.data.user_id as string;
  const ledger = await supabase
    .from("cash_ledger")
    .select("user_id")
    .limit(1)
    .maybeSingle();
  if (ledger.data?.user_id) return ledger.data.user_id as string;
  const profile = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();
  return (profile.data?.id as string | null) ?? null;
}

export async function spawnRaid(
  type: RaidType,
  opts: {
    scope?: RaidScope;
    context?: Record<string, unknown>;
    /** Override target room (default: archetype.targetRoom) */
    targetRoom?: string;
    /** Override TTL minutes (default: archetype.ttlMinutes) */
    ttlMinutes?: number;
  } = {},
): Promise<Result<{ raidId: string }>> {
  const arche = raidArchetype(type);
  if (!arche) return { ok: false, error: `Unknown raid type: ${type}` };

  const supabase = await createClient();
  const userId = await resolveOwnerUserId(supabase);
  if (!userId) return { ok: false, error: "no owner user found" };

  const ttl = opts.ttlMinutes ?? arche.ttlMinutes;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("raids")
    .insert({
      user_id: userId,
      raid_type: type,
      severity: arche.severity,
      scope: opts.scope ?? "b2b",
      target_room: opts.targetRoom ?? arche.targetRoom,
      context: opts.context ?? {},
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "insert failed" };

  await supabase.from("activity_log").insert({
    user_id: userId,
    room: opts.targetRoom ?? arche.targetRoom,
    action: "raid_incoming",
    metadata: {
      raid_id: data.id,
      raid_type: type,
      severity: arche.severity,
      title: arche.title,
      emoji: arche.emoji,
    },
  });

  if (arche.severity === "critical") {
    await pushTelegramNotification(
      "inbound",
      `🚨 *RAID INCOMING — ${arche.emoji} ${arche.title}*\n\n${arche.story(opts.context ?? {})}\n\n_TTL: ${ttl} min_\n— Jarvis`,
      userId,
    );
  }

  revalidatePath("/");
  return { ok: true, data: { raidId: data.id } };
}

/** Dev / test button — spawns a random archetype with seeded context. */
export async function spawnRandomRaid(): Promise<Result<{ raidId: string }>> {
  const type = RAID_TYPES_LIST[Math.floor(Math.random() * RAID_TYPES_LIST.length)];
  const ctx = sampleContext(type);
  return spawnRaid(type, { context: ctx });
}

function sampleContext(type: RaidType): Record<string, unknown> {
  switch (type) {
    case "counter_scout":
      return { competitor_name: pick(["Bolutions", "Studio Smile Adriatic", "DentalFly Hub"]) };
    case "churn_wraith":
      return {
        client_name: pick(["Apex Dental Centar", "Klinika Smile+", "Stomatološka ordinacija Marković"]),
        churn_score: 70 + Math.floor(Math.random() * 25),
      };
    case "vendor_swarm":
      return { count: 3 + Math.floor(Math.random() * 3) };
    case "bad_review":
      return { platform: pick(["Google Maps", "Facebook", "Zocdoc"]) };
    case "outage_beast":
      return { service: pick(["Vapi", "Supabase", "ElevenLabs"]) };
    case "gdpr_probe":
      return { agency: "AZOP" };
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================================================
// Defend
// =====================================================================

export interface DefendRaidResultData {
  outcome: "won" | "lost";
  rewardLabel: string;
  penaltyLabel: string;
  xpDelta: number;
  cashDelta: number;
  /**
   * If the chosen defense had an `aiActionId`, this is the agent_actions
   * row id spawned in the background. UI surfaces it as "AI radi…" with
   * a link that opens the existing ResearchResultDrawer.
   */
  agentActionRowId?: string;
  /** Title of the spawned AI action (for the link label). */
  agentActionTitle?: string;
  /** Room that owns the AI action — UI uses this to light up the room
   *  optimistically without waiting for Inngest cold-start + first DB
   *  status update + Realtime broadcast (~10-20s on Vercel). */
  agentActionRoom?: string;
}

export async function defendRaid(
  raidId: string,
  defenseId: string,
): Promise<Result<DefendRaidResultData>> {
  const supabase = await createClient();
  const userId = await resolveOwnerUserId(supabase);
  if (!userId) return { ok: false, error: "no owner user found" };

  const { data: raid, error: fetchErr } = await supabase
    .from("raids")
    .select("id, raid_type, severity, scope, target_room, context, status, expires_at")
    .eq("id", raidId)
    .maybeSingle();
  if (fetchErr || !raid) return { ok: false, error: "raid not found" };
  if (raid.status !== "incoming") {
    return { ok: false, error: `raid already ${raid.status}` };
  }
  if (new Date(raid.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "raid expired" };
  }

  const arche = raidArchetype(raid.raid_type as RaidType);
  const defense = arche.defenses.find((d) => d.id === defenseId);
  if (!defense) return { ok: false, error: `unknown defense: ${defenseId}` };

  const won = rollDefense(defense.winChance);
  const outcome: "won" | "lost" = won ? "won" : "lost";

  // === If defense has an aiActionId, spawn agent_actions row + Inngest event ===
  // Tries triggerAgentResearch first (uses service-role client + Inngest);
  // if that fails (e.g. local dev w/o SUPABASE_SERVICE_ROLE_KEY), falls
  // back to inserting the row via the user-scoped client so the UI at
  // least gets a row id to surface in the drawer (Inngest skipped — the
  // row will sit at status='queued' until the user retries from the
  // drawer "re-run" button or env is configured).
  let agentActionRowId: string | undefined;
  let agentActionTitle: string | undefined;
  let agentActionRoom: string | undefined;
  if (defense.aiActionId) {
    const { getActionById } = await import("@/lib/agentActions");
    const def = getActionById(defense.aiActionId);
    agentActionTitle = def?.title;
    agentActionRoom = def?.room;
    try {
      const spawn = await triggerAgentResearch(defense.aiActionId);
      if (spawn.ok && spawn.actionRowId) {
        agentActionRowId = spawn.actionRowId;
      } else {
        throw new Error(spawn.error ?? "spawn failed");
      }
    } catch (e) {
      // Fallback: insert via user-scoped client (no Inngest dispatch)
      try {
        if (def) {
          const promptValue =
            def.prompt ??
            `[pipeline] ${def.title}\n${JSON.stringify(def.pipelineConfig ?? {}, null, 2)}`;
          const { data: row } = await supabase
            .from("agent_actions")
            .insert({
              room: def.room,
              action_type: def.id,
              title: def.title,
              prompt: promptValue,
              status: "queued",
              progress_text: "U redu čekanja… (lokalno: trigger Inngest ručno)",
            })
            .select("id")
            .single();
          if (row?.id) agentActionRowId = row.id as string;
        }
      } catch {
        // Last-resort: silently skip AI; raid outcome still applies
        console.error("[raids] both triggerAgentResearch + fallback insert failed:", e);
      }
    }
  }

  // Cash side-effects: defense cost is paid up-front regardless of outcome
  let cashDelta = 0;
  if (defense.costEur > 0) {
    cashDelta -= defense.costEur;
    await appendCashTxn({
      amountCents: -Math.round(defense.costEur * 100),
      category: "one_off_expense",
      label: `Raid defense (${arche.title}) — ${defense.label}`,
      sourceId: raidId,
      sourceTable: "raids",
      meta: { raid_type: raid.raid_type, defense_id: defenseId },
    });
  }
  // Bonus/penalty cash conditional on outcome
  const conditionalCash = won ? defense.cashOnWin ?? 0 : defense.cashOnLose ?? 0;
  if (conditionalCash !== 0) {
    cashDelta += conditionalCash;
    await appendCashTxn({
      amountCents: Math.round(conditionalCash * 100),
      category: conditionalCash > 0 ? "client_revenue" : "one_off_expense",
      label: `Raid ${outcome} (${arche.title}) — ${defense.label}`,
      sourceId: raidId,
      sourceTable: "raids",
      meta: { raid_type: raid.raid_type, defense_id: defenseId, outcome },
    });
  }

  const xpDelta = won ? defense.xpOnWin : 0;

  // Resolve raid row
  const outcomeDetail = {
    defense_id: defenseId,
    defense_label: defense.label,
    win_chance: defense.winChance,
    won,
    xp_delta: xpDelta,
    cash_delta: cashDelta,
    reward_label: defense.rewardLabel,
    penalty_label: defense.penaltyLabel,
  };
  const { error: updateErr } = await supabase
    .from("raids")
    .update({
      status: "resolved",
      outcome,
      defense_choice: defenseId,
      defended_at: new Date().toISOString(),
      outcome_detail: outcomeDetail,
    })
    .eq("id", raidId);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Activity feed entry — story-shaped
  await supabase.from("activity_log").insert({
    user_id: userId,
    room: raid.target_room,
    action: won ? "raid_defended" : "raid_failed",
    metadata: {
      raid_id: raidId,
      raid_type: raid.raid_type,
      title: arche.title,
      emoji: arche.emoji,
      defense_label: defense.label,
      outcome,
      reward_label: defense.rewardLabel,
      penalty_label: defense.penaltyLabel,
      xp_delta: xpDelta,
      cash_delta: cashDelta,
    },
  });

  if (raid.severity === "critical") {
    const icon = won ? "🛡 ODBIJEN" : "💥 PROBIJEN";
    await pushTelegramNotification(
      "inbound",
      `${icon} *${arche.emoji} ${arche.title}*\n\nObrana: _${defense.label}_\nIshod: ${won ? defense.rewardLabel : defense.penaltyLabel}\n\n— Jarvis`,
      userId,
    );
  }

  revalidatePath("/");
  return {
    ok: true,
    data: {
      outcome,
      rewardLabel: defense.rewardLabel,
      penaltyLabel: defense.penaltyLabel,
      xpDelta,
      cashDelta,
      agentActionRowId,
      agentActionTitle,
      agentActionRoom,
    },
  };
}

// =====================================================================
// Expire (called by cron + on-demand on read)
// =====================================================================

export async function expireOverdueRaids(): Promise<number> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("raids")
    .update({ status: "expired", outcome: "ignored" })
    .eq("status", "incoming")
    .lt("expires_at", nowIso)
    .select("id, target_room, raid_type, user_id");
  if (!data || data.length === 0) return 0;

  // Log each expired as an activity entry
  for (const r of data) {
    await supabase.from("activity_log").insert({
      user_id: r.user_id,
      room: r.target_room,
      action: "raid_expired",
      metadata: {
        raid_id: r.id,
        raid_type: r.raid_type,
      },
    });
  }
  return data.length;
}
