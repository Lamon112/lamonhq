/**
 * Telegram userbot poller — runs every 60 sec via Inngest cron, polls
 * @lamonleonardo's Telegram DMs through GramJS MTProto, classifies new
 * messages, advances each user through the conversation state machine,
 * and sends auto-replies AS @lamonleonardo (not as a separate bot).
 *
 * Why userbot (not Bot API):
 *   - Telegram Bot API can only reply from a bot account (@xxx_bot).
 *     Per Leonardov 2026-05-14 directive: he wants replies to come from
 *     his personal @lamonleonardo so DMs feel personal (not "talking to
 *     a bot").
 *   - GramJS exposes MTProto user-level API; with a session string we
 *     authenticate as Leonardo and can read/send DMs as him.
 *   - Risk profile: REPLY-ONLY (we never cold-DM). Telegram tolerates
 *     this. Cold mass-DM = ban; reactive auto-reply = fine.
 *
 * SETUP (one-time, blocked on Leonardov api credentials):
 *   1. Leonardo registers Telegram app at my.telegram.org → gets
 *      api_id + api_hash
 *   2. We run a one-time auth script locally that opens a connection,
 *      Telegram sends an SMS code to Leonardov phone, he gives us the
 *      code, GramJS returns a permanent session string
 *   3. Save TELEGRAM_API_ID + TELEGRAM_API_HASH + TELEGRAM_SESSION env
 *      vars in Vercel
 *   4. This poller starts processing real DMs on next deploy
 *
 * Until env vars are set, the poller is a no-op (graceful — logs and
 * returns). This lets us ship the scaffold + UI now, plug in the real
 * client when credentials are available.
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { classifyIntent } from "@/lib/telegramIntent";
import { routeTemplate } from "@/lib/telegramTemplates";
import { auditDraft } from "@/lib/draftAuditor";
import { pushTelegramNotification } from "@/app/actions/telegram";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service env not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface IncomingDM {
  telegramUserId: number;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  messageId: number;
  body: string;
  receivedAt: string;
}

/*
 * Placeholder for the GramJS poll. When TELEGRAM_API_ID/HASH/SESSION
 * are configured, this becomes a real GramJS client.connect() +
 * iterMessages() call. Until then, returns empty array so the rest of
 * the pipeline (state machine, audit, send) can be tested with seeded
 * data via SQL inserts to telegram_messages.
 *
 * Phase 2 implementation sketch:
 *
 *   import { TelegramClient } from "telegram";
 *   import { StringSession } from "telegram/sessions";
 *
 *   const session = new StringSession(process.env.TELEGRAM_SESSION);
 *   const client = new TelegramClient(
 *     session,
 *     parseInt(process.env.TELEGRAM_API_ID!, 10),
 *     process.env.TELEGRAM_API_HASH!,
 *     { connectionRetries: 3 },
 *   );
 *   await client.connect();
 *
 *   const lastSeenId = await getLastUpdateId();
 *   const updates = await client.invoke(
 *     new Api.updates.GetDifference({
 *       pts: lastSeenId,
 *       date: ...,
 *       qts: 0,
 *     }),
 *   );
 *   // parse new private messages, return as IncomingDM[]
 */
async function pollNewDMs(): Promise<IncomingDM[]> {
  if (
    !process.env.TELEGRAM_API_ID ||
    !process.env.TELEGRAM_API_HASH ||
    !process.env.TELEGRAM_SESSION
  ) {
    // Credentials not yet configured — graceful no-op.
    return [];
  }
  // TODO Phase 2: real GramJS poll. Stub for now.
  return [];
}

/*
 * Send a reply AS @lamonleonardo via GramJS. Phase 2 implementation
 * will use client.sendMessage(targetPeer, { message }).
 */
async function sendReplyAsLeonardo(
  telegramUserId: number,
  body: string,
  attachments?: Array<{ type: "url" | "image"; url: string; label?: string }>,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  if (
    !process.env.TELEGRAM_API_ID ||
    !process.env.TELEGRAM_API_HASH ||
    !process.env.TELEGRAM_SESSION
  ) {
    return {
      ok: false,
      error: "Telegram userbot not configured (waiting api credentials)",
    };
  }
  // TODO Phase 2: real GramJS send.
  // For now, log so we can verify routing locally with seeded conversations.
  console.log(`[telegram-userbot] would send to ${telegramUserId}:`, body);
  if (attachments?.length) {
    console.log(`[telegram-userbot] attachments:`, attachments);
  }
  return { ok: true, messageId: Date.now() };
}

