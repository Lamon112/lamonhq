/**
 * Gmail OAuth + send helpers.
 *
 * No SDK dependency — direct fetch against Google's REST endpoints.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const LIST_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const GET_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const SEND_AS_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  // gmail.readonly: lets the auto-reply poller read inbox messages by ID
  // so it can detect replies to outbound outreach. Send-only is not
  // enough — we need to fetch sender + body of inbound mail.
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number; // ms epoch
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export function buildAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const p = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

export async function exchangeCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ ok: boolean; tokens?: GmailTokens; error?: string }> {
  try {
    const body = new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const json = (await res.json()) as GmailTokens & {
      error?: string;
      error_description?: string;
    };
    if (json.error) {
      return { ok: false, error: json.error_description ?? json.error };
    }
    const expiry_date = json.expires_in
      ? Date.now() + json.expires_in * 1000
      : undefined;
    return { ok: true, tokens: { ...json, expiry_date } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Token exchange failed",
    };
  }
}

export async function refreshAccessToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ ok: boolean; tokens?: GmailTokens; error?: string }> {
  try {
    const body = new URLSearchParams({
      refresh_token: opts.refreshToken,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "refresh_token",
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const json = (await res.json()) as GmailTokens & {
      error?: string;
      error_description?: string;
    };
    if (json.error) {
      return { ok: false, error: json.error_description ?? json.error };
    }
    const expiry_date = json.expires_in
      ? Date.now() + json.expires_in * 1000
      : undefined;
    return { ok: true, tokens: { ...json, expiry_date } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Token refresh failed",
    };
  }
}

export async function fetchUserEmail(
  accessToken: string,
): Promise<{ email?: string; error?: string }> {
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const json = (await res.json()) as { email?: string; error?: string };
    if (json.error) return { error: String(json.error) };
    return { email: json.email };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "userinfo failed" };
  }
}

/**
 * Encode a UTF-8 string as base64url (RFC 4648 §5).
 * Gmail API expects raw RFC 2822 message in base64url.
 */
