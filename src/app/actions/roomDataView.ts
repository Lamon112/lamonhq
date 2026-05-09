"use server";

/**
 * Server action wrappers for vault room "data-view" actions — instant
 * dashboards that render existing query data without spawning Inngest.
 *
 * Switch on viewKey, return the matching shape. Each is small enough
 * to render in a side drawer with a compact list/table.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getClients,
  getClientsStats,
  getHQStats,
  getTasks,
  getTasksStats,
  type ClientRow,
} from "@/lib/queries";

// ----- types returned to the client component -----

export interface ClientsViewData {
  b2b: Array<{
    id: string;
    name: string;
    type: string;
    monthlyEur: number;
    status: string;
    nextAction: string | null;
    workflow: string | null;
  }>;
  b2c: Array<{
    id: string;
    name: string;
    type: string;
    monthlyEur: number;
    status: string;
  }>;
  barter: Array<{ id: string; name: string; type: string }>;
  totals: {
    b2bMrrCents: number;
    b2cMrrCents: number;
    activeCount: number;
    onboardingCount: number;
    pausedCount: number;
  };
}

export interface ClientStatsViewData {
  perClient: Array<{
    id: string;
    name: string;
    type: string;
    mrrCents: number;
    monthsActive: number;
    churnRisk: number; // 0-1
    healthLabel: "healthy" | "watch" | "at-risk";
    nextAction: string | null;
  }>;
  totals: {
    avgMrrCents: number;
    medianMonthsActive: number;
    atRiskCount: number;
  };
}

export interface RevenueViewData {
  mrrCents: number;
  goalCents: number;
  breakdown: {
    b2bMrrCents: number;
    b2cMrrCents: number;
    barterCount: number;
  };
  perClientMrr: Array<{ name: string; type: string; mrrCents: number }>;
  monthlyDeltaCents: number;
  estimatedMonthlyAiCostEur: number;
  topAiCostsThisMonth: Array<{ room: string; title: string; costEur: number; date: string }>;
  // Net = revenue (€) − AI spend (€)
  netThisMonthEur: number;
  // Cash ledger (migration 0015) — running bank balance + recent txns
  bank: {
    balanceCents: number;
    lifetimeInCents: number;
    lifetimeOutCents: number;
    thisMonthInCents: number;
    thisMonthOutCents: number;
    upcomingMonthlyExpenses: Array<{
      day: number;
      label: string;
      amountCents: number;
    }>;
    recentTxns: Array<{
      id: string;
      occurredAt: string;
      amountCents: number;
      category: string;
      label: string;
    }>;
  };
}

export interface TasksViewData {
  today: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    dueDate: string | null;
  }>;
  thisWeek: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    dueDate: string | null;
  }>;
  overdue: Array<{ id: string; title: string; dueDate: string }>;
  stats: { total: number; doneToday: number; openToday: number };
}

export interface BookingViewData {
  upcoming: Array<{
    leadId: string;
    name: string;
    discoveryAt: string;
    icpScore: number | null;
    estimatedValue: number | null;
    holmesReady: boolean;
  }>;
  thisWeekCount: number;
  nextDiscoveryAt: string | null;
}

// =====================================================================
// Public dispatcher
// =====================================================================
export type RoomDataViewKey =
  | "clients"
  | "client_stats"
  | "revenue"
  | "tasks"
  | "booking";

export type RoomDataViewPayload =
  | { ok: true; viewKey: "clients"; data: ClientsViewData }
  | { ok: true; viewKey: "client_stats"; data: ClientStatsViewData }
  | { ok: true; viewKey: "revenue"; data: RevenueViewData }
  | { ok: true; viewKey: "tasks"; data: TasksViewData }
  | { ok: true; viewKey: "booking"; data: BookingViewData }
  | { ok: false; error: string };

export async function getRoomDataView(
  viewKey: RoomDataViewKey,
): Promise<RoomDataViewPayload> {
  try {
    switch (viewKey) {
      case "clients":
        return { ok: true, viewKey, data: await loadClients() };
      case "client_stats":
        return { ok: true, viewKey, data: await loadClientStats() };
      case "revenue":
        return { ok: true, viewKey, data: await loadRevenue() };
      case "tasks":
        return { ok: true, viewKey, data: await loadTasks() };
      case "booking":
        return { ok: true, viewKey, data: await loadBooking() };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "View load failed",
    };
  }
}

// =====================================================================
// Loaders
// =====================================================================

function isB2BType(t: ClientRow["type"]): boolean {
  return t === "b2b_clinic";
}

function churnRiskToNumber(r: ClientRow["churn_risk"]): number {
  if (r === "high") return 0.8;
  if (r === "medium") return 0.5;
  if (r === "low") return 0.15;
  return 0;
}

async function loadClients(): Promise<ClientsViewData> {
  const list = await getClients();
  const b2b: ClientsViewData["b2b"] = [];
  const b2c: ClientsViewData["b2c"] = [];
  const barter: ClientsViewData["barter"] = [];
  let b2bMrrCents = 0;
  let b2cMrrCents = 0;
  let activeCount = 0;
  let onboardingCount = 0;
  let pausedCount = 0;

  for (const c of list) {
    const monthlyCents = Math.round((c.monthly_revenue ?? 0) * 100);
    const status = c.status ?? "unknown";
    if (status === "active") activeCount++;
    else if (status === "onboarding") onboardingCount++;
    else if (status === "paused") pausedCount++;

    const isBarter = monthlyCents === 0;
    const isB2B = isB2BType(c.type);

    if (isBarter) {
      barter.push({ id: c.id, name: c.name, type: c.type ?? "—" });
    } else if (isB2B) {
      b2bMrrCents += monthlyCents;
      b2b.push({
        id: c.id,
        name: c.name,
        type: c.type ?? "—",
        monthlyEur: monthlyCents / 100,
        status,
        nextAction: c.next_action ?? null,
        workflow: null,
      });
    } else {
      b2cMrrCents += monthlyCents;
      b2c.push({
        id: c.id,
        name: c.name,
        type: c.type ?? "—",
        monthlyEur: monthlyCents / 100,
        status,
      });
    }
  }

  return {
    b2b,
    b2c,
    barter,
    totals: {
      b2bMrrCents,
      b2cMrrCents,
      activeCount,
      onboardingCount,
      pausedCount,
    },
  };
}

async function loadClientStats(): Promise<ClientStatsViewData> {
  const list = await getClients();
  const stats = await getClientsStats();
  const now = Date.now();
  const perClient: ClientStatsViewData["perClient"] = list.map((c) => {
    const start = c.start_date ? new Date(c.start_date).getTime() : now;
    const monthsActive = Math.max(
      0,
      Math.round((now - start) / (1000 * 60 * 60 * 24 * 30)),
    );
    const churnRisk = churnRiskToNumber(c.churn_risk);
    const healthLabel: "healthy" | "watch" | "at-risk" =
      churnRisk >= 0.6 ? "at-risk" : churnRisk >= 0.3 ? "watch" : "healthy";
    return {
      id: c.id,
      name: c.name,
      type: c.type ?? "—",
      mrrCents: Math.round((c.monthly_revenue ?? 0) * 100),
      monthsActive,
      churnRisk,
      healthLabel,
      nextAction: c.next_action ?? null,
    };
  });

  const sortedMonths = [...perClient]
    .map((p) => p.monthsActive)
    .sort((a, b) => a - b);
  const median =
    sortedMonths.length === 0
      ? 0
      : sortedMonths[Math.floor(sortedMonths.length / 2)];

  return {
    perClient: perClient.sort((a, b) => b.churnRisk - a.churnRisk),
    totals: {
      avgMrrCents:
        list.length === 0
          ? 0
          : Math.round(
              list.reduce((s, c) => s + (c.monthly_revenue ?? 0) * 100, 0) /
                list.length,
            ),
      medianMonthsActive: median,
      atRiskCount: stats.churnRisk,
    },
  };
}

async function loadRevenue(): Promise<RevenueViewData> {
  const supabase = await createClient();
  const stats = await getHQStats();
  const list = await getClients();
  let b2bMrrCents = 0;
  let b2cMrrCents = 0;
  let barterCount = 0;
  const perClientMrr: RevenueViewData["perClientMrr"] = [];
  for (const c of list) {
    const cents = Math.round((c.monthly_revenue ?? 0) * 100);
    if (cents === 0) {
      barterCount++;
      continue;
    }
    if (isB2BType(c.type)) b2bMrrCents += cents;
    else b2cMrrCents += cents;
    perClientMrr.push({ name: c.name, type: c.type, mrrCents: cents });
  }
  perClientMrr.sort((a, b) => b.mrrCents - a.mrrCents);

  // AI cost burn this month — sum agent_actions.usage.cost_eur where
  // completed_at >= start of month
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: actions } = await supabase
    .from("agent_actions")
    .select("room, title, usage, completed_at")
    .gte("completed_at", monthStart.toISOString())
    .eq("status", "completed");
  let estimatedMonthlyAiCostEur = 0;
  const topCosts: RevenueViewData["topAiCostsThisMonth"] = [];
  for (const a of (actions ?? []) as Array<{
    room: string;
    title: string;
    usage: { cost_eur?: number } | null;
    completed_at: string;
  }>) {
    const c = a.usage?.cost_eur ?? 0;
    estimatedMonthlyAiCostEur += c;
    if (c > 0) {
      topCosts.push({
        room: a.room,
        title: a.title,
        costEur: c,
        date: a.completed_at,
      });
    }
  }
  topCosts.sort((a, b) => b.costEur - a.costEur);

  // Cash ledger reads (migration 0015 — view + table)
  const balanceQ = await supabase
    .from("cash_balance")
    .select(
      "balance_cents, lifetime_in_cents, lifetime_out_cents, this_month_in_cents, this_month_out_cents",
    )
    .limit(1)
    .maybeSingle();
  const balance = balanceQ.data ?? {
    balance_cents: 0,
    lifetime_in_cents: 0,
    lifetime_out_cents: 0,
    this_month_in_cents: 0,
    this_month_out_cents: 0,
  };
  const txnsQ = await supabase
    .from("cash_ledger")
    .select("id, occurred_at, amount_cents, category, label")
    .order("occurred_at", { ascending: false })
    .limit(15);

  return {
    mrrCents: stats.mrrCents,
    goalCents: stats.goalTargetCents,
    breakdown: { b2bMrrCents, b2cMrrCents, barterCount },
    perClientMrr,
    monthlyDeltaCents: stats.monthlyDeltaCents,
    estimatedMonthlyAiCostEur,
    topAiCostsThisMonth: topCosts.slice(0, 10),
    netThisMonthEur:
      (stats.mrrCents + stats.monthlyDeltaCents) / 100 - estimatedMonthlyAiCostEur,
    bank: {
      balanceCents: Number(balance.balance_cents ?? 0),
      lifetimeInCents: Number(balance.lifetime_in_cents ?? 0),
      lifetimeOutCents: Number(balance.lifetime_out_cents ?? 0),
      thisMonthInCents: Number(balance.this_month_in_cents ?? 0),
      thisMonthOutCents: Number(balance.this_month_out_cents ?? 0),
      upcomingMonthlyExpenses: [
        { day: 1, label: "Održavanje firme", amountCents: 38000 },
        { day: 15, label: "Režije", amountCents: 97000 },
        { day: 30, label: "Hrana", amountCents: 60000 },
      ],
      recentTxns: ((txnsQ.data ?? []) as Array<{
        id: string;
        occurred_at: string;
        amount_cents: number;
        category: string;
        label: string;
      }>).map((t) => ({
        id: t.id,
        occurredAt: t.occurred_at,
        amountCents: Number(t.amount_cents),
        category: t.category,
        label: t.label,
      })),
    },
  };
}

async function loadTasks(): Promise<TasksViewData> {
  const all = await getTasks();
  const stats = await getTasksStats();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const today: TasksViewData["today"] = [];
  const thisWeek: TasksViewData["thisWeek"] = [];
  const overdue: TasksViewData["overdue"] = [];

  for (const t of all) {
    if (t.status === "done") continue;
    const due = t.due_date ? new Date(t.due_date) : null;
    const item = {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: null, // tasks table doesn't have priority field
      dueDate: t.due_date ?? null,
    };
    if (due) {
      if (due < todayStart) {
        overdue.push({ id: t.id, title: t.title, dueDate: t.due_date! });
      } else if (due < todayEnd) {
        today.push(item);
      } else if (due < weekEnd) {
        thisWeek.push(item);
      }
    } else {
      thisWeek.push(item);
    }
  }

  overdue.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  return {
    today,
    thisWeek,
    overdue,
    stats: {
      total: stats.weekCount + overdue.length,
      doneToday: stats.doneToday,
      openToday: stats.todayCount,
    },
  };
}

async function loadBooking(): Promise<BookingViewData> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, name, discovery_at, icp_score, estimated_value, holmes_report",
    )
    .gte("discovery_at", now)
    .lte("discovery_at", weekFromNow)
    .order("discovery_at", { ascending: true });
  const upcoming: BookingViewData["upcoming"] = (data ?? []).map(
    (l) => ({
      leadId: l.id as string,
      name: l.name as string,
      discoveryAt: l.discovery_at as string,
      icpScore: (l.icp_score as number | null) ?? null,
      estimatedValue: (l.estimated_value as number | null) ?? null,
      holmesReady: !!l.holmes_report,
    }),
  );
  return {
    upcoming,
    thisWeekCount: upcoming.length,
    nextDiscoveryAt: upcoming[0]?.discoveryAt ?? null,
  };
}
