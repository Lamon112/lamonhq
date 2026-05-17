/**
 * Instagram Graph API helper — comment replies + DMs.
 *
 * Uses the Instagram Graph API (v21.0) via the Page-scoped access token.
 * Required env vars:
 *   - IG_PAGE_ACCESS_TOKEN — long-lived Page token from Meta Developer console
 *   - IG_BUSINESS_ACCOUNT_ID — IG Business account id (e.g. 17841...)
 *
 * Reference:
 *   - Reply to comment: https://developers.facebook.com/docs/instagram-api/reference/ig-comment/replies
 *   - Send DM: https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

function token(): string {
  const t = process.env.IG_PAGE_ACCESS_TOKEN;
  if (!t) throw new Error("IG_PAGE_ACCESS_TOKEN not set");
  return t;
}

function igBusinessId(): string {
  const id = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!id) throw new Error("IG_BUSINESS_ACCOUNT_ID not set");
  return id;
}

/**
 * Reply publicly to an Instagram comment.
 * The reply appears nested under the original comment in the IG post UI.
 */
export async function replyToComment(args: {
  commentId: string;
  message: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${args.commentId}/replies?access_token=${encodeURIComponent(token())}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: args.message }),
      },
    );
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || json.error) {
      return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: json.id ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Send a direct message to a user via Instagram Messenger Platform.
 * `recipientId` is the Page-scoped user id from the webhook payload.
 *
 * IMPORTANT: Per Meta policy, we can only send a DM within 24h of the
 * user's last message to us (Standard Messaging window). After 24h
 * requires "Human Agent" tag or paid one-time-notification.
 */
export async function sendDirectMessage(args: {
  recipientId: string;
  message: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${igBusinessId()}/messages?access_token=${encodeURIComponent(token())}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: { id: args.recipientId },
          message: { text: args.message },
        }),
      },
    );
    const json = (await res.json()) as {
      message_id?: string;
      error?: { message: string };
    };
    if (!res.ok || json.error) {
      return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, messageId: json.message_id ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Resolve template tokens in a reply string. Currently supports {{link}}.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? "";
  });
}
