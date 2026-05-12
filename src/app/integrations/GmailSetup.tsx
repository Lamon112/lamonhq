"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Mail, Plug, AlertTriangle, Loader2 } from "lucide-react";
import { disconnectGmail } from "@/app/actions/gmail";
import { Badge } from "@/components/ui/common";

interface InitialStatus {
  connected: boolean;
  email?: string;
  setupAt?: string;
}

export function GmailSetup({
  initialStatus,
}: {
  initialStatus: InitialStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const params = useSearchParams();
  const justConnected = params?.get("gmail") === "connected";
  const oauthError = params?.get("gmail_error");

  function startOAuth() {
    window.location.href = "/api/integrations/gmail/start";
  }

  function disconnect() {
    if (!confirm("Diskonektat Gmail? Outreach Lab više neće slati emailove.")) return;
    startTransition(async () => {
      const res = await disconnectGmail();
      if (res.ok) {
        setStatus({ connected: false });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-2xl">
          📧
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">
            Gmail Send
            <span className="ml-2 text-sm text-text-muted">via OAuth</span>
          </h2>
          <p className="text-xs text-text-muted">
            Stvarno slanje outreach emailova iz tvog Gmail accounta —
            preporučljivo: leonardo@lamon.io
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
              <span className="text-red-400">1.</span> Klikni{" "}
              <strong className="text-text">Connect Gmail</strong> ispod
            </li>
            <li>
              <span className="text-red-400">2.</span> Google ti pokazuje
              consent screen — odaberi{" "}
              <strong className="text-text">leonardo@lamon.io</strong>{" "}
              account
            </li>
            <li>
              <span className="text-red-400">3.</span> Daj HQ-u permission za{" "}
              <code className="rounded bg-bg px-1 text-[11px]">gmail.send</code>{" "}
              scope (samo slanje, ne čitanje inboxa)
            </li>
            <li>
              <span className="text-red-400">4.</span> Vrati se ovdje — tokeni
              se pohranjuju enkriptirani u Supabase (RLS owner-only)
            </li>
          </ol>

          {oauthError && (
            <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              <AlertTriangle size={12} className="-mt-0.5 mr-1 inline" />
              OAuth greška: <code>{oauthError}</code>
            </div>
          )}
          {justConnected && (
            <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
              <Check size={12} className="-mt-0.5 mr-1 inline" />
              Gmail spojen — refresh stranice ili scroll-aj na status karticu.
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={startOAuth}
              type="button"
              className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:border-red-500/70 hover:bg-red-500/20"
            >
              <Plug size={14} />
              Connect Gmail
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 text-sm text-success">
            <Check size={18} />
            Gmail connected
            {status.email && (
              <span className="text-text-dim">
                · <strong className="text-text">{status.email}</strong>
              </span>
            )}
          </div>

          <div className="space-y-1 text-[11px] text-text-dim">
            <p>
              <strong className="text-text">Scope:</strong>{" "}
              <code className="rounded bg-bg-card px-1">gmail.send</code> +{" "}
              <code className="rounded bg-bg-card px-1">userinfo.email</code>{" "}
              (HQ ne može čitati inbox, samo slati)
            </p>
            {status.setupAt && (
              <p>
                <strong className="text-text">Setup:</strong>{" "}
                {new Date(status.setupAt).toLocaleString("hr-HR")}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-bg/40 p-3 text-[11px] text-text-dim">
            <strong className="text-text flex items-center gap-1">
              <Mail size={12} /> Što se događa kad klikneš Send u Outreach Lab-u
            </strong>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>
                AI poruka iz HQ-a se RFC822-encodira (UTF-8 safe za ć, š, đ)
              </li>
              <li>
                POST na <code>gmail.googleapis.com/v1/.../messages/send</code>
              </li>
              <li>Email odlazi iz {status.email} → recipient</li>
              <li>Sent folder u tvom Gmailu sadrži kopiju</li>
              <li>Replies dolaze u tvoj Gmail inbox (ne kroz HQ)</li>
              <li>HQ loga outreach + Notion sync + +5 XP + Jarvis push</li>
            </ol>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={disconnect}
              disabled={pending}
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-muted hover:border-danger/40 hover:text-danger disabled:opacity-50"
            >
              {pending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plug size={12} />
              )}
              Disconnect Gmail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
