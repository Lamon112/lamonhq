/**
 * Inngest cron: every 15 min — scans triggers and spawns raids.
 *
 * Six trigger paths, each independently rolled. Service-role Supabase
 * client (Inngest runs outside an authenticated session). Raids are
 * inserted directly so we don't depend on a Next.js server action.
 *
 * Triggers (per archetype):
 *   counter_scout   — for each agent_actions row completed in last 15min
 *                     by Holmes/Nova, 30% chance to spawn one targeting
 *                     that room. Idempotent via dedupe key on action id.
 *   churn_wraith    — every 6h: pick a random active client, low-chance
 *                     spawn (15%). Skip if a churn_wraith for that client
 *                     is already active.
 *   vendor_swarm    — every 12h: 25% chance roll. (Real implementation
 *                     would query inbox; for now simulated cadence.)
 *   bad_review      — every 24h: 10% chance roll.
 *   outage_beast    — every 6h: 5% chance roll. (Real impl would ping
 *                     /api/health on Vapi/Supabase.)
 *   gdpr_probe      — once per month: 5% chance per scan after day 25.
 *
 * Idempotency:
 *   Each archetype has a "no duplicate active" guard — if there's already
 *   an incoming raid of that type, we skip rather than stack them. (Except
 *   counter_scout which is per-action-id keyed via context.)
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { RAID_ARCHETYPES, type RaidType } from "@/lib/raids";

interface RaidArchetypeWithCtx {
  type: RaidType;
  context: Record<string, unknown>;
  targetRoom?: string;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getOwnerUserId(
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<string | null> {
  const ledger = await supabase
    .from("cash_ledger")
    .select("user_id")
    .limit(1)
    .maybeSingle();
  if (ledger.data?.user_id) return ledger.data.user_id as string;
  const leads = await supabase
    .from("leads")
    .select("user_id")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  return (leads.data?.user_id as string | null) ?? null;
}

async function hasActiveRaid(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  type: RaidType,
  contextMatch?: Record<string, unknown>,
): Promise<boolean> {
  const { data } = await supabase
    .from("raids")
    .select("id, context")
    .eq("user_id", userId)
    .eq("raid_type", type)
    .eq("status", "incoming");
  if (!data || data.length === 0) return false;
  if (!contextMatch) return true;
  // Match if any active raid has the same context keys
  return data.some((r) => {
    const ctx = (r.context ?? {}) as Record<string, unknown>;
    return Object.entries(contextMatch).every(([k, v]) => ctx[k] === v);
  });
}

async function insertRaid(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  spec: RaidArchetypeWithCtx,
): Promise<string | null> {
  const arche = RAID_ARCHETYPES[spec.type];
  const expiresAt = new Date(Date.now() + arche.ttlMinutes * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("raids")
    .insert({
      user_id: userId,
      raid_type: spec.type,
      severity: arche.severity,
      scope: "b2b",
      target_room: spec.targetRoom ?? arche.targetRoom,
      context: spec.context,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) return null;

  await supabase.from("activity_log").insert({
    user_id: userId,
    room: spec.targetRoom ?? arche.targetRoom,
    action: "raid_incoming",
    metadata: {
      raid_id: data.id,
      raid_type: spec.type,
      severity: arche.severity,
      title: arche.title,
      emoji: arche.emoji,
      source: "raid-scanner",
    },
  });

  return data.id;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const raidScanner = inngest.createFunction(
  {
    id: "raid-scanner",
    name: "Raid scanner (Fallout-Shelter threats)",
    triggers: [{ cron: "TZ=Europe/Zagreb */15 * * * *" }],
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();
    const userId = await getOwnerUserId(supabase);
    if (!userId) return { ok: false, reason: "no owner user" };
    const spawned: { type: RaidType; raidId: string }[] = [];

    // ============================================================
    // 1. COUNTER_SCOUT — for each Holmes/Nova action completed in
    //    last 15 min, 30% chance to spawn a counter-raid keyed by
    //    the action id so we never double-spawn.
    // ============================================================
    await step.run("counter-scout-roll", async () => {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("agent_actions")
        .select("id, room, title")
        .in("room", ["holmes", "nova"])
        .eq("status", "completed")
        .gte("completed_at", since);
      if (!recent || recent.length === 0) return;
      for (const a of recent) {
        const dup = await hasActiveRaid(supabase, userId, "counter_scout", {
          source_action_id: a.id,
        });
        if (dup) continue;
        if (Math.random() < 0.3) {
          const id = await insertRaid(supabase, userId, {
            type: "counter_scout",
            targetRoom: a.room as string,
            context: {
              source_action_id: a.id,
              competitor_name: extractCompetitorFromTitle(a.title as string),
            },
          });
          if (id) spawned.push({ type: "counter_scout", raidId: id });
        }
      }
    });

    // ============================================================
    // 2. CHURN_WRAITH — every 6h, scan a random active client.
    //    Cron runs every 15min so gate to "first-of-6h-window" by
    //    checking last spawn time.
    // ============================================================
    await step.run("churn-wraith-roll", async () => {
      const sinceStr = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("raids")
        .select("id")
        .eq("raid_type", "churn_wraith")
        .gte("spawned_at", sinceStr)
        .limit(1);
      if (recent && recent.length > 0) return; // already rolled in last 6h

      // Pick a random client from leads with stage=closed_won
      const { data: clients } = await supabase
        .from("leads")
        .select("id, name")
        .eq("stage", "closed_won")
        .limit(20);
      if (!clients || clients.length === 0) return;
      if (Math.random() < 0.15) {
        const target = pick(clients);
        const dup = await hasActiveRaid(supabase, userId, "churn_wraith", {
          client_id: target.id,
        });
        if (dup) return;
        const id = await insertRaid(supabase, userId, {
          type: "churn_wraith",
          context: {
            client_id: target.id,
            client_name: target.name,
            churn_score: 70 + Math.floor(Math.random() * 25),
          },
        });
        if (id) spawned.push({ type: "churn_wraith", raidId: id });
      }
    });

    // ============================================================
    // 3. VENDOR_SWARM — every 12h, 25% chance.
    // ============================================================
    await step.run("vendor-swarm-roll", async () => {
      const sinceStr = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("raids")
        .select("id")
        .eq("raid_type", "vendor_swarm")
        .gte("spawned_at", sinceStr)
        .limit(1);
      if (recent && recent.length > 0) return;
      const dup = await hasActiveRaid(supabase, userId, "vendor_swarm");
      if (dup) return;
      if (Math.random() < 0.25) {
        const id = await insertRaid(supabase, userId, {
          type: "vendor_swarm",
          context: { count: 3 + Math.floor(Math.random() * 3) },
        });
        if (id) spawned.push({ type: "vendor_swarm", raidId: id });
      }
    });

    // ============================================================
    // 4. BAD_REVIEW — every 24h, 10% chance.
    // ============================================================
    await step.run("bad-review-roll", async () => {
      const sinceStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("raids")
        .select("id")
        .eq("raid_type", "bad_review")
        .gte("spawned_at", sinceStr)
        .limit(1);
      if (recent && recent.length > 0) return;
      const dup = await hasActiveRaid(supabase, userId, "bad_review");
      if (dup) return;
      if (Math.random() < 0.1) {
        const id = await insertRaid(supabase, userId, {
          type: "bad_review",
          context: { platform: pick(["Google Maps", "Facebook", "Zocdoc"]) },
        });
        if (id) spawned.push({ type: "bad_review", raidId: id });
      }
    });

    // ============================================================
    // 5. OUTAGE_BEAST — every 6h, 5% chance.
    // ============================================================
    await step.run("outage-beast-roll", async () => {
      const sinceStr = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("raids")
        .select("id")
        .eq("raid_type", "outage_beast")
        .gte("spawned_at", sinceStr)
        .limit(1);
      if (recent && recent.length > 0) return;
      const dup = await hasActiveRaid(supabase, userId, "outage_beast");
      if (dup) return;
      if (Math.random() < 0.05) {
        const id = await insertRaid(supabase, userId, {
          type: "outage_beast",
          context: { service: pick(["Vapi", "Supabase", "ElevenLabs"]) },
        });
        if (id) spawned.push({ type: "outage_beast", raidId: id });
      }
    });

    // ============================================================
    // 6. GDPR_PROBE — only after day 25 of month, 5% chance/scan.
    // ============================================================
    await step.run("gdpr-probe-roll", async () => {
      const day = new Date().getDate();
      if (day < 25) return;
      const sinceStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("raids")
        .select("id")
        .eq("raid_type", "gdpr_probe")
        .gte("spawned_at", sinceStr)
        .limit(1);
      if (recent && recent.length > 0) return;
      if (Math.random() < 0.05) {
        const id = await insertRaid(supabase, userId, {
          type: "gdpr_probe",
          context: { agency: "AZOP" },
        });
        if (id) spawned.push({ type: "gdpr_probe", raidId: id });
      }
    });

    // Auto-expire any incoming raids past their TTL
    const expiredCount = await step.run("expire-overdue", async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("raids")
        .update({ status: "expired", outcome: "ignored" })
        .eq("status", "incoming")
        .lt("expires_at", nowIso)
        .select("id, target_room, raid_type, user_id");
      if (!data) return 0;
      for (const r of data) {
        await supabase.from("activity_log").insert({
          user_id: r.user_id,
          room: r.target_room,
          action: "raid_expired",
          metadata: { raid_id: r.id, raid_type: r.raid_type },
        });
      }
      return data.length;
    });

    return {
      ok: true,
      spawnedCount: spawned.length,
      spawned,
      expiredCount,
    };
  },
);

function extractCompetitorFromTitle(title: string): string {
  // Title is something like "Lead Recon: Apex Dental Centar". Just
  // take the part after the colon if present, else the whole title.
  const idx = title.indexOf(":");
  return idx >= 0 ? title.slice(idx + 1).trim() : title;
}
