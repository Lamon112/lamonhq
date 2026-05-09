/**
 * Shared agent memory layer.
 *
 * Every other AI agent (Holmes, briefing, follow-ups, inbox triage…)
 * gets the latest 10 insights from completed agent_actions injected
 * into its system prompt so that knowledge generated in one room
 * (e.g. Nova found a new outreach hack) is automatically available
 * to all the others.
 *
 * Read-only — uses Supabase service role since this runs server-side
 * (server actions, Inngest functions, cron handlers).
 */

import { createClient } from "@supabase/supabase-js";

interface SharedInsight {
  id: string;
  room: string;
  action_type: string;
  title: string;
  summary: string;
  tags: string[];
  completed_at: string;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Fetch latest N completed insights to inject into agent system prompts.
 * Silently returns [] if the env isn't set or the query fails — never
 * throws (we don't want to break agent runs over a memory layer outage).
 */
export async function getRecentInsights(
  limit = 10,
): Promise<SharedInsight[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("shared_insights")
      .select("id, room, action_type, title, summary, tags, completed_at")
      .limit(limit);
    if (error || !data) return [];
    return data as SharedInsight[];
  } catch {
    return [];
  }
}

/**
 * Render insights as a compact markdown block ready to paste into a
 * system prompt. Skips entirely (returns "") when there are none, so
 * agents that ran before any research happened don't get junk context.
 */
export async function renderInsightsForPrompt(
  limit = 10,
): Promise<string> {
  const insights = await getRecentInsights(limit);
  if (insights.length === 0) return "";

  const lines = insights.map((i) => {
    const date = new Date(i.completed_at).toISOString().slice(0, 10);
    const tags = (i.tags ?? []).slice(0, 3).join(", ");
    return `- [${date}] **${i.title}** (${i.room}${tags ? ` · ${tags}` : ""}): ${i.summary}`;
  });

  return `\n\n## SHARED KNOWLEDGE — what your sibling agents recently discovered\n\nThe following insights came from other vault rooms' AI research (visible in Notion → 🧠 Knowledge Insights). Use them as context when relevant. Do NOT cite them unprompted — they're background awareness.\n\n${lines.join("\n")}\n`;
}
