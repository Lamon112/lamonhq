/**
 * Inngest cron: daily 09:00 Zagreb — apply any recurring fixed expenses
 * whose day-of-month matches today (1st = €380 firm maintenance,
 * 15th = €970 utilities, 30th = €600 food).
 *
 * Idempotent: cash_ledger unique index on (user_id, category, label,
 * date(occurred_at)) where category='fixed_expense' prevents
 * double-debit if cron retries.
 */

import { inngest } from "../client";
import { applyRecurringExpensesForToday } from "@/lib/cashLedger";

export const dailyExpenseCron = inngest.createFunction(
  {
    id: "daily-expense-cron",
    name: "Daily recurring expenses (cash ledger)",
    triggers: [{ cron: "TZ=Europe/Zagreb 0 9 * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("apply-due-expenses", async () => {
      return applyRecurringExpensesForToday();
    });
    return {
      ok: true,
      appliedCount: result.applied.length,
      applied: result.applied,
      skippedCount: result.skipped.length,
    };
  },
);
