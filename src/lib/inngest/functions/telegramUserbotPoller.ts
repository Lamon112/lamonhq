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
 * IMPORTANT — single-connection design:
 *   Earlier version opened ONE connection for polling, then a SECOND
 *   connection for sending each reply. That broke because GramJS caches
 *   user access_hash per-session — connection #2 didn't have the
 *   access_hash for users from connection #1, so getInputEntity(id)
 *   failed silently and no replies went out.
 *
 *   Current design: ONE withClient call per poll cycle. We resolve the
 *   peer from dialog.entity (which has access_hash baked in) and pass
 *   it directly to sendMessage. No second connection, no resolution.
 */

import { createClient } from "@supabase/supabase-js";
import { TelegramClient } from "telegram";
import type { Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { inngest } from "../client";
import { classifyIntent, extractQualifyingFields } from "@/lib/telegramIntent";
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

function isConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_API_ID &&
      process.env.TELEGRAM_API_HASH &&
      process.env.TELEGRAM_SESSION,
  );
}

/*
 * Wrap one logical poll-cycle in a single GramJS connection. We connect
 * once at the top, do everything (poll + send), then disconnect. This
 * keeps access_hash cache valid for the lifetime of the cycle.
 */
async function withClient<T>(
  fn: (client: TelegramClient) => Promise<T>,
): Promise<T> {
  const session = new StringSession(process.env.TELEGRAM_SESSION!);
  const client = new TelegramClient(
    session,
    parseInt(process.env.TELEGRAM_API_ID!, 10),
    process.env.TELEGRAM_API_HASH!,
    { connectionRetries: 3 },
  );
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.disconnect();
    } catch {
      /* ignore — disconnect failures don't affect outcome */
    }
  }
}

/*
 * Result of polling — DMs paired with the resolved Telegram entity so
 * downstream sendMessage doesn't need a second resolution roundtrip.
 *
 * `peer` is `dialog.entity` from GramJS (User shape with access_hash).
 * We type it loosely as `unknown` here because GramJS' Entity union is
 * cumbersome and we only ever pass it back into client.sendMessage, which
 * accepts the full union directly.
 */
interface PolledDM {
  dm: IncomingDM;
  peer: Api.TypeEntityLike;
}

/*
 * Run the full poll + reply pipeline inside a single GramJS connection.
 *
 * Why one big function instead of step.run-per-DM: passing GramJS Entity
 * objects across Inngest step boundaries serializes them (they're plain
 * objects with class metadata that JSON.stringify drops), losing access_hash.
 * That cache loss was the root cause of the silent send failures we hit
 * on first deploy. Keeping the work in-process preserves the live entity.
 *
 * Inngest still gets idempotency guarantees because:
 *   - the cursor (last_update_id) is persisted at end-of-cycle
 *   - the telegram_messages UNIQUE (conversation_id, telegram_message_id,
 *     direction) constraint dedupes inbound logs across retries
 */
