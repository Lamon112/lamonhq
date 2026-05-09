"use server";

/**
 * Server action: trigger an AI research action from a vault room click.
 *
 * Flow:
 *   1. Look up the action definition by id (e.g. "nova.deep_biz_improvement")
 *   2. Insert a new agent_actions row with status='queued' + the rendered prompt
 *   3. Send Inngest event "agent/research.requested" to kick off background job
 *   4. Return the row id so the UI can subscribe to Realtime updates
 *
 * The actual long-running Anthropic+web_search work happens in the Inngest
 * function (src/lib/inngest/functions/agentResearch.ts) which can run for
 * minutes outside Vercel's 60s timeout.
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";
import { getActionById } from "@/lib/agentActions";
import type { AgentId } from "@/lib/vault";

interface TriggerResult {
  ok: boolean;
  actionRowId?: string;
  error?: string;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env not set (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function triggerAgentResearch(
  actionId: string,
): Promise<TriggerResult> {
  const def = getActionById(actionId);
  if (!def) {
    return { ok: false, error: `Unknown action: ${actionId}` };
  }

  const supabase = getServiceSupabase();

  // For pipeline actions there's no Claude prompt — record the
  // pipelineConfig (or title fallback) so the column's NOT NULL
  // constraint is satisfied without polluting the schema.
  const promptValue =
    def.prompt ??
    (def.pipelineConfig
      ? `[pipeline] ${def.title}\n${JSON.stringify(def.pipelineConfig, null, 2)}`
      : `[pipeline] ${def.title}`);

  // Insert queued row
  const { data, error } = await supabase
    .from("agent_actions")
    .insert({
      room: def.room,
      action_type: def.id,
      title: def.title,
      prompt: promptValue,
      status: "queued",
      progress_text: "U redu čekanja…",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Insert agent_actions row failed",
    };
  }

  // Dispatch background job. Event name depends on action kind:
  //   "research" → agent/research.requested (single Claude+web_search)
  //   "pipeline" → agent/{id}.requested (multi-step orchestration)
  // Data-view actions never reach this code path — UI handles them.
  const eventName =
    def.kind === "pipeline"
      ? `agent/${def.id.split(".")[0]}-pipeline.requested` // e.g. "agent/holmes-pipeline.requested"
      : "agent/research.requested";
  try {
    await inngest.send({
      name: eventName,
      data: { actionRowId: data.id },
    });
  } catch (e) {
    // If event dispatch fails (e.g. INNGEST_EVENT_KEY missing in prod),
    // we leave the row queued — it's recoverable but visible as stuck.
    return {
      ok: false,
      actionRowId: data.id,
      error: `Inngest dispatch failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }

  return { ok: true, actionRowId: data.id };
}

/**
 * Read latest 20 actions for a given room (used by the UI when opening
 * the action console — shows past results + active jobs).
 */
export async function listRoomActions(room: AgentId, limit = 20) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("agent_actions")
    .select(
      "id, action_type, title, status, progress_text, summary, tags, notion_page_id, created_at, completed_at",
    )
    .eq("room", room)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false as const, error: error.message, rows: [] };
  }
  return { ok: true as const, rows: data ?? [] };
}

/**
 * Fetch a single action row (used by the result drawer when an action
 * completes).
 */
export async function getAction(actionRowId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", actionRowId)
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "not found" };
  }
  return { ok: true as const, row: data };
}