export const telegramUserbotPoller = inngest.createFunction(
  {
    id: "telegram-userbot-poller",
    name: "Telegram @lamonleonardo userbot — DM auto-reply",
    retries: 1,
    triggers: [{ cron: "*/1 * * * *" }], // every 1 min
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();

    // Step 1: poll for new DMs since last_update_id
    const newDMs = await step.run("poll-telegram-dms", async () => {
      return pollNewDMs();
    });

    if (newDMs.length === 0) {
      // Update heartbeat + return
      await step.run("heartbeat", async () => {
        await supabase
          .from("telegram_poller_state")
          .update({ last_poll_at: new Date().toISOString() })
          .eq("id", 1);
      });
      return { ok: true, processed: 0, reason: "no new DMs" };
    }

    let processedCount = 0;
    let repliedCount = 0;
    let escalatedCount = 0;

    for (const dm of newDMs) {
      const result = await step.run(`process-dm-${dm.messageId}`, async () => {
        // 1. Upsert conversation
        const { data: existing } = await supabase
          .from("telegram_conversations")
          .select("*")
          .eq("telegram_user_id", dm.telegramUserId)
          .maybeSingle();

        let conv = existing;
        if (!conv) {
          const { data: created, error } = await supabase
            .from("telegram_conversations")
            .insert({
              telegram_user_id: dm.telegramUserId,
              telegram_username: dm.telegramUsername,
              telegram_first_name: dm.firstName,
              telegram_last_name: dm.lastName,
              stage: "new",
              first_message_at: dm.receivedAt,
              last_message_at: dm.receivedAt,
            })
            .select()
            .single();
          if (error) return { ok: false, error: error.message };
          conv = created;
        } else {
          await supabase
            .from("telegram_conversations")
            .update({ last_message_at: dm.receivedAt })
            .eq("id", conv.id);
        }

        // 2. Log inbound message (idempotent on Telegram message ID)
        await supabase.from("telegram_messages").insert({
          conversation_id: conv.id,
          telegram_message_id: dm.messageId,
          direction: "in",
          body: dm.body,
          sent_at: dm.receivedAt,
        });

        // 3. Classify intent (regex first, Haiku if needed)
        const expectingAnswer = conv.stage === "qualifying";
        const intent = await classifyIntent(dm.body, {
          stage: conv.stage,
          expectingQualifyingAnswer: expectingAnswer,
        });

        // 4. Update captured_data if qualifying answer extracted fields
        if (intent.extracted) {
          await supabase
            .from("telegram_conversations")
            .update({
              captured_data: { ...conv.captured_data, ...intent.extracted },
            })
            .eq("id", conv.id);
          conv.captured_data = { ...conv.captured_data, ...intent.extracted };
        }

        // 5. Route to template
        const reply = routeTemplate({
          intent: intent.intent,
          currentStage: conv.stage,
          vars: {
            firstName: conv.telegram_first_name ?? undefined,
            location: conv.captured_data?.location,
            monthlyGoalEur: conv.captured_data?.monthly_goal_eur,
          },
          capturedFields: conv.captured_data ?? undefined,
        });

        if (!reply) {
          // No reply needed (e.g., MEMBER stage non-mentor question)
          return { ok: true, replied: false, intent: intent.intent };
        }

        // 6. Audit the reply before sending (cross-domain auditor)
        const auditIssues = auditDraft({
          draft: reply.body,
          channel: "whatsapp", // closest match for tone/style audit
          report: { channel_drafts: {} },
          lead: { name: dm.firstName ?? "Telegram user" },
        });
        const criticalIssue = auditIssues.find(
          (i) => i.severity === "critical" || i.severity === "high",
        );
        if (criticalIssue) {
          // Don't send a flagged reply — push alert instead
          void pushTelegramNotification(
            "followups",
            `🚨 Telegram bot blocked reply (audit fail): ${criticalIssue.description}\n\nOriginal: ${reply.body.slice(0, 200)}\n\n— Jarvis`,
          );
          return {
            ok: true,
            replied: false,
            blocked: true,
            issue: criticalIssue.description,
          };
        }

        // 7. Send reply
        const sent = await sendReplyAsLeonardo(
          dm.telegramUserId,
          reply.body,
          reply.attachments,
        );
        if (!sent.ok) return { ok: false, error: sent.error };

        // 8. Log outbound message
        await supabase.from("telegram_messages").insert({
          conversation_id: conv.id,
          telegram_message_id: sent.messageId!,
          direction: "out",
          body: reply.body,
          template_id: reply.templateId,
          stage_before: conv.stage,
          stage_after: reply.stageAfter,
          audit_result: { issues: auditIssues, passes: !criticalIssue },
        });

        // 9. Advance stage
        if (reply.stageAfter && reply.stageAfter !== conv.stage) {
          const updates: Record<string, unknown> = {
            stage: reply.stageAfter,
            last_bot_reply_at: new Date().toISOString(),
          };
          if (reply.stageAfter === "handover") {
            updates.escalated_at = new Date().toISOString();
            updates.escalation_reason = `intent: ${intent.intent}`;
          }
          if (reply.stageAfter === "member") {
            updates.joined_premium_at = new Date().toISOString();
          }
          await supabase
            .from("telegram_conversations")
            .update(updates)
            .eq("id", conv.id);
        }

        // 10. Push notification for HOT escalations
        if (reply.stageAfter === "handover") {
          void pushTelegramNotification(
            "followups",
            `🔥 HOT MENTOR LEAD: ${dm.firstName ?? "Telegram user"} (@${dm.telegramUsername ?? "?"})\n\nIntent: ${intent.intent}\nGoal: ${conv.captured_data?.monthly_goal_eur ?? "?"}\n\nBot je poslao mentor handover. Otvori @lamonleonardo i preuzmi razgovor.\n\n— Jarvis`,
          );
        }
        if (reply.stageAfter === "member") {
          void pushTelegramNotification(
            "followups",
            `🎉 NEW PREMIUM MEMBER: ${dm.firstName ?? "Telegram user"} — cold-to-close kroz bot. Pošalji prvi action ručno.\n\n— Jarvis`,
          );
        }

        return {
          ok: true,
          replied: true,
          intent: intent.intent,
          escalated: reply.stageAfter === "handover",
        };
      });

      processedCount++;
      // Result is a discriminated union from step.run — narrow before access.
      const r = result as { replied?: boolean; escalated?: boolean };
      if (r.replied) repliedCount++;
      if (r.escalated) escalatedCount++;
    }

    // Update poller heartbeat + counters
    await step.run("update-heartbeat", async () => {
      await supabase
        .from("telegram_poller_state")
        .update({
          last_poll_at: new Date().toISOString(),
          total_polled: processedCount,
          total_replied: repliedCount,
          total_escalated: escalatedCount,
        })
        .eq("id", 1);
    });

    return {
      ok: true,
      processed: processedCount,
      replied: repliedCount,
      escalated: escalatedCount,
    };
  },
);
