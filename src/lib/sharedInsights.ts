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
 *
 * Council/strategic insights (Mentat war room, anything action_type
 * containing "council" or tagged "strategy") get a dedicated section
 * up top — those are first-class drivers for daily planning, not
 * background. Other insights stay as "context awareness".
 */
export async function renderInsightsForPrompt(
  limit = 10,
): Promise<string> {
  const insights = await getRecentInsights(limit);
  if (insights.length === 0) return "";

  const isCouncil = (i: SharedInsight) =>
    i.room === "mentat" ||
    i.action_type.toLowerCase().includes("council") ||
    (i.tags ?? []).some((t) => /strateg|council/i.test(t));

  /*
   * Auditor edit patterns — captured every time Leonardo saves a hand-
   * tuned change to an AI-generated draft. These are FIRST-CLASS
   * prescriptive context: "user already corrected this exact pattern
   * once, do it that way next time". They get a dedicated prompt
   * section so the LLM treats them as commands, not background.
   */
  const isEditPattern = (i: SharedInsight) =>
    i.room === "auditor" &&
    i.action_type === "leonardo.edit_pattern";

  const council = insights.filter(isCouncil);
  const editPatterns = insights.filter(isEditPattern);
  const others = insights.filter((i) => !isCouncil(i) && !isEditPattern(i));

  const fmt = (i: SharedInsight) => {
    const date = new Date(i.completed_at).toISOString().slice(0, 10);
    const tags = (i.tags ?? []).slice(0, 3).join(", ");
    return `- [${date}] **${i.title}** (${i.room}${tags ? ` · ${tags}` : ""}): ${i.summary}`;
  };

  const fmtEdit = (i: SharedInsight) => {
    const tags = (i.tags ?? [])
      .filter((t) => t !== "learned-edit")
      .slice(0, 2)
      .join(", ");
    return `- ${i.summary}${tags ? ` _(${tags})_` : ""}`;
  };

  const sections: string[] = [];

  if (council.length > 0) {
    sections.push(
      `## 🎯 STRATEGIC DECISIONS — AI Council recommendations Leonardo has already heard\n\nThese are Council/strategic outputs Leonardo paid for. They MUST shape today's plan — when you propose actions, prefer ones that execute on these recommendations over generic best-practice. Reference the recommendation directly in the "why" field when relevant.\n\n${council.map(fmt).join("\n")}`,
    );
  }

  if (editPatterns.length > 0) {
    sections.push(
      `## 📚 LEONARDOVI EDIT PATTERNS — primjeni AUTOMATSKI u svaki draft\n\nLeonardo je već ručno ispravio ove fraze u prošlim draftovima. Apliciraj ISTA pravila u svakom novom draftu. Ovo nisu sugestije — to su prescriptive corrections koje je on napravio, ako ne prijaniš na njih on će ponovo morati editirati.\n\n${editPatterns.map(fmtEdit).join("\n")}`,
    );
  }

  if (others.length > 0) {
    sections.push(
      `## SHARED KNOWLEDGE — sibling-agent research context\n\nFrom other vault rooms (visible in Notion → 🧠 Knowledge Insights). Use as context. Don't cite unprompted unless directly relevant.\n\n${others.map(fmt).join("\n")}`,
    );
  }

  return `\n\n${sections.join("\n\n")}\n`;
}
