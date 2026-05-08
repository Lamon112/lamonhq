"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { refreshAccessToken, sendViaGmailApi } from "@/lib/gmail";

export interface GmailStatus {
  connected: boolean;
  email?: string;
  setupAt?: string;
}

interface GmailConfig {
  email: string;
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  setup_at?: string;
}

export async function getGmailStatus(): Promise<GmailStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "gmail")
    .maybeSingle();
  if (!data?.config) return { connected: false };
  const c = data.config as GmailConfig;
  return {
    connected: true,
    email: c.email,
    setupAt: c.setup_at,
  };
}

export async function disconnectGmail(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("provider", "gmail")
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/integrations");
  return { ok: true };
}

/**
 * Internal helper — returns a valid access_token, refreshing if expired.
 */
async function getValidAccessToken(): Promise<{
  ok: boolean;
  accessToken?: string;
  email?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "gmail")
    .maybeSingle();
  if (!data?.config) return { ok: false, error: "Gmail nije povezan" };
  const cfg = data.config as GmailConfig;

  const now = Date.now();
  const isExpired = !cfg.expiry_date || cfg.expiry_date <= now + 60 * 1000;

  if (!isExpired && cfg.access_token) {
    return { ok: true, accessToken: cfg.access_token, email: cfg.email };
  }

  if (!cfg.refresh_token) {
    return {
      ok: false,
      error: "Access token istekao i nemamo refresh token. Reconnect Gmail.",
    };
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Google OAuth env vars nisu postavljeni" };
  }

  const refreshed = await refreshAccessToken({
    refreshToken: cfg.refresh_token,
    clientId,
    clientSecret,
  });
  if (!refreshed.ok || !refreshed.tokens) {
    return { ok: false, error: refreshed.error ?? "Refresh failed" };
  }

  const updated: GmailConfig = {
    ...cfg,
    access_token: refreshed.tokens.access_token,
    expiry_date: refreshed.tokens.expiry_date,
    scope: refreshed.tokens.scope ?? cfg.scope,
  };

  await supabase
    .from("integrations")
    .update({ config: updated })
    .eq("provider", "gmail")
    .eq("user_id", userData.user.id);

  return {
    ok: true,
    accessToken: refreshed.tokens.access_token,
    email: cfg.email,
  };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  fromEmail?: string;
}

export async function sendViaGmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!input.to.trim()) return { ok: false, error: "Recipient email je prazan" };
  if (!input.subject.trim())
    return { ok: false, error: "Subject je prazan" };
  if (!input.body.trim()) return { ok: false, error: "Body je prazan" };

  const tokenRes = await getValidAccessToken();
  if (!tokenRes.ok || !tokenRes.accessToken || !tokenRes.email) {
    return { ok: false, error: tokenRes.error ?? "Auth failed" };
  }

  const result = await sendViaGmailApi({
    accessToken: tokenRes.accessToken,
    from: tokenRes.email,
    to: input.to.trim(),
    subject: input.subject.trim(),
    body: input.body,
  });

  return {
    ok: result.ok,
    messageId: result.messageId,
    error: result.error,
    fromEmail: tokenRes.email,
  };
}
