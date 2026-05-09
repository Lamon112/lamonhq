/**
 * Cash ledger — single source of truth for the bank balance Leonardo
 * cares about. Every income (+) and expense (-) appends a row;
 * Treasury room sums the view to show the running total.
 *
 * See migration 0015_cash_ledger.sql.
 */

import { createClient } from "@supabase/supabase-js";

export type CashCategory =
  | "opening_balance"
  | "client_revenue"
  | "ai_cost"
  | "fixed_expense"
  | "one_off_expense"
  | "refund"
  | "transfer";

interface AppendCashTxnInput {
  amountCents: number; // signed: + income, - expense
  category: CashCategory;
  label: string;
  occurredAt?: Date; // defaults to now
  sourceId?: string;
  sourceTable?: string;
  meta?: Record<string, unknown>;
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
  // Single-user app — pick from any existing ledger row, then leads.
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

/**
 * Append a single transaction. Returns true on success.
 * Designed to be called from Inngest fns + server actions; never throws
 * — silently no-ops if env / owner missing so AI runs aren't broken
 * by a ledger outage.
 */
export async function appendCashTxn(
  input: AppendCashTxnInput,
): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const ownerUserId = await getOwnerUserId(supabase);
    if (!ownerUserId) return false;
    const { error } = await supabase.from("cash_ledger").insert({
      user_id: ownerUserId,
      amount_cents: input.amountCents,
      category: input.category,
      label: input.label,
      occurred_at: (input.occurredAt ?? new Date()).toISOString(),
      source_id: input.sourceId ?? null,
      source_table: input.sourceTable ?? null,
      meta: input.meta ?? null,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Convenience: debit an AI agent action cost.
 */
export async function debitAiActionCost(opts: {
  actionRowId: string;
  room: string;
  title: string;
  costEur: number;
  meta?: Record<string, unknown>;
}): Promise<boolean> {
  if (!Number.isFinite(opts.costEur) || opts.costEur <= 0) return false;
  return appendCashTxn({
    amountCents: -Math.round(opts.costEur * 100),
    category: "ai_cost",
    label: `[${opts.room}] ${opts.title}`,
    sourceId: opts.actionRowId,
    sourceTable: "agent_actions",
    meta: opts.meta,
  });
}

// =====================================================================
// Recurring monthly fixed expenses
//
// Inngest cron runs daily at 09:00 Zagreb. Each call checks today's
// day-of-month and inserts the matching expense row. Idempotency is
// enforced in code (select-first, insert-if-missing) because the
// equivalent partial unique index couldn't be created — Postgres
// requires an IMMUTABLE expression for index keys, and any way to
// extract "the date" from a timestamptz is STABLE at best.
// =====================================================================
export const RECURRING_EXPENSES: Array<{
  dayOfMonth: number;
  amountCents: number;
  label: string;
}> = [
  { dayOfMonth: 1, amountCents: 38000, label: "Održavanje firme" },   // €380
  { dayOfMonth: 15, amountCents: 97000, label: "Režije" },             // €970
  { dayOfMonth: 30, amountCents: 60000, label: "Hrana" },              // €600
];

export async function applyRecurringExpensesForToday(): Promise<{
  applied: Array<{ label: string; amountCents: number }>;
  skipped: Array<{ label: string; reason: string }>;
}> {
  const today = new Date();
  const dayOfMonth = today.getUTCDate();
  const due = RECURRING_EXPENSES.filter((r) => r.dayOfMonth === dayOfMonth);

  const applied: Array<{ label: string; amountCents: number }> = [];
  const skipped: Array<{ label: string; reason: string }> = [];
  if (due.length === 0) return { applied, skipped };

  const supabase = getServiceSupabase();
  const ownerUserId = await getOwnerUserId(supabase);
  if (!ownerUserId) {
    return {
      applied,
      skipped: due.map((d) => ({ label: d.label, reason: "no owner user" })),
    };
  }

  // Idempotency window: today's UTC date (00:00 → next 00:00).
  const dayStart = new Date(Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
  ));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  for (const exp of due) {
    const existing = await supabase
      .from("cash_ledger")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("category", "fixed_expense")
      .eq("label", exp.label)
      .gte("occurred_at", dayStart.toISOString())
      .lt("occurred_at", dayEnd.toISOString())
      .limit(1)
      .maybeSingle();
    if (existing.data) {
      skipped.push({ label: exp.label, reason: "already booked today" });
      continue;
    }
    const ok = await appendCashTxn({
      amountCents: -exp.amountCents,
      category: "fixed_expense",
      label: exp.label,
      meta: { recurring: true, dayOfMonth: exp.dayOfMonth },
    });
    if (ok) applied.push({ label: exp.label, amountCents: exp.amountCents });
    else skipped.push({ label: exp.label, reason: "insert failed" });
  }

  return { applied, skipped };
}
