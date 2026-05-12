/**
 * Helper for wiring long-running server actions to the `agent_actions`
 * table so the Vault UI's Realtime subscription (Vault.tsx → RoomAiWorking
 * overlay) shows the room "in working mood" while the action runs.
 *
 * Why this exists:
 *   - Vault.tsx subscribes to `agent_actions` Realtime updates and pushes
 *     a pulsing amber overlay onto whichever room is currently `running`.
 *   - Holmes "10 leads" pipeline uses Inngest (no timeout), which writes
 *     to agent_actions on its own.
 *   - But other in-line server actions (bulk Holmes investigate, bulk
 *     outreach draft refresh, etc.) didn't write progress anywhere → no
 *     UI signal that work was happening.
 *
 * This helper makes adding progress tracking trivial:
 *
 *   const tracker = await beginAgentAction({
 *     room: "comms",
 *     actionType: "comms.refresh_outreach_drafts",
 *     title: "Osvježi sve drafts (Brend · 09)",
 *   });
 *   try {
 *     await tracker.progress("Loading leads…");
 *     // … do work, call tracker.progress(...) as you go …
 *     await tracker.complete({ refreshed: 5, skipped: 1 });
 *   } catch (e) {
 *     await tracker.fail(e.message);
 *     throw e;
 *   }
 *
 * The progress writer debounces writes to 600ms so a 200-iteration loop
 * doesn't hammer the DB. force=true bypasses the debounce.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AgentActionTracker {
  /** UUID of the inserted agent_actions row. */
  rowId: string;
  /** Update progress_text (debounced ~600ms unless force=true). */
  progress: (text: string, force?: boolean) => Promise<void>;
  /** Mark status="completed" with optional summary object. */
  complete: (summary?: Record<string, unknown>) => Promise<void>;
  /** Mark status="failed" with error text. */
  fail: (errorText: string) => Promise<void>;
}

interface BeginAgentActionInput {
  supabase: SupabaseClient;
  /** Which vault room to highlight. Must match an AgentId from lib/vault.ts */
  room: string;
  /** Stable action_type identifier (e.g. "comms.refresh_outreach_drafts"). */
  actionType: string;
  /** Short human title shown in the action drawer / Telegram push. */
  title: string;
  /** Initial progress text shown immediately on insert. */
  initialProgress?: string;
  /** Free-form prompt/context field (DB column is NOT NULL). */
  prompt?: string;
}

export async function beginAgentAction(
  input: BeginAgentActionInput,
): Promise<AgentActionTracker> {
  const {
    supabase,
    room,
    actionType,
    title,
    initialProgress = "Pokrećem…",
    prompt = `[inline-action] ${title}`,
  } = input;

  // Insert the row in "running" state so Vault overlay fires immediately
  // (no queued→running transition needed for inline actions).
  const { data, error } = await supabase
    .from("agent_actions")
    .insert({
      room,
      action_type: actionType,
      title,
      prompt,
      status: "running",
      progress_text: initialProgress,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    // No-op tracker if we can't insert — caller's logic still runs, but
    // there's no Vault overlay. Better than crashing the whole action.
    console.warn(
      `[agentActionProgress] could not insert agent_actions row:`,
      error?.message,
    );
    return {
      rowId: "",
      progress: async () => {},
      complete: async () => {},
      fail: async () => {},
    };
  }

  const rowId = data.id as string;
  let lastWrite = Date.now();

  return {
    rowId,
    async progress(text: string, force = false) {
      const now = Date.now();
      if (!force && now - lastWrite < 600) return;
      lastWrite = now;
      await supabase
        .from("agent_actions")
        .update({ progress_text: text.slice(0, 500) })
        .eq("id", rowId);
    },
    async complete(summary?: Record<string, unknown>) {
      await supabase
        .from("agent_actions")
        .update({
          status: "completed",
          progress_text: "Gotovo.",
          summary: summary ? JSON.stringify(summary) : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", rowId);
    },
    async fail(errorText: string) {
      await supabase
        .from("agent_actions")
        .update({
          status: "failed",
          progress_text: `Greška: ${errorText}`.slice(0, 500),
          error_text: errorText.slice(0, 2000),
          completed_at: new Date().toISOString(),
        })
        .eq("id", rowId);
    },
  };
}
