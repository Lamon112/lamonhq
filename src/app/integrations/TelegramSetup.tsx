"use client";

import { useState, useTransition } from "react";
import { Check, Send, Bell, BellOff, Loader2 } from "lucide-react";
import {
  setupTelegram,
  sendTestTelegram,
  updateTelegramPrefs,
} from "@/app/actions/telegram";
import {
  Field,
  PrimaryButton,
  ErrorBanner,
  Badge,
} from "@/components/ui/common";

interface InitialStatus {
  connected: boolean;
  chatId?: string;
  notifyBriefing: boolean;
  notifyFollowups: boolean;
  notifyInbound: boolean;
  setupAt?: string;
}

export function TelegramSetup({
  initialStatus,
}: {
  initialStatus: InitialStatus;
}) {
  const [token, setToken] = useState("");
  const [manualChatId, setManualChatId] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function connect() {
    setError(null);
    setInfo(null);
    if (!token.trim()) return setError("Bot token je obavezan");
    startTransition(async () => {
      const res = await setupTelegram(
        token.trim(),
        manualChatId.trim() || undefined,
      );
      if (!res.ok || !res.chatId) {
        setError(res.error ?? "Setup greška");
        return;
      }
      setStatus({
        ...status,
        connected: true,
        chatId: res.chatId,
        setupAt: new Date().toISOString(),
      });
      setToken("");
      setManualChatId("");
      setInfo("Spojeno! Provjeri Telegram — trebao si dobiti potvrdu.");
    });
  }

  function sendTest() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await sendTestTelegram();
      if (!res.ok) {
        setError(res.error ?? "Test greška");
        return;
      }
      setInfo("Test poslan. Provjeri Telegram.");
    });
  }

  function togglePref(
    key: "notifyBriefing" | "notifyFollowups" | "notifyInbound",
  ) {
    const next = !status[key];
    setStatus({ ...status, [key]: next });
    startTransition(async () => {
      await updateTelegramPrefs({ [key]: next });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-400/10 text-2xl">
          📲
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">Telegram Push</h2>
          <p className="text-xs text-text-muted">
            Daily briefing + follow-ups + inbox notifikacije direktno na mobitel
          </p>
        </div>
        {status.connected && (
          <Badge tone="success">
            <Check size={9} className="-mt-0.5 inline" /> Connected
          </Badge>
        )}
      </div>

      {!status.connected ? (
        <div className="space-y-4 rounded-xl border border-border bg-bg-card/40 p-5">
          <ol className="space-y-2 text-sm text-text-dim">
            <li>
              <span className="text-blue-400">1.</span> Otvori Telegram → traži{" "}
              <a
                className="text-blue-400 underline"
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
              >
                @BotFather
              </a>
            </li>
            <li>
              <span className="text-blue-400">2.</span> Pošalji{" "}
              <code className="rounded bg-bg px-1">/newbot</code> → daj naziv +
              username (mora završiti s &ldquo;bot&rdquo;)
            </li>
            <li>
              <span className="text-blue-400">3.</span> Kopiraj{" "}
              <strong className="text-text">bot token</strong>koji ti je
              BotFather poslao
            </li>
            <li>
              <span className="text-blue-400">4.</span> Otvori svoj novi bot u
              Telegramu i klikni <strong>Start</strong> (ili pošalji &ldquo;hi&rdquo;)
            </li>
            <li>
              <span className="text-blue-400">5.</span> Paste-aj token ovdje —
              chat_id ću ja automatski dohvatiti
            </li>
          </ol>

          <Field
            label="Bot Token *"
            hint="Format: 1234567890:ABCDef… Token se pohranjuje šifriran (RLS owner-only)."
          >
            <input
              type="password"
              className="input font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="1234567890:ABCDef…"
            />
          </Field>

          <Field
            label="Chat ID (optional, override)"
            hint="Ako auto-detect ne radi, otvori https://api.telegram.org/bot<TOKEN>/getUpdates u browseru i kopiraj numerički chat.id"
          >
            <input
              className="input text-xs"
              value={manualChatId}
              onChange={(e) => setManualChatId(e.target.value)}
              placeholder="npr. 123456789"
            />
          </Field>

          <ErrorBanner message={error} />
          {info && (
            <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              {info}
            </div>
          )}

          <div className="flex justify-end">
            <PrimaryButton
              onClick={connect}
              disabled={pending}
              type="button"
              icon={<Send size={14} />}
            >
              {pending ? "Connecting…" : "Connect Telegram"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 text-sm text-success">
            <Check size={18} />
            Telegram connected
            {status.chatId && (
              <span className="text-text-dim">
                · chat_id <code className="rounded bg-bg-card px-1">{status.chatId}</code>
              </span>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-bg/40 p-3">
            <div className="text-[11px] uppercase tracking-wider text-text-muted">
              Push notifikacije
            </div>
            {[
              {
                key: "notifyBriefing" as const,
                label: "Daily Briefing",
                desc: "Jutarnji briefing s top 5 akcija (07:00)",
              },
              {
                key: "notifyFollowups" as const,
                label: "Auto Follow-ups",
                desc: "Spremni follow-up draft-ovi za silent leadove (06:30)",
              },
              {
                key: "notifyInbound" as const,
                label: "Smart Inbox",
                desc: "Kad triage-aš inbound poruku, push na mobitel",
              },
            ].map((p) => (
              <label
                key={p.key}
                className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-bg-card/40"
              >
                <input
                  type="checkbox"
                  checked={status[p.key]}
                  onChange={() => togglePref(p.key)}
                  className="mt-1 accent-blue-400"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {status[p.key] ? (
                      <Bell size={12} className="text-blue-400" />
                    ) : (
                      <BellOff size={12} className="text-text-muted" />
                    )}
                    <span className="text-sm text-text">{p.label}</span>
                  </div>
                  <p className="text-[11px] text-text-dim">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">
              {status.setupAt && (
                <>Setup: {new Date(status.setupAt).toLocaleString("hr-HR")}</>
              )}
            </span>
            <button
              onClick={sendTest}
              disabled={pending}
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-blue-400/40 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:border-blue-400/70 hover:bg-blue-400/20 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              {pending ? "Šaljem…" : "Send test message"}
            </button>
          </div>

          <ErrorBanner message={error} />
          {info && (
            <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              {info}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
