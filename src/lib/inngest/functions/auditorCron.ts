/**
 * Auditor cron: nightly auto-refresh of failing drafts.
 *
 * Runs daily at 02:00 Zagreb (Leonardo is asleep, no live outreach in
 * flight, server load is low). Scans every lead with a holmes_report,
 * runs `auditHolmesReport` to find critical/high-severity issues, then
 * queues a Holmes refresh for each failing lead — one per Inngest step
 * so a single Vercel function timeout doesn't kill the whole batch.
 *
 * After all refreshes complete, posts a Telegram notification to
 * Leonardo via Jarvis: "Auditor refreshed N failing drafts overnight."
 *
 * Goal: when Leonardo opens HQ in the morning, the Audit Lab counters
 * read "🔴 0 / 🟡 minimal / ✅ rest" — he no longer needs to spend
 * morning hours manually refreshing leads with stale drafts.
 *
 * Cost budget: each Holmes refresh is ~€0.08-0.10 (cached system prompt
 * + ~5K output tokens). 70 leads × 30% needing refresh × €0.10 = €2.10
 * worst case per nightly run. Cap at 30 leads per night (€3.00) to keep
 * monthly burn within Council budget.
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { runAgentHolmes } from "@/lib/agentHolmes";
import { auditHolmesReport, auditBadgeVariant } from "@/lib/draftAuditor";
import { pushTelegramNotification } from "@/app/actions/telegram";

const MAX_REFRESH_PER_RUN = 30;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service env not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const auditorCron = inngest.createFunction(
  {
    id: "auditor-nightly-refresh",
    name: "Auditor — nightly auto-refresh of failing drafts",
    retries: 1,
    triggers: [{ cron: "TZ=Europe/Zagreb 0 2 * * *" }],
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();

    /*
     * Step 1: scan every active lead with holmes_report. Skip closed
     * stages (won/lost) — auditing those is wasted spend. Sort by
     * icp_score desc so the highest-value leads are refreshed first
     * within the MAX_REFRESH_PER_RUN cap.
     */
    const failing = await step.run("scan-failing-drafts", async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, icp_score, niche, notes, website_url, holmes_report, stage")
        .not("holmes_report", "is", null)
        .not("stage", "in", '("closed_won","closed_lost")')
        .order("icp_score", { ascending: false });

      if (error) throw new Error(`scan failed: ${error.message}`);

      const leads = (data ?? []) as Array<{
        id: string;
        name: string;
        icp_score: number | null;
        niche: string | null;
        notes: string | null;
        website_url: string | null;
        holmes_report: Record<string, unknown>;
        stage: string;
      }>;

      const failingLeads: Array<{
        id: string;
        name: string;
        niche: string | null;
        notes: string | null;
        websiteUrl: string | null;
        worstSeverity: string;
        issueCount: number;
      }> = [];

      for (const l of leads) {
        const result = auditHolmesReport(
          // Cast through unknown — auditor's AuditableReport shape is
          // intentionally loose; the DB JSONB matches structurally.
          l.holmes_report as unknown as Parameters<
            typeof auditHolmesReport
          >[0],
          { name: l.name, icp_score: l.icp_score },
        );
        const variant = auditBadgeVariant(result);
        if (variant === "fail") {
          failingLeads.push({
            id: l.id,
            name: l.name,
            niche: l.niche,
            notes: l.notes,
            websiteUrl: l.website_url,
            worstSeverity: result.worst_severity ?? "unknown",
            issueCount: result.total_issues,
          });
        }
      }

      return failingLeads.slice(0, MAX_REFRESH_PER_RUN);
    });

    if (failing.length === 0) {
      return { ok: true, refreshed: 0, reason: "no failing drafts" };
    }

    /*
     * Step 2: refresh each failing lead. Each Holmes run gets its own
     * Inngest step → its own Vercel function invocation → its own 60s
     * timeout budget. If one fails, Inngest retries it independently.
     * Wall-clock for 30 leads × 30s avg = ~15 min, well within Inngest
     * step limits.
     */
    let refreshedCount = 0;
    const errors: string[] = [];

    for (const lead of failing) {
      // Inngest's step.run return-type union (`{ok:true}` vs
      // `{ok:false; error}`) gets jsonified; we use a discriminated
      // check on `ok` to narrow.
      const refreshed: { ok: true } | { ok: false; error: string } = await step.run(
        `refresh-holmes-${lead.id}`,
        async () => {
          try {
            const result = await runAgentHolmes({
              leadName: lead.name,
              niche: lead.niche,
              notesExcerpt: lead.notes,
              websiteUrl: lead.websiteUrl,
            });

            if (!result.ok || !result.report) {
              return {
                ok: false as const,
                error: result.error ?? "Holmes failed",
              };
            }

            const { error } = await supabase
              .from("leads")
              .update({ holmes_report: result.report })
              .eq("id", lead.id);

            if (error) {
              return { ok: false as const, error: error.message };
            }

            return { ok: true as const };
          } catch (e) {
            return {
              ok: false as const,
              error: e instanceof Error ? e.message : "unknown",
            };
          }
        },
      );

      if (refreshed.ok) {
        refreshedCount++;
      } else {
        errors.push(`${lead.name}: ${refreshed.error}`);
      }
    }

    /*
     * Step 3: ping Leonardo via Jarvis Telegram bot. Use the system-
     * level push (no user_id) — auditor is server-side, not user-
     * triggered. The bot's persona prefix ("— Jarvis") signs the
     * message so Leonardo knows it's automated.
     */
    await step.run("notify-jarvis", async () => {
      const errorTail = errors.length > 0 ? `\n⚠ ${errors.length} grešaka` : "";
      void pushTelegramNotification(
        "followups",
        `🛡 Leonardo, Auditor je refreshao ${refreshedCount} failing drafts ovu noć. ${
          errors.length > 0 ? "Ima par grešaka koje su za retry — provjeri Audit Lab room." : "Sve klijente sa critical/high issues pokrili."
        }${errorTail}\n\n— Jarvis`,
      );
    });

    return {
      ok: true,
      refreshed: refreshedCount,
      totalFound: failing.length,
      errors: errors.length,
    };
  },
);
