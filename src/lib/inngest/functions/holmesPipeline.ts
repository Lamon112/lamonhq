/**
 * Inngest function: agent.holmes-pipeline
 *
 * One-click "10 leads end-to-end" — Leonardo clicks Holmes room → fires
 * this. Output: 10 fresh premium clinic leads in his pipeline, each with
 * a full Holmes recon dossier (vlasnik + tim + social depth + 5 channel
 * drafts). Plus a master Notion brief mirroring everything.
 *
 * Pipeline stages (progress streamed to UI via Realtime):
 *   1. Places search "premium dentalna klinika Zagreb" (10 results)
 *   2. Apollo enrich each (free tier — org + top people)
 *   3. Save 10 candidates to leads table (status='prospecting')
 *   4. For each lead: run runAgentHolmes (sequential, ~30-60s each)
 *   5. Compile master Notion page with all 10 dossiers
 *   6. Mark agent_actions row completed + summary
 *
 * Wall-clock budget: 5-12 min depending on Anthropic load.
 * Cost budget: ~$2.50 per click (~$0.25 × 10 Holmes runs).
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getActionById } from "@/lib/agentActions";
import { searchText, type PlaceResult } from "@/lib/places";
import { enrichOrganization } from "@/lib/apollo";
import { runAgentHolmes } from "@/lib/agentHolmes";
import { pushInsightToNotion } from "@/lib/notion";
import { computeCost, type UsageInputs } from "@/lib/cost";
import { debitAiActionCost } from "@/lib/cashLedger";

interface PipelineEventData {
  actionRowId: string;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getApolloKey(
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "apollo")
    .maybeSingle();
  const cfg = (data?.config ?? {}) as { api_key?: string };
  return cfg.api_key ?? null;
}

export const holmesPipeline = inngest.createFunction(
  {
    id: "holmes-pipeline",
    name: "Holmes 10-Leads Pipeline (long-running)",
    retries: 1,
    triggers: [{ event: "agent/holmes-pipeline.requested" }],
  },
  async ({ event, step }) => {
    const { actionRowId } = event.data as PipelineEventData;
    const supabase = getServiceSupabase();

    // ------- Step 1: load row + def -------
    const row = await step.run("load-action-row", async () => {
      const { data, error } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("id", actionRowId)
        .single();
      if (error || !data) {
        throw new Error(`agent_actions ${actionRowId} not found: ${error?.message}`);
      }
      return data as {
        id: string;
        room: string;
        action_type: string;
        title: string;
      };
    });

    const def = getActionById(row.action_type);
    if (!def || def.kind !== "pipeline") {
      await markFailed(supabase, actionRowId, `Bad action def: ${row.action_type}`);
      return { ok: false, reason: "bad-def" };
    }
    const cfg = (def.pipelineConfig ?? {}) as {
      niche?: string;
      location?: string;
      count?: number;
      regionCode?: string;
    };

    // ------- Progress writer (debounced) -------
    let lastWrite = 0;
    async function setProgress(text: string, force = false) {
      const now = Date.now();
      if (!force && now - lastWrite < 600) return;
      lastWrite = now;
      await supabase
        .from("agent_actions")
        .update({ progress_text: text })
        .eq("id", actionRowId);
    }

    // ------- Step 2: mark running -------
    await step.run("mark-running", async () => {
      await supabase
        .from("agent_actions")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          progress_text: `Pretražujem ${cfg.niche} u ${cfg.location}…`,
        })
        .eq("id", actionRowId);
    });

    // ------- Step 3: Places search -------
    const places: PlaceResult[] = await step.run("places-search", async () => {
      const placesKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) throw new Error("GOOGLE_PLACES_API_KEY not set");
      const res = await searchText({
        apiKey: placesKey,
        textQuery: `${cfg.niche} ${cfg.location}`,
        regionCode: cfg.regionCode ?? "hr",
        maxResultCount: cfg.count ?? 10,
      });
      if (!res.ok || !res.places) {
        throw new Error(`Places: ${res.error ?? "unknown"}`);
      }
      return res.places;
    });

    await setProgress(`Pronašao ${places.length} klinika. Enrichaj kroz Apollo…`, true);

    // ------- Step 4: Apollo enrich each (free tier) -------
    type Enriched = PlaceResult & {
      apolloOrg?: { id?: string; industry?: string; estimated_num_employees?: number };
    };
    const enriched: Enriched[] = await step.run("apollo-enrich", async () => {
      const apolloKey = await getApolloKey(supabase);
      if (!apolloKey) return places; // skip apollo if no key
      const out: Enriched[] = [];
      for (const p of places) {
        if (!p.domain) {
          out.push(p);
          continue;
        }
        try {
          const er = await enrichOrganization({ apiKey: apolloKey, domain: p.domain });
          out.push({
            ...p,
            apolloOrg: er.ok && er.org ? {
              id: er.org.id,
              industry: er.org.industry,
              estimated_num_employees: er.org.estimated_num_employees,
            } : undefined,
          });
        } catch {
          out.push(p);
        }
      }
      return out;
    });

    await setProgress("Spremam u pipeline…", true);

    // ------- Step 5: Insert all into leads table -------
    // leads schema (migration 0001 + later): id, user_id (NOT NULL FK to
    // auth.users), name, niche (CHECK in stomatologija/estetska/fizio/
    // ortopedija/coach/other), stage (CHECK in discovery/pricing/
    // financing/booking/closed_won/closed_lost), icp_score (0-20), notes,
    // website_url (added in 0013).
    const leadIds = await step.run("insert-leads", async () => {
      const ownerUserId = await getOwnerUserId(supabase);
      if (!ownerUserId) {
        throw new Error(
          "No owner user found in leads table — cannot insert (FK requires valid user_id)",
        );
      }
      const ids: Array<{ id: string; name: string; website_url: string | null }> = [];
      const nicheEnum = mapNicheToEnum(cfg.niche);
      for (const e of enriched) {
        const notes = [
          e.formattedAddress,
          e.websiteUri,
          e.internationalPhoneNumber,
          e.apolloOrg?.industry,
          e.apolloOrg?.estimated_num_employees
            ? `~${e.apolloOrg.estimated_num_employees} employees`
            : null,
          e.rating ? `⭐${e.rating} (${e.userRatingCount} reviews)` : null,
          `Pipeline source: Holmes 1-click (${cfg.niche} ${cfg.location})`,
        ]
          .filter(Boolean)
          .join("\n");
        const { data, error } = await supabase
          .from("leads")
          .insert({
            user_id: ownerUserId,
            name: e.name,
            niche: nicheEnum,
            stage: "discovery",
            icp_score: 0,
            notes,
            website_url: e.websiteUri ?? null,
          })
          .select("id, name, website_url")
          .single();
        if (!error && data) {
          ids.push(data as { id: string; name: string; website_url: string | null });
        }
      }
      return ids;
    });

    // ------- Step 6: Run Holmes recon for each lead (sequential) -------
    type Dossier = {
      leadId: string;
      leadName: string;
      ok: boolean;
      report?: unknown;
      error?: string;
    };
    const dossiers: Dossier[] = [];
    for (let i = 0; i < leadIds.length; i++) {
      const lead = leadIds[i];
      await setProgress(
        `Holmes recon ${i + 1}/${leadIds.length}: ${lead.name}…`,
        true,
      );
      const result = await step.run(`holmes-recon-${i}`, async () => {
        try {
          const r = await runAgentHolmes({
            leadName: lead.name,
            niche: cfg.niche ?? null,
            hintCity: cfg.location ?? null,
            websiteUrl: lead.website_url,
          });
          if (r.ok && r.report) {
            await supabase
              .from("leads")
              .update({ holmes_report: r.report })
              .eq("id", lead.id);
          }
          return {
            leadId: lead.id,
            leadName: lead.name,
            ok: r.ok,
            report: r.report,
            error: r.error,
          };
        } catch (e) {
          return {
            leadId: lead.id,
            leadName: lead.name,
            ok: false,
            error: e instanceof Error ? e.message : "recon exception",
          };
        }
      });
      dossiers.push(result as Dossier);
    }

    await setProgress("Sastavljam master brief…", true);

    // ------- Step 7: Compute estimated cost -------
    // Per-lead Holmes recon = ~50K input + 5K output Anthropic tokens.
    // Plus Places (1 call) + Apollo (per enriched lead).
    const reconCount = dossiers.filter((d) => d.ok).length;
    const estimatedUsage: UsageInputs = {
      input_tokens: reconCount * 50_000,
      output_tokens: reconCount * 5_000,
      apollo_calls: enriched.filter((e) => e.apolloOrg).length,
      places_calls: 1,
    };
    const cost = computeCost(estimatedUsage);
    const startedTs = new Date(
      (row as { started_at?: string; created_at?: string }).started_at ??
        (row as { created_at?: string }).created_at ??
        new Date().toISOString(),
    ).getTime();
    const durationSec = Math.max(0, (Date.now() - startedTs) / 1000);

    // ------- Step 8: Compile master Notion brief -------
    const brief = compileMasterBrief(cfg, dossiers);
    const notionResult = await step.run("push-to-notion", async () => {
      const token = process.env.NOTION_API_KEY;
      if (!token) return { ok: false, error: "NOTION_API_KEY not set" };
      return pushInsightToNotion(token, {
        room: row.room,
        actionType: def.notionLabel,
        title: `${dossiers.length} novih leadova — ${cfg.niche} ${cfg.location} (${todayStamp()})`,
        summary: brief.summary,
        resultMd: brief.markdown,
        tags: ["sales", "opportunity", "competitor"],
        sources: brief.sources,
        costEur: cost.cost_eur,
        durationSec,
        searchCalls: 0, // Holmes uses DDG (free) not Anthropic web_search
      });
    });

    // ------- Step 9: Mark completed + record lead IDs in usage -------
    await step.run("mark-completed", async () => {
      await supabase
        .from("agent_actions")
        .update({
          status: "completed",
          progress_text: "Gotovo ✓",
          result_md: brief.markdown,
          summary: brief.summary,
          tags: ["sales", "opportunity", "competitor"],
          sources: brief.sources,
          notion_page_id: notionResult.ok ? notionResult.pageId : null,
          usage: { ...cost, lead_ids: leadIds.map((l) => l.id) },
          completed_at: new Date().toISOString(),
        })
        .eq("id", actionRowId);
    });

    // ------- Step 10: debit cash ledger -------
    await step.run("debit-cash-ledger", async () => {
      return debitAiActionCost({
        actionRowId,
        room: row.room,
        title: `${row.title} (${reconCount} leadova)`,
        costEur: cost.cost_eur,
        meta: {
          places_calls: 1,
          apollo_calls: cost.apollo_calls ?? 0,
          recon_count: reconCount,
        },
      });
    });

    return {
      ok: true,
      actionRowId,
      placesFound: places.length,
      leadsAdded: leadIds.length,
      reconCompleted: dossiers.filter((d) => d.ok).length,
      reconFailed: dossiers.filter((d) => !d.ok).length,
      notionPushed: notionResult.ok,
    };
  },
);

async function markFailed(
  supabase: ReturnType<typeof getServiceSupabase>,
  actionRowId: string,
  errorText: string,
) {
  await supabase
    .from("agent_actions")
    .update({
      status: "failed",
      error_text: errorText,
      completed_at: new Date().toISOString(),
    })
    .eq("id", actionRowId);
}

async function getOwnerUserId(
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<string | null> {
  // Lamon HQ is single-user — Leonardo. Steal user_id from any existing
  // lead row (we know there are 33+ leads from prior outreach work).
  try {
    const { data } = await supabase
      .from("leads")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    return (data?.user_id as string | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Map a free-text niche from the action config to one of the leads.niche
 * CHECK-constraint values: stomatologija/estetska/fizio/ortopedija/coach/other.
 */
