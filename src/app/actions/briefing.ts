"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { pushTelegramNotification } from "./telegram";
import { renderInsightsForPrompt } from "@/lib/sharedInsights";

export interface BriefingAction {
  title: string;
  why: string;
  room?: string;
  rowId?: string;
  done?: boolean;
}

export interface DailyBriefing {
  id: string;
  briefing_date: string;
  greeting: string | null;
  top_actions: BriefingAction[];
  context_summary: string | null;
  motivational_hook: string | null;
  generated_at: string;
}

const SYSTEM_PROMPT = `Ti si AI Chief of Staff za Leonardo Lamon, solo founder Lamon Agency. Cilj: 30K€/mj MRR za 6 mjeseci kroz B2B klinike (**Plima** paket s **Rivom** AI asistenticom, 1.997€ setup + 1.497€/mj) + B2C coacheve (Growth Operator, €1500/mj).

Tvoj zadatak: napisati JUTRO BRIEFING za danas. Leonardo otvara HQ uz kavu i mora u 30 sekundi znati ŠTO TOČNO RADITI DANAS.

# Pravila

1. **Top 5 akcija** (ni manje, ni više). Svaka mora biti:
   - **Konkretna** — "Pošalji LinkedIn DM za dr. Marka" NE "radi outreach"
   - **Action-oriented** — počinje glagolom (Pošalji, Pozovi, Pripremi, Follow-up)
   - **Reasoned** — 1 rečenica zašto BAŠ to BAŠ danas
2. **Prioritiziraj** po stage proximity to money:
   - Discovery danas/sutra → priprema = #1
   - Late-stage leadovi (financing, booking) silent N+ dana → follow-up = #2
   - Hot lead (score >15) bez touchpointa → outreach = #3
   - **Unscored leadovi** (total_leads > 0 ali svi imaju icp_score = 0) — **ICP scoring TIH** je #1 prioritet, ne tražiti nove. Bez ICP scora ne znaš kome treba slati prvo.
   - Volume outreach (cold) ako kvota još nije ispunjena = #4
   - Reports / admin = #5 ako ostane mjesta
3. **Ako u kontekstu vidiš total_leads > 0 ali hot_leads = 0** — ne reci "pipeline je prazan". Reci "imaš X unscored leadova, prvi korak je score-ati ih kroz Lead Scorer prije nego ideš dalje". Otvori Lead Scorer room ID-em "lead_scorer".
4. **Ne ponavljaj generičke akcije** ("Pošalji 20 outreacha"). Imenuj specifične leadove gdje god možeš (koristi names i row IDs iz konteksta).
5. **Greeting** — 1 rečenica, energična, kontekstualna (npr. spomeni progres, dan u tjednu, milestone).
6. **Context summary** — 2-3 rečenice trenutno stanje pipeline-a. Ako ima leadova (čak i unscored), uvijek ih spomeni (broj + niche ako je očito iz imena).
7. **Motivational hook** — 1 rečenica close-er. Ne corny ("You got this!"), nego specifičan na biznis ("Još 2 closea i Lvl 5.").

# Format izlaza — STRIKT JSON, ništa drugo:

{
  "greeting": "...",
  "context_summary": "...",
  "top_actions": [
    {"title": "Pošalji LinkedIn DM dr. Marko Marčelić Zagreb", "why": "Hot lead 16/20 ICP score, 3h od scoring-a, cold iron je vruće.", "room": "outreach", "rowId": "abc-uuid"},
    ...
  ],
  "motivational_hook": "..."
}

NE dodaj markdown code fence, NE objašnjenja, samo JSON.`;

interface HQContext {
  today: string;
  weekday: string;
  user_email: string;
  mrr_eur: number;
  active_clients: number;
  total_leads: number;
  hot_leads: number;
  weekly_outreach_sent: number;
  weekly_outreach_quota: number;
  upcoming_discoveries: Array<{
    name: string;
    when: string;
    leadId: string;
  }>;
  silent_leads: Array<{
    name: string;
    stage: string;
    last_touch_days: number;
    leadId: string;
    score?: number;
  }>;
  hot_unworked_leads: Array<{
    name: string;
    score: number;
    niche: string | null;
    leadId: string;
  }>;
  pending_tasks: Array<{ title: string; due: string | null; id: string }>;
  recent_wins: string[];
}

