/**
 * Inngest function: agent.research
 *
 * Runs an AI research action triggered by clicking a vault room. This
 * lives outside Vercel's 60s serverless timeout so it can take 2-5min
 * on a long Anthropic web_search loop.
 *
 * Flow:
 *   1. Look up the agent_actions row by id
 *   2. Mark status='running' + started_at
 *   3. Stream Anthropic Sonnet 4.6 with web_search tool (max 5 calls)
 *   4. After each significant event, update progress_text in Postgres
 *      → Supabase Realtime broadcasts to the UI animation layer
 *   5. On completion: parse summary + tags + sources from output, push
 *      to Notion DB, mark status='completed'
 *   6. On failure: mark status='failed' + error_text
 */

import Anthropic from "@anthropic-ai/sdk";
import { renderInsightsForPrompt } from "@/lib/sharedInsights";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getActionById } from "@/lib/agentActions";
import { pushInsightToNotion } from "@/lib/notion";
import { computeCost, extractAnthropicUsage } from "@/lib/cost";
import { debitAiActionCost } from "@/lib/cashLedger";

interface ResearchEventData {
  actionRowId: string; // uuid in agent_actions table
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env not set (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const agentResearch = inngest.createFunction(
  {
    id: "agent-research",
    name: "Agent Research (long-running)",
    // Allow up to 8 minutes. Anthropic web_search loops typically finish
    // in 2-5 min; this gives headroom for slow sources without runaway.
    retries: 1,
    triggers: [{ event: "agent/research.requested" }],
  },
  async ({ event, step }) => {
    const { actionRowId } = event.data as ResearchEventData;
    const supabase = getServiceSupabase();

    // ---------------- Step 1: load action row + def ----------------
    const row = await step.run("load-action-row", async () => {
      const { data, error } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("id", actionRowId)
        .single();
      if (error || !data) {
        throw new Error(`agent_actions row ${actionRowId} not found: ${error?.message}`);
      }
      return data as {
        id: string;
        room: string;
        action_type: string;
        title: string;
        prompt: string;
        created_at: string;
        started_at: string | null;
      };
    });

    const def = getActionById(row.action_type);
    if (!def || def.kind !== "research" || !def.systemPrompt || !def.prompt) {
      await markFailed(
        supabase,
        actionRowId,
        `Bad research action def: ${row.action_type}`,
      );
      return { ok: false, reason: "bad-def" };
    }
    // Capture into locals so TS narrowing survives across step.run boundaries
    const baseSystemPrompt: string = def.systemPrompt;
    const baseUserPrompt: string = def.prompt;
    const notionLabel = def.notionLabel;

    // ---------------- Enrich prompt with live DB context ----------------
    // Every research run gets the shared-knowledge block (so Council
    // recommendations etc. flow through). Specific actions (Comms brief)
    // additionally get the next-meeting block with the real lead data so
    // the agent stops generating generic playbooks.
    const sharedKnowledge = await renderInsightsForPrompt(10);
    let extraUserContext = "";
    if (row.action_type === "comms.meeting_brief") {
      extraUserContext = await buildNextMeetingContext(supabase);
    }
    const systemPrompt = baseSystemPrompt + sharedKnowledge;
    const userPrompt = extraUserContext
      ? `${extraUserContext}\n\n---\n\n${baseUserPrompt}`
      : baseUserPrompt;

    // ---------------- Step 2: mark running ----------------
    await step.run("mark-running", async () => {
      await supabase
        .from("agent_actions")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          progress_text: "Pripremam upit i otvaram pretraživače…",
        })
        .eq("id", actionRowId);
    });

    // ---------------- Step 3: Anthropic stream with web_search ----------------
    const result = await step.run("anthropic-research", async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
      const anthropic = new Anthropic({ apiKey });

      // Progress writer — debounced so we don't hammer the DB
      let lastWriteTs = 0;
      let pendingText: string | null = null;
      const writeProgress = async (text: string, force = false) => {
        pendingText = text;
        const now = Date.now();
        if (!force && now - lastWriteTs < 600) return;
        lastWriteTs = now;
        const toWrite = pendingText;
        pendingText = null;
        await supabase
          .from("agent_actions")
          .update({ progress_text: toWrite })
          .eq("id", actionRowId);
      };

      let collectedText = "";
      let searchCallCount = 0;
      const sources: Array<{ title: string; url: string }> = [];
      let usage: Record<string, unknown> = {};

      // Anthropic SDK exposes streaming via .messages.stream which returns
      // an async iterator of MessageStreamEvent.
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
      });

