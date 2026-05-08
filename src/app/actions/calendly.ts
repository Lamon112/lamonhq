"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  webhookId?: string;
  signingKey?: string;
  endpointUrl?: string;
}

const CALENDLY_API = "https://api.calendly.com";

interface CalendlyMe {
  resource: {
    uri: string;
    current_organization: string;
    name: string;
    email: string;
  };
}

interface CalendlyWebhookCreate {
  resource: {
    uri: string;
    callback_url: string;
    state: string;
    signing_key?: string;
  };
}

async function calendlyFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(`${CALENDLY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Calendly ${r.status}: ${txt}`);
  }
  return (await r.json()) as T;
}

export async function setupCalendlyWebhook(
  token: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app"}/api/webhooks/calendly`;

  try {
    // 1. Get user info to find organization
    const me = await calendlyFetch<CalendlyMe>(token, "/users/me");
    const orgUri = me.resource.current_organization;

    // 2. List existing webhooks to avoid duplicates
    const list = await calendlyFetch<{ collection: { uri: string; callback_url: string }[] }>(
      token,
      `/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=organization`,
    );
    const existing = list.collection.find(
      (w) => w.callback_url === callbackUrl,
    );
    if (existing) {
      // Already subscribed — store metadata and return
      await supabase.from("integrations").upsert({
        user_id: userData.user.id,
        provider: "calendly",
        config: {
          token,
          webhook_uri: existing.uri,
          callback_url: callbackUrl,
          calendly_user: me.resource.email,
          calendly_user_uri: me.resource.uri,
          organization: orgUri,
        },
      });
      return {
        ok: true,
        webhookId: existing.uri,
        endpointUrl: callbackUrl,
        error: "Webhook već postoji za ovaj endpoint — re-saved config.",
      };
    }

    // 3. Create webhook subscription
    const created = await calendlyFetch<CalendlyWebhookCreate>(
      token,
      "/webhook_subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          url: callbackUrl,
          events: ["invitee.created", "invitee.canceled"],
          organization: orgUri,
          scope: "organization",
        }),
      },
    );

    // 4. Persist token + webhook info
    await supabase.from("integrations").upsert({
      user_id: userData.user.id,
      provider: "calendly",
      config: {
        token,
        webhook_uri: created.resource.uri,
        callback_url: callbackUrl,
        signing_key: created.resource.signing_key,
        calendly_user: me.resource.email,
        calendly_user_uri: me.resource.uri,
        organization: orgUri,
      },
    });

    return {
      ok: true,
      webhookId: created.resource.uri,
      signingKey: created.resource.signing_key,
      endpointUrl: callbackUrl,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Calendly setup nepoznata greška",
    };
  }
}

export async function getCalendlyStatus(): Promise<{
  connected: boolean;
  email?: string;
  webhookUri?: string;
  signingKey?: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "calendly")
    .maybeSingle();
  if (!data?.config) return { connected: false };
  const c = data.config as {
    calendly_user?: string;
    webhook_uri?: string;
    signing_key?: string;
  };
  return {
    connected: true,
    email: c.calendly_user,
    webhookUri: c.webhook_uri,
    signingKey: c.signing_key,
  };
}