async function gatherContext(userId: string): Promise<HQContext> {
  const supabase = await createClient();
  const today = new Date();
  const weekday = today.toLocaleDateString("hr-HR", { weekday: "long" });
  const todayIso = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - (day - 1));
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const [
    { data: userData },
    { data: clients },
    { data: leads },
    { data: outreach },
    { data: discoveries },
    { data: tasks },
    { data: wins },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("clients")
      .select("monthly_revenue, status")
      .eq("status", "active"),
    supabase
      .from("leads")
      .select(
        "id, name, niche, stage, icp_score, discovery_at, next_action_date, last_touchpoint_at, created_at",
      )
      .order("icp_score", { ascending: false }),
    supabase
      .from("outreach")
      .select("id, lead_name, created_at")
      .gte("created_at", weekStartIso),
    supabase
      .from("leads")
      .select("id, name, discovery_at")
      .gte("discovery_at", todayIso)
      .lte(
        "discovery_at",
        new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      )
      .not("discovery_at", "is", null)
      .order("discovery_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, due_date, status")
      .neq("status", "done")
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("activity_log")
      .select("action, metadata, created_at")
      .in("action", ["deal_won", "client_added"])
      .gte(
        "created_at",
        new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .limit(5),
  ]);

  const mrr = (clients ?? []).reduce(
    (s, c) => s + (Number(c.monthly_revenue) || 0),
    0,
  );

  const hotLeads = (leads ?? []).filter(
    (l) =>
      (l.icp_score ?? 0) >= 14 &&
      l.stage !== "closed_won" &&
      l.stage !== "closed_lost",
  );
  const hotUnworked = hotLeads
    .filter((l) => {
      const created = new Date(l.created_at).getTime();
      const lastTouch = l.last_touchpoint_at
        ? new Date(l.last_touchpoint_at).getTime()
        : created;
      const daysSince = (Date.now() - lastTouch) / (24 * 3600 * 1000);
      return daysSince > 1;
    })
    .slice(0, 5);

  const silent = (leads ?? [])
    .filter(
      (l) =>
        ["pricing", "financing", "booking"].includes(l.stage as string) &&
        l.last_touchpoint_at &&
        (Date.now() - new Date(l.last_touchpoint_at).getTime()) /
          (24 * 3600 * 1000) >
          3,
    )
    .slice(0, 5);

  return {
    today: todayIso,
    weekday,
    user_email: userData.user?.email ?? "",
    mrr_eur: mrr,
    active_clients: clients?.length ?? 0,
    total_leads: leads?.length ?? 0,
    hot_leads: hotLeads.length,
    weekly_outreach_sent: outreach?.length ?? 0,
    weekly_outreach_quota: 25,
    upcoming_discoveries: (discoveries ?? []).map((d) => ({
      name: d.name as string,
      when: d.discovery_at as string,
      leadId: d.id as string,
    })),
    silent_leads: silent.map((l) => ({
      name: l.name as string,
      stage: l.stage as string,
      last_touch_days: Math.round(
        (Date.now() - new Date(l.last_touchpoint_at as string).getTime()) /
          (24 * 3600 * 1000),
      ),
      leadId: l.id as string,
      score: l.icp_score as number | undefined,
    })),
    hot_unworked_leads: hotUnworked.map((l) => ({
      name: l.name as string,
      score: l.icp_score as number,
      niche: l.niche as string | null,
      leadId: l.id as string,
    })),
    pending_tasks: (tasks ?? []).slice(0, 5).map((t) => ({
      title: t.title as string,
      due: (t.due_date as string | null) ?? null,
      id: t.id as string,
    })),
    recent_wins: (wins ?? []).map(
      (w) =>
        ((w.metadata as { title?: string })?.title as string) ?? w.action,
    ),
  };
}

interface ParsedBriefing {
  greeting: string;
  context_summary: string;
  top_actions: BriefingAction[];
  motivational_hook: string;
}