      for await (const ev of stream) {
        if (ev.type === "content_block_start") {
          const block = ev.content_block as { type: string; name?: string };
          if (block.type === "server_tool_use" && block.name === "web_search") {
            searchCallCount += 1;
            await writeProgress(`Pretražujem internet (call ${searchCallCount}/5)…`);
          } else if (block.type === "web_search_tool_result") {
            await writeProgress(`Čitam izvore iz pretrage ${searchCallCount}…`);
          } else if (block.type === "text") {
            await writeProgress("Sintetiziram odgovor…");
          }
        } else if (ev.type === "content_block_delta") {
          const delta = ev.delta as {
            type: string;
            text?: string;
            partial_json?: string;
          };
          if (delta.type === "text_delta" && delta.text) {
            collectedText += delta.text;
            // Throttled "thinking…" pulse
            await writeProgress("Sintetiziram odgovor…");
          } else if (delta.type === "input_json_delta" && delta.partial_json) {
            // Try to surface the actual search query as it streams
            const m = delta.partial_json.match(/"query"\s*:\s*"([^"]{2,80})/);
            if (m) await writeProgress(`Tražim: ${m[1]}…`);
          }
        } else if (ev.type === "message_delta") {
          const u = (ev as unknown as { usage?: Record<string, unknown> }).usage;
          if (u) usage = { ...usage, ...u };
        }
      }

      // Final message with all blocks (text + server_tool_use + web_search_tool_result)
      const final = await stream.finalMessage();
      if (final.usage) usage = { ...usage, ...final.usage };

      // Extract source URLs from web_search_tool_result blocks
      for (const block of final.content) {
        const b = block as unknown as Record<string, unknown>;
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const item of b.content as Array<Record<string, unknown>>) {
            if (item.type === "web_search_result") {
              const url = item.url as string | undefined;
              const title = (item.title as string | undefined) ?? url ?? "(untitled)";
              if (url && !sources.find((s) => s.url === url)) {
                sources.push({ title, url });
              }
            }
          }
        }
      }

      await writeProgress("Spremam u Notion…", true);
      return { text: collectedText, sources, usage };
    });

    // ---------------- Step 4: parse summary + tags + compute cost ----------------
    const parsed = parseAgentOutput(result.text);
    const usageInputs = extractAnthropicUsage(result.usage);
    const cost = computeCost(usageInputs);
    const startedTs = new Date(row.started_at ?? row.created_at).getTime();
    const durationSec = Math.max(0, (Date.now() - startedTs) / 1000);

    // ---------------- Step 5: push to Notion ----------------
    const notionResult = await step.run("push-to-notion", async () => {
      const token = process.env.NOTION_API_KEY;
      if (!token) {
        return { ok: false, error: "NOTION_API_KEY not set" };
      }
      return pushInsightToNotion(token, {
        room: row.room,
        actionType: notionLabel,
        title: row.title,
        summary: parsed.summary,
        resultMd: result.text,
        tags: parsed.tags,
        sources: result.sources,
        costEur: cost.cost_eur,
        durationSec,
        searchCalls: cost.web_search_calls ?? 0,
      });
    });

    // ---------------- Step 6: mark completed ----------------
    await step.run("mark-completed", async () => {
      await supabase
        .from("agent_actions")
        .update({
          status: "completed",
          progress_text: "Gotovo ✓",
          result_md: result.text,
          summary: parsed.summary,
          sources: result.sources,
          tags: parsed.tags,
          notion_page_id: notionResult.ok ? notionResult.pageId : null,
          usage: { ...result.usage, ...cost },
          completed_at: new Date().toISOString(),
        })
        .eq("id", actionRowId);
    });

    // ---------------- Step 7: debit cash ledger ----------------
    await step.run("debit-cash-ledger", async () => {
      return debitAiActionCost({
        actionRowId,
        room: row.room,
        title: row.title,
        costEur: cost.cost_eur,
        meta: { search_calls: cost.web_search_calls ?? 0, duration_sec: durationSec },
      });
    });

    return {
      ok: true,
      actionRowId,
      sources: result.sources.length,
      notionPushed: notionResult.ok,
    };
  },
);

/**
 * Build a structured "## NEXT MEETING" block for the Comms brief agent
 * by reading the soonest upcoming discovery from the leads table.
 * Falls back to "no upcoming meeting" so the agent knows to write a
 * generic playbook instead of inventing a fictional meeting.
 */
