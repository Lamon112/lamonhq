/**
 * Instagram webhook — receives comment + DM events from Meta.
 *
 * Funnel (per Leonardov 2026-05-17 spec):
 *   1. Comment arrives matching keyword → public reply "javi se u DM"
 *   2. DM arrives from anyone → send quiz link
 *
 * Meta sends both events to the SAME webhook URL. We branch on the
 * payload shape.
 *
 * Webhook setup in Meta Developer console:
 *   - Callback URL: https://lamon-hq.vercel.app/api/webhooks/instagram
 *   - Verify token: process.env.META_VERIFY_TOKEN
 *   - Subscriptions: comments, messages
 *
 * Reference payload shapes:
 *   - Comments: https://developers.facebook.com/docs/instagram-api/guides/webhooks
 *   - Messages: https://developers.facebook.com/docs/messenger-platform/instagram/features/webhooks
 */

import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  loadActiveTriggers,
  matchKeyword,
  type KeywordTrigger,
} from "@/lib/igKeywordMatcher";
import {
  replyToComment,
  sendDirectMessage,
  renderTemplate,
} from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ─────────────────────────────────────────────────────────────────
// GET — Meta webhook verification handshake
// ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// ─────────────────────────────────────────────────────────────────
// POST — receive event (comment OR message)
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Verify signature
  const body = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  const secret = process.env.META_APP_SECRET;
  if (secret && sig) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (!safeCompare(sig, expected)) {
      console.warn("[ig-webhook] signature mismatch");
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
    }
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(body) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  // Meta sends an array of entries, each with array of changes/messaging
  for (const entry of payload.entry ?? []) {
    // ─── Comment events (changes[]) ───
    for (const change of entry.changes ?? []) {
      if (change.field === "comments" && change.value) {
        await handleComment(change.value as IGCommentValue);
      }
    }
    // ─── DM events (messaging[]) ───
    for (const msg of entry.messaging ?? []) {
      if (msg.message) {
        await handleDirectMessage(msg);
      }
    }
  }

  // Meta requires 200 OK fast (within 20s) or it'll retry
  return NextResponse.json({ ok: true });
}

// ─────────────────────────────────────────────────────────────────
// Comment handler
// ─────────────────────────────────────────────────────────────────
async function handleComment(c: IGCommentValue) {
  const supabase = sb();
  const triggers = await loadActiveTriggers();
  const match = matchKeyword(c.text ?? "", triggers);

  // Skip if commenter is the page itself (don't reply to our own comments)
  const selfIgUserId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (c.from?.id && selfIgUserId && c.from.id === selfIgUserId) {
    await logComment(c, null, "skipped_self", null, null);
    return;
  }

  if (!match) {
    await logComment(c, null, "skipped_unmatched", null, null);
    return;
  }

  // Cooldown check — same user, same keyword, within window
  const cooldownAgo = new Date(Date.now() - match.cooldown_seconds * 1000).toISOString();
  const { data: recent } = await supabase
    .from("ig_comment_events")
    .select("id")
    .eq("ig_user_id", c.from?.id ?? "")
    .eq("matched_trigger_id", match.id)
    .eq("public_reply_status", "sent")
    .gte("public_reply_at", cooldownAgo)
    .limit(1);
  if (recent && recent.length > 0) {
    await logComment(c, match, "skipped_cooldown", null, null);
    return;
  }

  // Insert pending event first so we have a record even if API fails
  const eventId = await logComment(c, match, "pending", null, null);

  // Reply publicly
  const result = await replyToComment({
    commentId: c.id,
    message: match.comment_reply_text,
  });
  if (result.ok) {
    await supabase
      .from("ig_comment_events")
      .update({
        public_reply_status: "sent",
        public_reply_text: match.comment_reply_text,
        public_reply_at: new Date().toISOString(),
      })
      .eq("id", eventId);
  } else {
    await supabase
      .from("ig_comment_events")
      .update({
        public_reply_status: "failed",
        public_reply_error: result.error.slice(0, 500),
      })
      .eq("id", eventId);
  }
}

