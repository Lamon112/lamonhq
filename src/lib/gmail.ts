/**
 * Gmail OAuth + send helpers.
 *
 * No SDK dependency — direct fetch against Google's REST endpoints.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
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
    const raw = buildRfc822Message({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      replyTo: opts.replyTo,
    });
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