async function buildNextMeetingContext(
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<string> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, name, niche, stage, icp_score, discovery_at, discovery_notes, notes, website_url, holmes_report",
    )
    .gte("discovery_at", nowIso)
    .order("discovery_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return [
      "## NEXT MEETING",
      "U bazi nema nadolazeći discovery / sastanak (leads.discovery_at >= now je prazno).",
      "Daj generic playbook za 'premium dentalna klinika Zagreb, vlasnik = doktor, prvi cold call' — Leonardo nema rezerviran konkretni sastanak.",
    ].join("\n");
  }

  type HolmesReport = {
    owner?: { name?: string; title?: string; bio?: string };
    channels?: { website?: string; instagram_personal?: string; phone?: string; email?: string };
    pitch_tier?: string;
    recommended_package?: string;
    recommended_contact?: { name?: string; channel?: string; why?: string };
    best_angle?: { summary?: string; opening_hook?: string; avoid?: string[] };
    personal_angles?: { interests?: string[]; pain_points?: string[]; values?: string[] };
    team?: { size_estimate?: string; structure_note?: string };
  };
  const r = (data.holmes_report ?? null) as HolmesReport | null;

  const lines: string[] = ["## NEXT MEETING — STVARNI SASTANAK U LEONARDOVOM KALENDARU"];
  lines.push("");
  lines.push(`**Klinika:** ${data.name}`);
  lines.push(
    `**Termin:** ${new Date(data.discovery_at as string).toLocaleString("hr-HR", { dateStyle: "full", timeStyle: "short" })}`,
  );
  if (data.website_url) lines.push(`**Web:** ${data.website_url}`);
  if (data.icp_score != null) lines.push(`**ICP score:** ${data.icp_score}/20`);
  if (data.stage) lines.push(`**Stage:** ${data.stage}`);
  if (data.niche) lines.push(`**Niche:** ${data.niche}`);
  if (data.discovery_notes) lines.push(`**Bilješke za poziv:** ${data.discovery_notes}`);
  if (data.notes) lines.push(`**Općenito:** ${String(data.notes).slice(0, 600)}`);

  if (r) {
    lines.push("");
    lines.push("### Holmes dossier");
    if (r.owner?.name) {
      lines.push(`- **Vlasnik:** ${r.owner.name}${r.owner.title ? ` (${r.owner.title})` : ""}`);
      if (r.owner.bio) lines.push(`  - ${r.owner.bio}`);
    }
    if (r.pitch_tier) lines.push(`- **Pitch tier:** ${r.pitch_tier}`);
    if (r.recommended_package) lines.push(`- **Preporučeni paket:** ${r.recommended_package}`);
    if (r.recommended_contact?.name) {
      lines.push(
        `- **Holmes preporuča kontakt:** ${r.recommended_contact.name}${r.recommended_contact.channel ? ` (${r.recommended_contact.channel})` : ""}${r.recommended_contact.why ? ` — ${r.recommended_contact.why}` : ""}`,
      );
    }
    if (r.best_angle?.summary) lines.push(`- **Best angle:** ${r.best_angle.summary}`);
    if (r.best_angle?.opening_hook) lines.push(`- **Opening hook:** "${r.best_angle.opening_hook}"`);
    if (r.best_angle?.avoid?.length) lines.push(`- **Izbjegavaj:** ${r.best_angle.avoid.join(" · ")}`);
    if (r.personal_angles?.pain_points?.length)
      lines.push(`- **Pain points:** ${r.personal_angles.pain_points.slice(0, 4).join(" · ")}`);
    if (r.personal_angles?.interests?.length)
      lines.push(`- **Interesi:** ${r.personal_angles.interests.slice(0, 4).join(" · ")}`);
    if (r.team?.size_estimate)
      lines.push(`- **Veličina tima:** ${r.team.size_estimate}${r.team.structure_note ? ` — ${r.team.structure_note}` : ""}`);
    if (r.channels?.website) lines.push(`- **Web (Holmes):** ${r.channels.website}`);
    if (r.channels?.instagram_personal) lines.push(`- **IG vlasnika:** ${r.channels.instagram_personal}`);
    if (r.channels?.phone) lines.push(`- **Telefon:** ${r.channels.phone}`);
    if (r.channels?.email) lines.push(`- **Email:** ${r.channels.email}`);
  } else {
    lines.push("");
    lines.push("### Holmes dossier");
    lines.push("- Holmes još nije istražio ovu kliniku — koristi public web znanje + ovo iznad.");
  }

  lines.push("");
  lines.push(
    "**VAŽNO:** Brief napiši ZA OVU SPECIFIČNU KLINIKU I OSOBU. Imenuj vlasnika u opening hook-u, koristi recommended package iz Holmes dossiera, referenciraj njegov pain point. NIJE generic playbook — Leonardo zna tko je, želi pripremu na njega točno.",
  );
  return lines.join("\n");
}

async function markFailed(
  supabase: ReturnType<typeof getServiceSupabase>,
  actionRowId: string,
  errorText: string,
) {
  await supabase
    .from("agent_actions")
    .update({
      status: "failed",
      progress_text: null,
      error_text: errorText,
      completed_at: new Date().toISOString(),
    })
    .eq("id", actionRowId);
}

/**
 * Parse Claude's structured output: extract TL;DR as summary and TAGS:
 * line at the bottom for tags. Falls back gracefully if format drifts.
 */
function parseAgentOutput(text: string): { summary: string; tags: string[] } {
  // Summary = first paragraph after "## TL;DR" up to next "##"
  let summary = "";
  const tldrMatch = text.match(/##\s*TL;DR\s*\n([\s\S]+?)(?=\n##|\n*$)/i);
  if (tldrMatch) {
    summary = tldrMatch[1].trim().slice(0, 600);
  } else {
    // Fallback: first 2 paragraphs
    summary = text.split(/\n\n/).slice(0, 2).join(" ").trim().slice(0, 600);
  }

  // Tags = "TAGS: a, b, c" line at end
  const tagsMatch = text.match(/^\s*TAGS:\s*(.+)$/im);
  const tags = tagsMatch
    ? tagsMatch[1]
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => /^[a-z]+$/.test(t))
        .slice(0, 5)
    : [];

  return { summary, tags };
}
