/**
 * Inngest cron: every 5 min sweep all users' Gmail inboxes for new
 * replies to outreach, auto-triage via Anthropic, persist drafts in
 * inbound_messages, and Jarvis-push.
 *
 * Each poll iteration is server-side (no user session) — uses Supabase
 * service role key. RLS bypassed via admin client in autoReply.ts.
 *
 * Idempotency: dedup by inbound_messages.external_message_id (Gmail msg
 * ID). Cron retries are safe — already-triaged messages are skipped.
 */

import { inngest } from "../client";
import { pollAllUsers } from "@/app/actions/autoReply";

export const autoReplyPoller = inngest.createFunction(
  {
    id: "auto-reply-poller",
    name: "Auto-reply inbox poller (every 5 min)",
    triggers: [{ cron: "*/5 * * * *" }],
    // Skip if a previous run is still going — Gmail rate limits + AI cost
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const summary = await step.run("poll-all", async () => {
      return pollAllUsers();
    });
    return {
      ok: true,
      userCount: summary.userCount,
      totalTriaged: summary.totalTriaged,
    };
  },
);