// ─────────────────────────────────────────────────────────────────
// DM handler
// ─────────────────────────────────────────────────────────────────
async function handleDirectMessage(msg: IGMessagingEvent) {
  const supabase = sb();
  const senderId = msg.sender?.id;
  const messageId = msg.message?.mid;
  const text = msg.message?.text ?? "";

  if (!senderId || !messageId) return;

  // Don't echo our own messages
  const selfId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (selfId && senderId === selfId) return;

  // Idempotency: skip if we've already processed this message id
  const { data: existing } = await supabase
    .from("ig_dm_events")
    .select("id")
    .eq("ig_message_id", messageId)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Find the best matching trigger (or use catch-all)
  const triggers = await loadActiveTriggers();
  let match = matchKeyword(text, triggers);
  // Fallback to lowest-priority catch-all (e.g. "info") if no specific match
  if (!match) {
    match = triggers[triggers.length - 1] ?? null;
  }

  const eventId = await logDm(msg, match, "pending");

  if (!match) {
    await supabase
      .from("ig_dm_events")
      .update({ reply_status: "skipped_no_match" })
      .eq("id", eventId);
    return;
  }

  // Cooldown — don't spam same user
  const cooldownAgo = new Date(Date.now() - match.cooldown_seconds * 1000).toISOString();
  const { data: recent } = await supabase
    .from("ig_dm_events")
    .select("id")
    .eq("ig_user_id", senderId)
    .eq("reply_status", "sent")
    .gte("reply_at", cooldownAgo)
    .limit(1);
  if (recent && recent.length > 0) {
    await supabase
      .from("ig_dm_events")
      .update({ reply_status: "skipped_cooldown" })
      .eq("id", eventId);
    return;
  }

  const rendered = renderTemplate(match.dm_reply_text, {
    link: match.dm_link ?? "",
  });

  const result = await sendDirectMessage({ recipientId: senderId, message: rendered });
  if (result.ok) {
    await supabase
      .from("ig_dm_events")
      .update({
        reply_status: "sent",
        reply_text: rendered,
        reply_at: new Date().toISOString(),
        link_sent: match.dm_link,
      })
      .eq("id", eventId);
  } else {
    await supabase
      .from("ig_dm_events")
      .update({
        reply_status: "failed",
        reply_error: result.error.slice(0, 500),
      })
      .eq("id", eventId);
  }
}

// ─────────────────────────────────────────────────────────────────
// Logging helpers
// ─────────────────────────────────────────────────────────────────
async function logComment(
  c: IGCommentValue,
  match: KeywordTrigger | null,
  status: string,
  replyText: string | null,
  replyError: string | null,
): Promise<string> {
  const supabase = sb();
  const { data } = await supabase
    .from("ig_comment_events")
    .insert({
      ig_comment_id: c.id,
      ig_post_id: c.media?.id ?? null,
      ig_user_id: c.from?.id ?? "",
      ig_username: c.from?.username ?? null,
      comment_text: c.text ?? "",
      matched_trigger_id: match?.id ?? null,
      matched_keyword: match?.keyword ?? null,
      public_reply_status: status,
      public_reply_text: replyText,
      public_reply_error: replyError,
    })
    .select("id")
    .single();
  return (data?.id as string) ?? "";
}

async function logDm(
  msg: IGMessagingEvent,
  match: KeywordTrigger | null,
  status: string,
): Promise<string> {
  const supabase = sb();
  const { data } = await supabase
    .from("ig_dm_events")
    .insert({
      ig_message_id: msg.message?.mid ?? "",
      ig_user_id: msg.sender?.id ?? "",
      message_text: msg.message?.text ?? null,
      reply_status: status,
    })
    .select("id")
    .single();
  return (data?.id as string) ?? "";
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface MetaWebhookPayload {
  object?: string;
  entry?: MetaEntry[];
}

interface MetaEntry {
  id?: string;
  time?: number;
  changes?: MetaChange[];
  messaging?: IGMessagingEvent[];
}

interface MetaChange {
  field?: string;
  value?: unknown;
}

interface IGCommentValue {
  id: string;
  text?: string;
  from?: { id: string; username?: string };
  media?: { id?: string };
}

interface IGMessagingEvent {
  sender?: { id: string };
  recipient?: { id: string };
  message?: { mid?: string; text?: string };
}