function base64UrlEncode(str: string): string {
  const buf = Buffer.from(str, "utf-8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Fetch the Plima B2B signature (or whatever signature) the user has
 * configured in Gmail web UI for their primary sendAs identity. Gmail
 * API send does NOT auto-attach signatures — that's a web-compose-only
 * feature — so we pull it here and append to outbound HTML body.
 *
 * Returns the raw HTML signature, or null when no signature is set.
 */
export async function fetchGmailSignature(opts: {
  accessToken: string;
  /** Defaults to primary sendAs (isPrimary=true). Pass an explicit address
   * to match against a specific alias's signature. */
  fromEmail?: string;
}): Promise<{ ok: boolean; signature?: string; error?: string }> {
  try {
    const res = await fetch(SEND_AS_URL, {
      headers: { Authorization: `Bearer ${opts.accessToken}` },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      sendAs?: {
        sendAsEmail: string;
        signature?: string;
        isPrimary?: boolean;
      }[];
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message ?? `Gmail sendAs HTTP ${res.status}`,
      };
    }
    const list = json.sendAs ?? [];
    const want = opts.fromEmail?.toLowerCase();
    const match = want
      ? list.find((s) => s.sendAsEmail.toLowerCase() === want)
      : list.find((s) => s.isPrimary) ?? list[0];
    return { ok: true, signature: match?.signature || undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gmail signature fetch failed",
    };
  }
}

/**
 * Convert a plain-text email body into a minimally-styled HTML version
 * for the text/html MIME part. Preserves paragraph breaks (\n\n → <p>)
 * and single line breaks (\n → <br>). Email clients render the plain
 * text part for clients that don't support HTML (Outlook minimal etc.)
 * and the HTML part everywhere else.
 */
function bodyToHtml(plain: string): string {
  const escaped = plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n\n+/).map((p) => p.replace(/\n/g, "<br>"));
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 1em 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${p}</p>`,
    )
    .join("");
}

/**
 * Build a multipart/alternative RFC-822 message with both text/plain and
 * text/html parts. Recipient clients pick the richer part they support.
 * Without this, Gmail signature HTML (which contains <img>, <a>) would
 * be sent as literal HTML source inside a text/plain mail.
 */
function buildMultipartMessage(opts: {
  from: string;
  to: string;
  subject: string;
  plainBody: string;
  htmlBody: string;
  replyTo?: string;
}): string {
  const boundary = `=_plima_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(opts.subject, "utf-8").toString("base64")}?=`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : "",
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join("\r\n");
  const plainPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    opts.plainBody,
    "",
  ].join("\r\n");
  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    opts.htmlBody,
    "",
  ].join("\r\n");
  return [
    headers,
    "",
    plainPart,
    htmlPart,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function buildRfc822Message(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): string {
  // Encode subject as MIME encoded-word for non-ASCII safety
  const encodedSubject = `=?UTF-8?B?${Buffer.from(opts.subject, "utf-8").toString("base64")}?=`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : "",
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ]
    .filter(Boolean)
    .join("\r\n");
  return `${headers}\r\n\r\n${opts.body}`;
}

export interface SendOptions {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}

export async function sendViaGmailApi(
  opts: SendOptions,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    // Fetch signature for this sendAs identity. Append below the body
    // separated by --\r\n (RFC 3676 signature delimiter) in plain text,
    // and as a styled block in HTML.
    const sigRes = await fetchGmailSignature({
      accessToken: opts.accessToken,
      fromEmail: opts.from,
    });
    const signatureHtml = sigRes.signature ?? "";

    let raw: string;
    if (signatureHtml) {
      const htmlBody =
        bodyToHtml(opts.body) +
        `<br><br><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${signatureHtml}</div>`;
      // Plain-text body keeps a simple text fallback for the signature so
      // text/plain-only clients aren't left dangling. Strip HTML tags.
      const signaturePlain = signatureHtml
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const plainBody = `${opts.body}\n\n-- \n${signaturePlain}`;
      raw = buildMultipartMessage({
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        plainBody,
        htmlBody,
        replyTo: opts.replyTo,
      });
    } else {
      raw = buildRfc822Message({
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        body: opts.body,
        replyTo: opts.replyTo,
      });
    }
    const encoded = base64UrlEncode(raw);
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message ?? `Gmail send HTTP ${res.status}`,
      };
    }
    return { ok: true, messageId: json.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gmail send failed",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
// INBOX READ HELPERS — used by auto-reply poller to detect inbound replies
// Requires gmail.readonly scope. Returns sender + plain-text body so the
// triage action can classify the reply and draft 2 responses.
// ─────────────────────────────────────────────────────────────────────

export interface GmailListItem {
  id: string;
  threadId: string;
}

/**
 * List Gmail message IDs matching a query string. Default query targets
 * inbox messages newer than the cutoff so we don't re-process history.
 * Gmail query syntax: https://support.google.com/mail/answer/7190
 */
export async function listInboxMessages(opts: {
  accessToken: string;
  query?: string;
  maxResults?: number;
}): Promise<{ ok: boolean; messages?: GmailListItem[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      q: opts.query ?? "in:inbox newer_than:7d -from:me",
      maxResults: String(opts.maxResults ?? 50),
    });
    const res = await fetch(`${LIST_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${opts.accessToken}` },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      messages?: GmailListItem[];
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message ?? `Gmail list HTTP ${res.status}`,
      };
    }
    return { ok: true, messages: json.messages ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gmail list failed",
    };
  }
}

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  /** Reference to original outbound message via In-Reply-To header. */
  inReplyTo?: string;
}

/**
 * Decode a base64url-encoded payload chunk to UTF-8 text.
 */
function decodeBase64Url(raw: string): string {
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

/**
 * Walk a Gmail payload tree and return the first text/plain part body.
 * Falls back to text/html stripped of tags when no plain-text part exists.
 */
function extractBody(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  };
  if (p.mimeType?.startsWith("text/plain") && p.body?.data) {
    return decodeBase64Url(p.body.data);
  }
  if (Array.isArray(p.parts)) {
    for (const part of p.parts) {
      const found = extractBody(part);
      if (found) return found;
    }
  }
  if (p.mimeType?.startsWith("text/html") && p.body?.data) {
    return decodeBase64Url(p.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

/**
 * Fetch one Gmail message with full payload, return parsed sender + body.
 */
export async function getMessage(opts: {
  accessToken: string;
  messageId: string;
}): Promise<{ ok: boolean; message?: GmailMessage; error?: string }> {
  try {
    const res = await fetch(
      `${GET_URL}/${opts.messageId}?format=full`,
      {
        headers: { Authorization: `Bearer ${opts.accessToken}` },
        cache: "no-store",
      },
    );
    const json = (await res.json()) as {
      id?: string;
      threadId?: string;
      internalDate?: string;
      payload?: { headers?: { name: string; value: string }[] };
      error?: { message?: string };
    };
    if (!res.ok || json.error || !json.id) {
      return {
        ok: false,
        error: json.error?.message ?? `Gmail get HTTP ${res.status}`,
      };
    }
    const headers = json.payload?.headers ?? [];
    const headerFind = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
      "";
    return {
      ok: true,
      message: {
        id: json.id,
        threadId: json.threadId ?? json.id,
        internalDate: json.internalDate ?? "",
        from: headerFind("From"),
        to: headerFind("To"),
        subject: headerFind("Subject"),
        inReplyTo: headerFind("In-Reply-To") || undefined,
        body: extractBody(json.payload),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gmail get failed",
    };
  }
}

/**
 * Parse an RFC-822 From header (e.g. `"Dr Špehar" <ivan@apex.hr>`) into
 * the bare email address.
 */
export function parseEmailAddress(rfc822From: string): string {
  const angled = rfc822From.match(/<([^>]+)>/);
  if (angled) return angled[1].trim().toLowerCase();
  return rfc822From.trim().toLowerCase();
}
