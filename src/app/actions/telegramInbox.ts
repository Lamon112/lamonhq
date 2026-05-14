"use server";

/**
 * Telegram inbox queries — backs the Skool Ops "DM Inbox" tab UI.
 *
 * Returns conversation rows + the latest message snippet for each, sorted
 * by recency. The UI uses this to show Leonardo a single pane of every
 * @lamonleonardo DM the userbot is handling, what stage each is in, and
 * the last bot/user exchange.
 *
 * Service-role client is used because the bot ops dashboard is single-user
 * (Leonardo only) and we want stable reads regardless of auth-cookie state
 * during dashboard refreshes.
 */

import { createClient as createSbAdminClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  return createSbAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type TelegramStage =
  | "new"
  | "qualifying"
  | "pitch"
  | "awaiting"
  | "member"
  | "handover"
  | "nurture"
  | "dead";

export interface InboxConversation {
  id: string;
  telegramUserId: number;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  stage: TelegramStage;
  initialIntent: string | null;
  capturedData: Record<string, unknown> | null;
  firstMessageAt: string;
  lastMessageAt: string;
  lastBotReplyAt: string | null;
  escalatedAt: string | null;
  joinedPremiumAt: string | null;
  /** Most recent inbound message body (truncated 200 chars) */
  lastInboundPreview: string | null;
  lastInboundAt: string | null;
  /** Most recent outbound (bot) message body (truncated 200 chars) */
  lastOutboundPreview: string | null;
  lastOutboundAt: string | null;
  /** Total message count both directions */
  messageCount: number;
}

export interface InboxStats {
  totalConversations: number;
  byStage: Record<TelegramStage, number>;
  awaitingResponseCount: number; // stages: new, qualifying, awaiting
  hotCount: number; // stage = handover
  memberCount: number;
  pollerHeartbeat: {
    lastPollAt: string | null;
    secondsAgo: number | null;
    totalPolled: number;
    totalReplied: number;
    totalEscalated: number;
    notes: string | null;
  };
}

interface RawConv {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  stage: TelegramStage;
  initial_intent: string | null;
  captured_data: Record<string, unknown> | null;
  first_message_at: string;
  last_message_at: string;
  last_bot_reply_at: string | null;
  escalated_at: string | null;
  joined_premium_at: string | null;
}

interface RawMsg {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  body: string;
  sent_at: string;
}

/**
 * List recent conversations with their latest in/out previews.
 * Default: 50 most-recent (by last_message_at).
 */
export async function listInboxConversations(
  limit = 50,
): Promise<InboxConversation[]> {
  const sb = getServiceSupabase();

  const { data: convs, error } = await sb
    .from("telegram_conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (error || !convs) return [];

  const convIds = (convs as RawConv[]).map((c) => c.id);
  if (convIds.length === 0) return [];

  const { data: msgs } = await sb
    .from("telegram_messages")
    .select("id, conversation_id, direction, body, sent_at")
    .in("conversation_id", convIds)
    .order("sent_at", { ascending: false });

  const msgsByConv = new Map<string, RawMsg[]>();
  for (const m of (msgs ?? []) as RawMsg[]) {
    const list = msgsByConv.get(m.conversation_id) ?? [];
    list.push(m);
    msgsByConv.set(m.conversation_id, list);
  }

  return (convs as RawConv[]).map((c) => {
    const convMsgs = msgsByConv.get(c.id) ?? [];
    const lastIn = convMsgs.find((m) => m.direction === "in") ?? null;
    const lastOut = convMsgs.find((m) => m.direction === "out") ?? null;
    return {
      id: c.id,
      telegramUserId: c.telegram_user_id,
      telegramUsername: c.telegram_username,
      firstName: c.telegram_first_name,
      lastName: c.telegram_last_name,
      stage: c.stage,
      initialIntent: c.initial_intent,
      capturedData: c.captured_data,
      firstMessageAt: c.first_message_at,
      lastMessageAt: c.last_message_at,
      lastBotReplyAt: c.last_bot_reply_at,
      escalatedAt: c.escalated_at,
      joinedPremiumAt: c.joined_premium_at,
      lastInboundPreview: lastIn ? lastIn.body.slice(0, 200) : null,
      lastInboundAt: lastIn?.sent_at ?? null,
      lastOutboundPreview: lastOut ? lastOut.body.slice(0, 200) : null,
      lastOutboundAt: lastOut?.sent_at ?? null,
      messageCount: convMsgs.length,
    };
  });
}

/**
 * Aggregate stats across all conversations + poller heartbeat.
 * Cheap (single-row poller_state + GROUP BY on conversations).
 */
export async function getInboxStats(): Promise<InboxStats> {
  const sb = getServiceSupabase();

  const empty: Record<TelegramStage, number> = {
    new: 0,
    qualifying: 0,
    pitch: 0,
    awaiting: 0,
    member: 0,
    handover: 0,
    nurture: 0,
    dead: 0,
  };

  const { data: convs } = await sb
    .from("telegram_conversations")
    .select("stage");
  const byStage = { ...empty };
  for (const row of (convs ?? []) as { stage: TelegramStage }[]) {
    if (row.stage in byStage) byStage[row.stage]++;
  }
  const total = (convs ?? []).length;

  const { data: poller } = await sb
    .from("telegram_poller_state")
    .select("last_poll_at, total_polled, total_replied, total_escalated, notes")
    .eq("id", 1)
    .maybeSingle();

  const lastPollAt = poller?.last_poll_at ?? null;
  const secondsAgo = lastPollAt
    ? Math.round((Date.now() - new Date(lastPollAt).getTime()) / 1000)
    : null;

  return {
    totalConversations: total,
    byStage,
    awaitingResponseCount:
      byStage.new + byStage.qualifying + byStage.awaiting + byStage.pitch,
    hotCount: byStage.handover,
    memberCount: byStage.member,
    pollerHeartbeat: {
      lastPollAt,
      secondsAgo,
      totalPolled: Number(poller?.total_polled ?? 0),
      totalReplied: Number(poller?.total_replied ?? 0),
      totalEscalated: Number(poller?.total_escalated ?? 0),
      notes: poller?.notes ?? null,
    },
  };
}
