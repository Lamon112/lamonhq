"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  resolveChatId,
  sendTelegramMessage,
  type TelegramSendOptions,
} from "@/lib/telegram";

export interface TelegramConfig {
  bot_token: string;
  chat_id: string;
  notify_briefing?: boolean;
  notify_followups?: boolean;
  notify_inbound?: boolean;
  setup_at?: string;
}

export interface TelegramStatus {
  connected: boolean;
  chatId?: string;
  notifyBriefing: boolean;
  notifyFollowups: boolean;
  notifyInbound: boolean;
  setupAt?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app";

export async function setupTelegram(
  botToken: string,
  manualChatId?: string,
): Promise<{
  ok: boolean;
  error?: string;
  chatId?: string;
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const trimmedToken = botToken.trim();
  if (!trimmedToken) return { ok: false, error: "Bot token je obavezan" };

  let chatId = manualChatId?.trim();
  if (!chatId) {
    const resolved = await resolveChatId(trimmedToken);
    if (!resolved.ok || !resolved.chatId) {
      return { ok: false, error: resolved.error ?? "Nije moguće dohvatiti chat_id" };
    }
    chatId = resolved.chatId;
  }

  // Send confirmation message to verify both token + chat_id
  const sendRes = await sendTelegramMessage(
    trimmedToken,
    chatId,
    `🤵 *Jarvis na dužnosti, Leonardo.*\n\nOd sada javljam:\n• ☀️ Daily Briefing — 07:00\n• 📨 Auto Follow-ups — 06:30\n• 📩 Inbound triage — odmah\n\nUgodan dan. _— Jarvis_\n\n[Otvori HQ](${APP_URL})`,
  );
  if (!sendRes.ok) {
    return {
      ok: false,
      error: `Telegram send failed: ${sendRes.error}. Provjeri token + da si kliknuo Start u botu.`,
    };
  }

  const config: TelegramConfig = {
    bot_token: trimmedToken,
    chat_id: chatId,
    notify_briefing: true,
    notify_followups: true,
    notify_inbound: true,
    setup_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("integrations").upsert(
    {
      user_id: userData.user.id,
      provider: "telegram",
      config,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true, chatId };
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "telegram")
    .maybeSingle();
  if (!data?.config)
    return {
      connected: false,
      notifyBriefing: true,
      notifyFollowups: true,
      notifyInbound: true,
    };
  const c = data.config as TelegramConfig;
  return {
    connected: true,
    chatId: c.chat_id,
    notifyBriefing: c.notify_briefing ?? true,
    notifyFollowups: c.notify_followups ?? true,
    notifyInbound: c.notify_inbound ?? true,
    setupAt: c.setup_at,
  };
}

export async function updateTelegramPrefs(prefs: {
  notifyBriefing?: boolean;
  notifyFollowups?: boolean;
  notifyInbound?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "telegram")
    .maybeSingle();
  if (!data?.config) return { ok: false, error: "Telegram nije povezan" };
  const cfg = data.config as TelegramConfig;
  const updated: TelegramConfig = {
    ...cfg,
    notify_briefing: prefs.notifyBriefing ?? cfg.notify_briefing,
    notify_followups: prefs.notifyFollowups ?? cfg.notify_followups,
    notify_inbound: prefs.notifyInbound ?? cfg.notify_inbound,
  };
  const { error } = await supabase
    .from("integrations")
    .update({ config: updated })
    .eq("provider", "telegram")
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendTestTelegram(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "telegram")
    .maybeSingle();
  if (!data?.config) return { ok: false, error: "Telegram nije povezan" };
  const cfg = data.config as TelegramConfig;
  const res = await sendTelegramMessage(
    cfg.bot_token,
    cfg.chat_id,
    `🤵 *Test komunikacijskog kanala.*\n\nAko ovo vidiš — push radi besprijekorno. _— Jarvis_\n\n[Otvori HQ](${APP_URL})`,
  );
  return { ok: res.ok, error: res.error };
}

/**
 * Server-side helper used from cron paths and other server actions.
 * Auto-no-op if Telegram not configured for a user.
 *
 * Pass userId for service-role lookups (cron). Otherwise it uses the
 * authenticated user.
 */
export async function pushTelegramNotification(
  notifKind: "briefing" | "followups" | "inbound",
  text: string,
  userId?: string,
  opts: TelegramSendOptions = {},
): Promise<void> {
  try {
    let cfg: TelegramConfig | null = null;

    if (userId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) return;
      const admin = createAdminClient(url, serviceKey, {
        auth: { persistSession: false },
      });
      const { data } = await admin
        .from("integrations")
        .select("config")
        .eq("provider", "telegram")
        .eq("user_id", userId)
        .maybeSingle();
      cfg = (data?.config as TelegramConfig | undefined) ?? null;
    } else {
      const supabase = await createClient();
      const { data } = await supabase
        .from("integrations")
        .select("config")
        .eq("provider", "telegram")
        .maybeSingle();
      cfg = (data?.config as TelegramConfig | undefined) ?? null;
    }

    if (!cfg?.bot_token || !cfg.chat_id) return;

    const flag =
      notifKind === "briefing"
        ? cfg.notify_briefing
        : notifKind === "followups"
          ? cfg.notify_followups
          : cfg.notify_inbound;
    if (flag === false) return;

    await sendTelegramMessage(cfg.bot_token, cfg.chat_id, text, opts);
  } catch {
    // never throw
  }
}