function parseBriefing(raw: string): ParsedBriefing | null {
  // strip code fences if any
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned) as ParsedBriefing;
    if (!Array.isArray(obj.top_actions)) return null;
    return obj;
  } catch {
    // try to find first { ... last } block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as ParsedBriefing;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateBriefing(): Promise<{
  ok: boolean;
  error?: string;
  briefing?: DailyBriefing;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const userId = userData.user.id;

  return generateBriefingForUser(userId, supabase);
}

async function generateBriefingForUser(
  userId: string,
  supabaseOpt?: Awaited<ReturnType<typeof createClient>>,
  opts: { force?: boolean } = {},
): Promise<{
  ok: boolean;
  error?: string;
  briefing?: DailyBriefing;
  skipped?: boolean;
}> {
  try {
    const supabase = supabaseOpt ?? (await createClient());

    // Idempotency: if today's briefing already exists AND has been pushed,
    // skip the entire generation + push to avoid Jarvis spam (multiple
    // cron retries / manual curls / page-load triggers).
    if (!opts.force) {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from("daily_briefings")
        .select(
          "id, briefing_date, greeting, top_actions, context_summary, motivational_hook, generated_at, pushed_to_telegram_at",
        )
        .eq("user_id", userId)
        .eq("briefing_date", todayIso)
        .maybeSingle();
      if (existing?.pushed_to_telegram_at) {
        return {
          ok: true,
          skipped: true,
          briefing: existing as DailyBriefing,
        };
      }
    }

    const ctx = await gatherContext(userId);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const userMessage = `# Današnji datum: ${ctx.today} (${ctx.weekday})\n\n# HQ kontekst (JSON):\n\n${JSON.stringify(ctx, null, 2)}\n\nNapiši mi briefing za danas po pravilima. STRIKT JSON output.`;

    const sharedKnowledge = await renderInsightsForPrompt(10);
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT + sharedKnowledge,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw =
      textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = parseBriefing(raw);
    if (!parsed) {
      return {
        ok: false,
        error: `AI je vratio nevalidan JSON: ${raw.slice(0, 200)}`,
      };
    }

    const todayIso = ctx.today;
    const { data: upserted, error } = await supabase
      .from("daily_briefings")
      .upsert(
        {
          user_id: userId,
          briefing_date: todayIso,
          greeting: parsed.greeting,
          top_actions: parsed.top_actions.map((a) => ({ ...a, done: false })),
          context_summary: parsed.context_summary,
          motivational_hook: parsed.motivational_hook,
          raw_payload: ctx,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,briefing_date" },
      )
      .select(
        "id, briefing_date, greeting, top_actions, context_summary, motivational_hook, generated_at",
      )
      .single();

    if (error) return { ok: false, error: error.message };

    // Push Jarvis briefing summary to Telegram exactly once per day.
    // pushTelegramNotification is no-op if Telegram not configured / disabled.
    try {
      const top = parsed.top_actions
        .slice(0, 5)
        .map((a, i) => `${i + 1}. ${a.title}`)
        .join("\n");
      const tgText = `🤵 *Dobro jutro, Leonardo.*\n☀️ Briefing za ${ctx.weekday} je spreman.\n\n${parsed.greeting}\n\n*Plan dana:*\n${top}\n\n💪 _${parsed.motivational_hook}_\n\nNa raspolaganju sam. _— Jarvis_\n\n[Otvori HQ](${process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app"})`;
      await pushTelegramNotification("briefing", tgText, userId);
      // Mark as pushed so future cron/manual runs short-circuit.
      await supabase
        .from("daily_briefings")
        .update({ pushed_to_telegram_at: new Date().toISOString() })
        .eq("id", upserted.id);
    } catch {
      /* never throw on push */
    }

    revalidatePath("/");
    return { ok: true, briefing: upserted as DailyBriefing };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Briefing error: ${e.message}`
          : "Briefing nepoznata greška",
    };
  }
}

export async function getTodaysBriefing(): Promise<DailyBriefing | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_briefings")
    .select(
      "id, briefing_date, greeting, top_actions, context_summary, motivational_hook, generated_at",
    )
    .eq("briefing_date", today)
    .maybeSingle();
  return (data as DailyBriefing | null) ?? null;
}

export async function toggleBriefingAction(
  briefingId: string,
  index: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_briefings")
    .select("top_actions")
    .eq("id", briefingId)
    .maybeSingle();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Briefing nije pronađen" };
  const actions = (data.top_actions as BriefingAction[]) ?? [];
  if (!actions[index]) return { ok: false, error: "Index van rangea" };
  actions[index] = { ...actions[index], done: !actions[index].done };
  const { error: updErr } = await supabase
    .from("daily_briefings")
    .update({ top_actions: actions })
    .eq("id", briefingId);
  if (updErr) return { ok: false, error: updErr.message };
  revalidatePath("/");
  return { ok: true };
}

/**
 * Cron entry: runs for every user with a recent activity_log entry.
 * Uses service-role to bypass RLS; iterates users.
 */
export async function generateBriefingsForAllUsers(): Promise<{
  ok: boolean;
  generated: number;
  skipped?: number;
  errors: string[];
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      ok: false,
      generated: 0,
      errors: ["SUPABASE_SERVICE_ROLE_KEY nije postavljen"],
    };
  }
  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Find distinct user_ids that have any activity in the last 30 days
  const { data: rows } = await admin
    .from("activity_log")
    .select("user_id")
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .limit(1000);

  const userIds = Array.from(
    new Set((rows ?? []).map((r) => r.user_id as string)),
  );

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const userId of userIds) {
    try {
      // Idempotency: skip user if today's briefing was already pushed.
      // Stops Jarvis spam when cron retries / curl is hit multiple times.
      const todayDateStr = new Date().toISOString().slice(0, 10);
      const { data: existingBriefing } = await admin
        .from("daily_briefings")
        .select("id, pushed_to_telegram_at")
        .eq("user_id", userId)
        .eq("briefing_date", todayDateStr)
        .maybeSingle();
      if (existingBriefing?.pushed_to_telegram_at) {
        skipped++;
        continue;
      }

      const ctx = await gatherContextAdmin(userId, admin);
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
      const userMessage = `# Današnji datum: ${ctx.today} (${ctx.weekday})\n\n# HQ kontekst (JSON):\n\n${JSON.stringify(ctx, null, 2)}\n\nNapiši mi briefing za danas po pravilima. STRIKT JSON output.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      const raw =
        textBlock && textBlock.type === "text" ? textBlock.text : "";
      const parsed = parseBriefing(raw);
      if (!parsed) {
        errors.push(`user ${userId}: invalid JSON`);
        continue;
      }
      const { data: upserted, error } = await admin
        .from("daily_briefings")
        .upsert(
          {
            user_id: userId,
            briefing_date: ctx.today,
            greeting: parsed.greeting,
            top_actions: parsed.top_actions.map((a) => ({
              ...a,
              done: false,
            })),
            context_summary: parsed.context_summary,
            motivational_hook: parsed.motivational_hook,
            raw_payload: ctx,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,briefing_date" },
        )
        .select("id")
        .single();
      if (error) errors.push(`user ${userId}: ${error.message}`);
      else {
        generated++;
        // Push briefing summary to Telegram (no-op if not configured / disabled)
        const top = parsed.top_actions
          .slice(0, 5)
          .map((a, i) => `${i + 1}. ${a.title}`)
          .join("\n");
        const tgText = `🤵 *Dobro jutro, Leonardo.*\n☀️ Briefing za ${ctx.weekday} je spreman.\n\n${parsed.greeting}\n\n*Plan dana:*\n${top}\n\n💪 _${parsed.motivational_hook}_\n\nNa raspolaganju sam. _— Jarvis_\n\n[Otvori HQ](${process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app"})`;
        await pushTelegramNotification("briefing", tgText, userId);
        // Mark as pushed so subsequent cron retries don't re-spam.
        if (upserted?.id) {
          await admin
            .from("daily_briefings")
            .update({ pushed_to_telegram_at: new Date().toISOString() })
            .eq("id", upserted.id);
        }
      }
    } catch (e) {
      errors.push(
        `user ${userId}: ${e instanceof Error ? e.message : "unknown"}`,
      );
    }
  }

  return { ok: errors.length === 0, generated, skipped, errors };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherContextAdmin(userId: string, admin: any): Promise<HQContext> {
  // Mirror of gatherContext but using admin client + scoped to user_id
  const today = new Date();
  const weekday = today.toLocaleDateString("hr-HR", { weekday: "long" });
  const todayIso = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - (day - 1));
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const [{ data: clients }, { data: leads }, { data: outreach }, { data: discoveries }, { data: tasks }, { data: wins }] =
    await Promise.all([
      admin
        .from("clients")
        .select("monthly_revenue, status")
        .eq("user_id", userId)
        .eq("status", "active"),
      admin
        .from("leads")
        .select(
          "id, name, niche, stage, icp_score, discovery_at, next_action_date, last_touchpoint_at, created_at",
        )
        .eq("user_id", userId)
        .order("icp_score", { ascending: false }),
      admin
        .from("outreach")
        .select("id, lead_name, created_at")
        .eq("user_id", userId)
        .gte("created_at", weekStartIso),
      admin
        .from("leads")
        .select("id, name, discovery_at")
        .eq("user_id", userId)
        .gte("discovery_at", todayIso)
        .lte(
          "discovery_at",
          new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        )
        .not("discovery_at", "is", null)
        .order("discovery_at", { ascending: true }),
      admin
        .from("tasks")
        .select("id, title, due_date, status")
        .eq("user_id", userId)
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(10),
      admin
        .from("activity_log")
        .select("action, metadata, created_at")
        .eq("user_id", userId)
        .in("action", ["deal_won", "client_added"])
        .gte(
          "created_at",
          new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .limit(5),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyRow = any;
  const clientList: AnyRow[] = clients ?? [];
  const leadList: AnyRow[] = leads ?? [];
  const outreachList: AnyRow[] = outreach ?? [];
  const discoveryList: AnyRow[] = discoveries ?? [];
  const taskList: AnyRow[] = tasks ?? [];
  const winList: AnyRow[] = wins ?? [];

  const mrr = clientList.reduce(
    (s: number, c: AnyRow) => s + (Number(c.monthly_revenue) || 0),
    0,
  );
  const hotLeads = leadList.filter(
    (l: AnyRow) =>
      (l.icp_score ?? 0) >= 14 &&
      l.stage !== "closed_won" &&
      l.stage !== "closed_lost",
  );
  const hotUnworked = hotLeads
    .filter((l: AnyRow) => {
      const created = new Date(l.created_at).getTime();
      const lastTouch = l.last_touchpoint_at
        ? new Date(l.last_touchpoint_at).getTime()
        : created;
      return (Date.now() - lastTouch) / (24 * 3600 * 1000) > 1;
    })
    .slice(0, 5);
  const silent = leadList
    .filter(
      (l: AnyRow) =>
        ["pricing", "financing", "booking"].includes(l.stage as string) &&
        l.last_touchpoint_at &&
        (Date.now() - new Date(l.last_touchpoint_at).getTime()) /
          (24 * 3600 * 1000) >
          3,
    )
    .slice(0, 5);

  return {
    today: todayIso,
    weekday,
    user_email: "",
    mrr_eur: mrr,
    active_clients: clientList.length,
    total_leads: leadList.length,
    hot_leads: hotLeads.length,
    weekly_outreach_sent: outreachList.length,
    weekly_outreach_quota: 25,
    upcoming_discoveries: discoveryList.map((d: AnyRow) => ({
      name: d.name as string,
      when: d.discovery_at as string,
      leadId: d.id as string,
    })),
    silent_leads: silent.map((l: AnyRow) => ({
      name: l.name as string,
      stage: l.stage as string,
      last_touch_days: Math.round(
        (Date.now() - new Date(l.last_touchpoint_at as string).getTime()) /
          (24 * 3600 * 1000),
      ),
      leadId: l.id as string,
      score: l.icp_score as number | undefined,
    })),
    hot_unworked_leads: hotUnworked.map((l: AnyRow) => ({
      name: l.name as string,
      score: l.icp_score as number,
      niche: l.niche as string | null,
      leadId: l.id as string,
    })),
    pending_tasks: taskList.slice(0, 5).map((t: AnyRow) => ({
      title: t.title as string,
      due: (t.due_date as string | null) ?? null,
      id: t.id as string,
    })),
    recent_wins: winList.map(
      (w: AnyRow) =>
        ((w.metadata as { title?: string })?.title as string) ?? w.action,
    ),
  };
}