function mapNicheToEnum(niche?: string): string {
  const n = (niche ?? "").toLowerCase();
  if (n.includes("stoma") || n.includes("dent")) return "stomatologija";
  if (n.includes("eseta") || n.includes("plastic") || n.includes("derma"))
    return "estetska";
  if (n.includes("fizio") || n.includes("physio")) return "fizio";
  if (n.includes("ortop") || n.includes("ortho")) return "ortopedija";
  if (n.includes("coach")) return "coach";
  return "other";
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

interface CompiledBrief {
  summary: string;
  markdown: string;
  sources: Array<{ title: string; url: string }>;
}
type DossierForBrief = {
  leadId: string;
  leadName: string;
  ok: boolean;
  report?: unknown;
  error?: string;
};
function compileMasterBrief(
  cfg: { niche?: string; location?: string },
  dossiers: DossierForBrief[],
): CompiledBrief {
  const ok = dossiers.filter((d) => d.ok);
  const failed = dossiers.filter((d) => !d.ok);

  const sources: Array<{ title: string; url: string }> = [];
  const sections: string[] = [];

  for (const d of ok) {
    const r = d.report as
      | {
          owner?: { name?: string; title?: string };
          channels?: { website?: string; linkedin_personal?: string; instagram_personal?: string; email?: string };
          best_angle?: { summary?: string; opening_hook?: string };
          pitch_tier?: string;
          recommended_package?: string;
          recommended_contact?: { name?: string; channel?: string; reasoning?: string };
          channel_drafts?: Record<string, string>;
        }
      | undefined;
    const owner = r?.owner;
    const ch = r?.channels;
    const ba = r?.best_angle;
    const tier = r?.pitch_tier;
    const pkg = r?.recommended_package;
    const rec = r?.recommended_contact;
    const drafts = r?.channel_drafts ?? {};

    if (ch?.website) sources.push({ title: d.leadName, url: ch.website });

    sections.push(
      [
        `### ${d.leadName}` + (tier ? ` · _${tier}_` : "") + (pkg ? ` → ${pkg}` : ""),
        owner?.name
          ? `**Vlasnik:** ${owner.name}${owner.title ? ` · ${owner.title}` : ""}`
          : null,
        ch?.website ? `**Web:** ${ch.website}` : null,
        ch?.linkedin_personal ? `**LinkedIn:** ${ch.linkedin_personal}` : null,
        ch?.instagram_personal ? `**Instagram:** ${ch.instagram_personal}` : null,
        ch?.email ? `**Email:** ${ch.email}` : null,
        rec?.name
          ? `**Najbolji kontakt:** ${rec.name} (${rec.channel ?? "?"}) — ${rec.reasoning ?? ""}`
          : null,
        ba?.summary ? `**Best angle:** ${ba.summary}` : null,
        ba?.opening_hook ? `**Hook:** _${ba.opening_hook}_` : null,
        Object.keys(drafts).length > 0
          ? `\n**Channel drafts:**\n` +
            Object.entries(drafts)
              .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
              .map(([k, v]) => `\n— *${k}:*\n\n${v}`)
              .join("\n")
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (failed.length > 0) {
    sections.push(
      `### ⚠ Nije uspjelo (${failed.length})\n` +
        failed.map((d) => `- ${d.leadName}: ${d.error ?? "?"}`).join("\n"),
    );
  }

  const summary = `Holmes 1-click: ${ok.length}/${dossiers.length} ${cfg.niche} u ${cfg.location} obrađeno do kraja (vlasnik + tim + best angle + 5 channel drafts po klinici).${failed.length > 0 ? ` ${failed.length} preskočeno.` : ""}`;

  const markdown = [
    `## TL;DR`,
    summary,
    ``,
    `## Pipeline (${dossiers.length} leadova)`,
    ...sections,
    ``,
    `## Sources`,
    ...sources.map((s) => `- ${s.title} — ${s.url}`),
    ``,
    `TAGS: sales, opportunity, competitor`,
  ].join("\n\n");

  return { summary, markdown, sources };
}