async function runPollCycle(cursor: number): Promise<{
  processed: number;
  replied: number;
  escalated: number;
  blocked: number;
  highestMessageId: number;
  errors: string[];
}> {
  if (!isConfigured()) {
    return {
      processed: 0,
      replied: 0,
      escalated: 0,
      blocked: 0,
      highestMessageId: cursor,
      errors: [],
    };
  }

  const supabase = getServiceSupabase();
  const errors: string[] = [];

  return withClient(async (client) => {
    // ── 1. Poll dialogs, collect (dm, peer) pairs ──
    const polled: PolledDM[] = [];
    let highestSeen = cursor;

    for await (const dialog of client.iterDialogs({ limit: 50 })) {
      if (!dialog.isUser) continue;
      if (!dialog.unreadCount || dialog.unreadCount <= 0) continue;
      // dialog.entity is typed as Entity | undefined in the GramJS d.ts
      // but in practice for isUser dialogs it's always present. Skip
      // defensively if not.
      const dialogPeer = dialog.entity;
      if (!dialogPeer) continue;

      const messages = await client.getMessages(dialogPeer, {
        limit: dialog.unreadCount,
      });
      for (const msg of messages) {
        if (msg.out) continue;
        if (!msg.message || typeof msg.message !== "string") continue;
        const msgId = Number(msg.id);
        if (msgId <= cursor) continue;

        const sender = (msg.sender ?? dialogPeer) as unknown as {
          id: { value: bigint } | bigint | { toString(): string };
          firstName?: string;
          lastName?: string;
          username?: string;
        };
        const rawId = sender.id;
        const senderId =
          typeof rawId === "object" && "value" in rawId
            ? Number(rawId.value)
            : typeof rawId === "object" && "toString" in rawId
              ? parseInt(rawId.toString(), 10)
              : Number(rawId);

        polled.push({
          dm: {
            telegramUserId: senderId,
            telegramUsername: sender.username,
            firstName: sender.firstName,
            lastName: sender.lastName,
            messageId: msgId,
            body: msg.message,
            receivedAt: new Date(Number(msg.date) * 1000).toISOString(),
          },
          // dialogPeer carries access_hash for sendMessage. msg.sender
          // would also work but dialogPeer is always present after the
          // isUser+exists guard above.
          peer: dialogPeer,
        });

        if (msgId > highestSeen) highestSeen = msgId;
      }
    }

    if (polled.length === 0) {
      return {
        processed: 0,
        replied: 0,
        escalated: 0,
        blocked: 0,
        highestMessageId: highestSeen,
        errors,
      };
    }

    // ── 2. For each DM: upsert convo, classify, route, audit, send, log ──
    let processed = 0;
    let replied = 0;
    let escalated = 0;
    let blocked = 0;

    for (const { dm, peer } of polled) {
      try {
        // 2a. Upsert conversation
        const { data: existing } = await supabase
          .from("telegram_conversations")
          .select("*")
          .eq("telegram_user_id", dm.telegramUserId)
          .maybeSingle();

        let conv = existing;
        if (!conv) {
          const { data: created, error: insErr } = await supabase
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
          if (insErr) {
            errors.push(`conv-insert ${dm.telegramUserId}: ${insErr.message}`);
            processed++;
            continue;
          }
          conv = created;
        } else {
          await supabase
            .from("telegram_conversations")
            .update({ last_message_at: dm.receivedAt })
            .eq("id", conv.id);
        }

        // 2b. Log inbound. We tolerate the unique-constraint violation
        // (conv_id, telegram_message_id, direction) because operational
        // recovery — e.g. resetting the cursor to reprocess a stuck queue
        // after a bug fix — re-runs the same inbound IDs. Using upsert
        // with onConflict ignore keeps the pipeline flowing instead of
        // throwing into the outer catch and skipping the reply.
        await supabase
          .from("telegram_messages")
          .upsert(
            {
              conversation_id: conv.id,
              telegram_message_id: dm.messageId,
              direction: "in",
              body: dm.body,
              sent_at: dm.receivedAt,
            },
            {
              onConflict: "conversation_id,telegram_message_id,direction",
              ignoreDuplicates: true,
            },
          );

        // 2c. Classify intent
        const expectingAnswer = conv.stage === "qualifying";
        const intent = await classifyIntent(dm.body, {
          stage: conv.stage,
          expectingQualifyingAnswer: expectingAnswer,
        });

        // 2c-bis. When in qualifying stage, ALWAYS try regex extractor
        // alongside the LLM. Haiku occasionally returns 'unclear' for
        // free-form Croatian/Serbian even when the message clearly answers
        // ("Velika Gorica\nMogu dat koliko treba\n1500€"). Regex catches
        // the common signals (city, age, hours, €goal) so we never lose
        // captured fields just because the classifier misfired.
        const regexExtracted =
          conv.stage === "qualifying" || intent.intent === "qualifying_answer"
            ? extractQualifyingFields(dm.body)
            : undefined;

        // 2d. Update captured_data with merged extraction (LLM + regex)
        const newFields = {
          ...(intent.extracted ?? {}),
          ...(regexExtracted ?? {}),
        };
        if (Object.keys(newFields).length > 0) {
          const merged = { ...conv.captured_data, ...newFields };
          await supabase
            .from("telegram_conversations")
            .update({ captured_data: merged })
            .eq("id", conv.id);
          conv.captured_data = merged;
        }

        // 2d-bis. Promote intent if we extracted real qualifying fields
        // but classifier said unclear/generic. routeTemplate's qualifying
        // branch only fires on intent='qualifying_answer'.
        let effectiveIntent = intent.intent;
        if (
          conv.stage === "qualifying" &&
          (intent.intent === "unclear" ||
            intent.intent === "generic_question" ||
            intent.intent === "info") &&
          regexExtracted &&
          Object.keys(regexExtracted).length > 0
        ) {
          effectiveIntent = "qualifying_answer";
        }

        // 2e. Route to template (use effectiveIntent which may have been
        // promoted from unclear → qualifying_answer above)
        const reply = routeTemplate({
          intent: effectiveIntent,
          currentStage: conv.stage,
          vars: {
            firstName: conv.telegram_first_name ?? undefined,
            location: conv.captured_data?.location,
            monthlyGoalEur: conv.captured_data?.monthly_goal_eur,
          },
          capturedFields: conv.captured_data ?? undefined,
        });

        if (!reply) {
          processed++;
          errors.push(
            `no-template ${dm.telegramUserId} stage=${conv.stage} intent=${intent.intent}`,
          );
          continue;
        }

        // ── Anti-loop guard ─────────────────────────────────────────
        // If we already sent THIS exact template_id to THIS conversation
        // in the last 5 minutes, the user is clearly answering but our
        // extractor isn't catching it. Asking the same question again is
        // worse than silence — it kills credibility (Patrick saw the same
        // "koliko sati tjedno možeš?" 3× in a row before complaining).
        //
        // Action: ESCALATE to Leonardo (handover stage) and push Jarvis
        // alert with conversation context so he can take over manually.
        // This is one of those failures the user explicitly said "se ne
        // smije desavati" — better to admit defeat early than spam.
        const { data: recentSame } = await supabase
          .from("telegram_messages")
          .select("id")
          .eq("conversation_id", conv.id)
          .eq("direction", "out")
          .eq("template_id", reply.templateId)
          .gte(
            "sent_at",
            new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          )
          .limit(2);
        if (recentSame && recentSame.length >= 1) {
          // We've already sent this exact template in last 5 min. Promote
          // to handover.
          await supabase
            .from("telegram_conversations")
            .update({
              stage: "handover",
              escalated_at: new Date().toISOString(),
              escalation_reason: `anti-loop: ${reply.templateId} repeated`,
              last_bot_reply_at: new Date().toISOString(),
            })
            .eq("id", conv.id);

          void pushTelegramNotification(
            "followups",
            `🚨 ANTI-LOOP: bot je htio poslati ${reply.templateId} već 2× u 5 min za ${dm.firstName ?? "user"} (@${dm.telegramUsername ?? "?"}).\n\nNjegova zadnja poruka: "${dm.body.slice(0, 200)}"\n\nCaptured tako daleko: ${JSON.stringify(conv.captured_data)}\n\nBOT JE STAO. Otvori @lamonleonardo i preuzmi razgovor RUČNO.\n\n— Jarvis`,
          );
          escalated++;
          processed++;
          continue;
        }

        // 2f. Audit reply (cross-domain auditor)
        const auditIssues = auditDraft({
          draft: reply.body,
          channel: "whatsapp",
          report: { channel_drafts: {} },
          lead: { name: dm.firstName ?? "Telegram user" },
        });
        const criticalIssue = auditIssues.find(
          (i) => i.severity === "critical" || i.severity === "high",
        );
        if (criticalIssue) {
          void pushTelegramNotification(
            "followups",
            `🚨 Telegram bot blocked reply (audit fail): ${criticalIssue.description}\n\nOriginal: ${reply.body.slice(0, 200)}\n\n— Jarvis`,
          );
          blocked++;
          processed++;
          continue;
        }

        // 2g. Send reply USING THE LIVE PEER (no second resolution)
        let sentMessageId: number | null = null;
        try {
          let finalBody = reply.body;
          const imageAttachments =
            reply.attachments?.filter((a) => a.type === "image") ?? [];
          const urlAttachments =
            reply.attachments?.filter((a) => a.type === "url") ?? [];

          if (urlAttachments.length > 0) {
            finalBody +=
              "\n\n" +
              urlAttachments
                .map((a) => (a.label ? `${a.label}: ${a.url}` : a.url))
                .join("\n");
          }

          const sent = await client.sendMessage(peer, { message: finalBody });
          sentMessageId = Number(sent.id);

          for (const img of imageAttachments) {
            try {
              await client.sendFile(peer, {
                file: img.url,
                caption: img.label,
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "img send failed";
              errors.push(`img-send ${dm.telegramUserId}: ${msg}`);
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "send threw";
          errors.push(`send ${dm.telegramUserId}: ${msg}`);
          processed++;
          continue;
        }

        if (sentMessageId == null) {
          errors.push(`send ${dm.telegramUserId}: null messageId`);
          processed++;
          continue;
        }

        // 2h. Log outbound
        await supabase.from("telegram_messages").insert({
          conversation_id: conv.id,
          telegram_message_id: sentMessageId,
          direction: "out",
          body: reply.body,
          template_id: reply.templateId,
          stage_before: conv.stage,
          stage_after: reply.stageAfter,
          audit_result: { issues: auditIssues, passes: true },
        });

        // 2i. Advance stage
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

        // 2j. Push notifications for HOT signals
        if (reply.stageAfter === "handover") {
          void pushTelegramNotification(
            "followups",
            `🔥 HOT MENTOR LEAD: ${dm.firstName ?? "Telegram user"} (@${dm.telegramUsername ?? "?"})\n\nIntent: ${intent.intent}\nGoal: ${conv.captured_data?.monthly_goal_eur ?? "?"}\n\nBot je poslao mentor handover. Otvori @lamonleonardo i preuzmi razgovor.\n\n— Jarvis`,
          );
          escalated++;
        }
        if (reply.stageAfter === "member") {
          void pushTelegramNotification(
            "followups",
            `🎉 NEW PREMIUM MEMBER: ${dm.firstName ?? "Telegram user"} — cold-to-close kroz bot. Pošalji prvi action ručno.\n\n— Jarvis`,
          );
        }

        replied++;
        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`process ${dm.telegramUserId}: ${msg}`);
        processed++;
      }
    }

    return {
      processed,
      replied,
      escalated,
      blocked,
      highestMessageId: highestSeen,
      errors,
    };
  });
}

export const telegramUserbotPoller = inngest.createFunction(
  {
    id: "telegram-userbot-poller",
    name: "Telegram @lamonleonardo userbot — DM auto-reply",
    retries: 1,
    triggers: [{ cron: "*/1 * * * *" }],
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();

    // Step 0: load cursor + paused flag
    const state = await step.run("load-state", async () => {
      const { data } = await supabase
        .from("telegram_poller_state")
        .select("last_update_id, paused")
        .eq("id", 1)
        .maybeSingle();
      return {
        cursor: Number(data?.last_update_id ?? 0),
        paused: Boolean(data?.paused ?? false),
      };
    });
    const cursor = state.cursor;

    // KILL SWITCH — when paused, do nothing. Touch heartbeat only so the
    // dashboard still shows the cron is alive (just disabled by Leonardo).
    if (state.paused) {
      await step.run("paused-heartbeat", async () => {
        await supabase
          .from("telegram_poller_state")
          .update({
            last_poll_at: new Date().toISOString(),
            notes: "PAUSED — re-enable via UPDATE telegram_poller_state SET paused=false",
          })
          .eq("id", 1);
      });
      return { ok: true, paused: true };
    }

    // Step 1: run full poll + reply cycle in single GramJS connection
    const result = await step.run("poll-and-reply", async () => {
      return runPollCycle(cursor);
    });

    // Step 2: heartbeat + counters + cursor advance
    await step.run("update-heartbeat", async () => {
      const { data: cur } = await supabase
        .from("telegram_poller_state")
        .select("total_polled, total_replied, total_escalated")
        .eq("id", 1)
        .maybeSingle();
      await supabase
        .from("telegram_poller_state")
        .update({
          last_update_id: result.highestMessageId,
          last_poll_at: new Date().toISOString(),
          total_polled: Number(cur?.total_polled ?? 0) + result.processed,
          total_replied: Number(cur?.total_replied ?? 0) + result.replied,
          total_escalated:
            Number(cur?.total_escalated ?? 0) + result.escalated,
          notes:
            result.errors.length > 0
              ? `last-cycle errors: ${result.errors.slice(0, 5).join(" | ")}`
              : null,
        })
        .eq("id", 1);
    });

    return {
      ok: true,
      processed: result.processed,
      replied: result.replied,
      escalated: result.escalated,
      blocked: result.blocked,
      errors: result.errors.length,
      sampleErrors: result.errors.slice(0, 3),
    };
  },
);
