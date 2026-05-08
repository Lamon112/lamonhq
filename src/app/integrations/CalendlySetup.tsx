"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { Calendar, Check, AlertTriangle, Copy } from "lucide-react";
import { setupCalendlyWebhook } from "@/app/actions/calendly";
import {
  Field,
  PrimaryButton,
  ErrorBanner,
  Badge,
} from "@/components/ui/common";

interface InitialStatus {
  connected: boolean;
  email?: string;
  webhookUri?: string;
  signingKey?: string;
}

export function CalendlySetup({
  initialStatus,
}: {
  initialStatus: InitialStatus;
}) {
  const [token, setToken] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [signingKey, setSigningKey] = useState<string | null>(
    initialStatus.signingKey ?? null,
  );

  function connect() {
    setError(null);
    if (!token.trim()) return setError("Calendly Personal Access Token je obavezan");
    startTransition(async () => {
      const res = await setupCalendlyWebhook(token);
      if (!res.ok && !res.error?.includes("re-saved")) {
        setError(res.error ?? "Calendly setup greška");
        return;
      }
      setStatus({
        connected: true,
        webhookUri: res.webhookId,
        signingKey: res.signingKey,
      });
      if (res.signingKey) setSigningKey(res.signingKey);
      setToken("");
    });
  }

  function copyKey() {
    if (signingKey) {
      navigator.clipboard.writeText(signingKey);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-2xl">
          📅
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">Calendly</h2>
          <p className="text-xs text-text-muted">
            Discovery call bookings auto-stizu u Discovery Bay sobu
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
              <span className="text-gold">1.</span> Idi na{" "}
              <a
                className="text-gold underline"
                href="https://calendly.com/integrations/api_webhooks"
                target="_blank"
                rel="noreferrer"
              >
                calendly.com/integrations/api_webhooks
              </a>
            </li>
            <li>
              <span className="text-gold">2.</span> &ldquo;Generate New
              Token&rdquo; → daj mu naziv &ldquo;Lamon HQ&rdquo; → copy
            </li>
            <li>
              <span className="text-gold">3.</span> Paste-aj token ovdje i
              klikni Connect — ja ću automatski kreirati webhook subscription
            </li>
          </ol>

          <Field
            label="Calendly Personal Access Token *"
            hint="Token se pohranjuje šifriran u našoj bazi (RLS owner-only). Možeš ga revoke-ati kasnije iz Calendly settings."
          >
            <input
              type="password"
              className="input font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJ…"
            />
          </Field>

          <ErrorBanner message={error} />

          <div className="flex justify-end">
            <PrimaryButton
              onClick={connect}
              disabled={pending}
              type="button"
              icon={<Calendar size={14} />}
            >
              {pending ? "Connecting…" : "Connect Calendly"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 text-sm text-success">
            <Check size={18} />
            Calendly connected
            {status.email && <span className="text-text-dim">· {status.email}</span>}
          </div>

          <div className="space-y-2 text-xs text-text-dim">
            <p>
              <strong className="text-text">Webhook endpoint:</strong>{" "}
              <code className="rounded bg-bg-card px-1.5 py-0.5 text-[11px]">
                {process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app"}
                /api/webhooks/calendly
              </code>
            </p>
            <p>
              <strong className="text-text">Subscribed events:</strong>{" "}
              <Badge tone="gold">invitee.created</Badge>{" "}
              <Badge tone="gold">invitee.canceled</Badge>
            </p>
          </div>

          {signingKey && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-warning">
                <AlertTriangle size={12} />
                Webhook signing key — JEDAN KORAK PREOSTAO
              </div>
              <p className="mb-2 text-[11px] text-text-dim">
                Da webhook bude verificiran, dodaj ovaj key u Vercel
                <br />
                <code className="text-text">
                  Settings → Environment Variables → CALENDLY_WEBHOOK_SIGNING_KEY
                </code>
                <br />
                Ako ne dodaš, webhook svejedno radi (bez verifikacije) — ali
                preporučljivo je za sigurnost.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={signingKey}
                  className="input font-mono text-[10px]"
                />
                <button
                  onClick={copyKey}
                  className="rounded-md border border-border bg-bg-card p-2 text-text-dim hover:border-gold/50 hover:text-text"
                  title="Copy"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-bg/40 p-3 text-[11px] text-text-dim">
            <strong className="text-text">Što se događa kad netko book-a:</strong>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>Calendly šalje event na naš webhook</li>
              <li>Match-am po emailu na postojećeg lead-a (ili kreiram novog)</li>
              <li>
                Postavljam <code>discovery_at</code> na booking time
              </li>
              <li>
                Vidiš ga u <strong>Discovery Bay → Upcoming</strong>
              </li>
              <li>
                Activity log: <code>calendly_booking_created</code>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
