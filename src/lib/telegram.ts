const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramSendOptions {
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  opts: TelegramSendOptions = {},
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${botToken.trim()}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: opts.parseMode ?? "Markdown",
          disable_notification: opts.disableNotification ?? false,
          disable_web_page_preview: opts.disableWebPagePreview ?? true,
        }),
        cache: "no-store",
      },
    );
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (!json.ok) return { ok: false, error: json.description ?? "Telegram error" };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Telegram fetch error",
    };
  }
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

/**
 * Resolve chat_id automatically — call after user clicks Start in their bot.
 * Picks the most recent chat where someone has interacted with the bot.
 */
export async function resolveChatId(
  botToken: string,
): Promise<{ ok: boolean; chatId?: string; error?: string }> {
  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${botToken.trim()}/getUpdates?limit=20`,
      { cache: "no-store" },
    );
    const json = (await res.json()) as {
      ok: boolean;
      result?: TelegramUpdate[];
      description?: string;
    };
    if (!json.ok) {
      return { ok: false, error: json.description ?? "getUpdates failed" };
    }
    const updates = json.result ?? [];
    if (updates.length === 0) {
      return {
        ok: false,
        error:
          "Bot još nije primio nijednu poruku. Otvori bot u Telegramu i klikni Start ili pošalji poruku.",
      };
    }
    // Take chat_id of the most recent message
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      if (u.message?.chat.id) {
        return { ok: true, chatId: String(u.message.chat.id) };
      }
    }
    return { ok: false, error: "Nije moguće pronaći chat_id u updates" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Telegram fetch error",
    };
  }
}

/**
 * Escape Markdown special chars for Telegram MarkdownV2.
 * For our briefing/follow-up messages, we use simple Markdown (parseMode='Markdown'),
 * which is more forgiving — only requires escaping for inline code blocks.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
