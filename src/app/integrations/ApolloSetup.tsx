"use client";

import { useState, useTransition } from "react";
import { Check, Plug, Loader2, Search } from "lucide-react";
import { setupApollo, disconnectApollo } from "@/app/actions/apollo";
import {
  Field,
  PrimaryButton,
  ErrorBanner,
  Badge,
} from "@/components/ui/common";

interface InitialStatus {
  connected: boolean;
  email?: string;
  setupAt?: string;
}

export function ApolloSetup({
  initialStatus,
}: {
  initialStatus: InitialStatus;
}) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function connect() {
    setError(null);
    setInfo(null);
    if (!apiKey.trim()) return setError("API key je obavezan");
    startTransition(async () => {
      const res = await setupApollo(apiKey.trim());
      if (!res.ok) {
        setError(res.error ?? "Apollo setup greška");
        return;
      }
      setStatus({
        connected: true,
        email: res.email,
        setupAt: new Date().toISOString(),
      });
      setApiKey("");
      setInfo("Spojeno. Otvori Lead Scorer → Discover tab za search prospekata.");
    });
  }

  function disconnect() {
    if (!confirm("Diskonektat Apollo? Lead Discovery više neće raditi.")) return;
    startTransition(async () => {
      const res = await disconnectApollo();
      if (res.ok) setStatus({ connected: false });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/10 text-2xl">
          🔍
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">
            Apollo.io
            <span className="ml-2 text-sm text-text-muted">B2B lead discovery</span>
          </h2>
          <p className="text-xs text-text-muted">
            Pronađi vlasnike/direktore klinika u HR/EU + auto-import u Pipeline
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
              <span className="text-orange-400">1.</span> Idi na{" "}
              <a
                className="text-orange-400 underline"
                href="https://developer.apollo.io/keys"
                target="_blank"
                rel="noreferrer"
              >
                developer.apollo.io/keys
              </a>{" "}
              (logiraj se kao Lamon Business)
            </li>
            <li>
              <span className="text-orange-400">2.</span> Klikni{" "}
              <strong className="text-text">+ Create new key</strong>
            </li>
            <li>
              <span className="text-orange-400">3.</span> Naziv: &ldquo;Lamon
              HQ&rdquo;, scope: <em>All</em> (read + match)
            </li>
            <li>
              <span className="text-orange-400">4.</span> Copy <strong className="text-text">API key</strong> i paste-aj ovdje
            </li>
          </ol>

          <Field
            label="Apollo API Key *"
            hint="Free tier: 100 credits/mj. Search je free, samo email reveal košta 1 credit po kontaktu."
          >
            <input
              type="password"
              className="input font-mono text-xs"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="apo_…"
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
              icon={<Plug size={14} />}
            >
              {pending ? "Validiram…" : "Connect Apollo"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 text-sm text-success">
            <Check size={18} />
            Apollo connected
            {status.email && (
              <span className="text-text-dim">
                · <strong className="text-text">{status.email}</strong>
              </span>
            )}
          </div>

          <div className="rounded-lg border border-border bg-bg/40 p-3 text-[11px] text-text-dim">
            <strong className="text-text flex items-center gap-1">
              <Search size={12} /> Kako koristiti
            </strong>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>
                Otvori HQ → <strong>Lead Scorer</strong> sobu → tab{" "}
                <strong>Discover</strong>
              </li>
              <li>
                Filteri: niche keyword (npr. &ldquo;klinika&rdquo;,
                &ldquo;dental&rdquo;, &ldquo;estetska&rdquo;) + city + decision
                maker title-ovi
              </li>
              <li>
                Klik <strong>Search</strong> — Apollo vrati listu osoba s
                organization data + LinkedIn URL
              </li>
              <li>
                Klik <strong>+ Add to pipeline</strong> per row → kreira lead u
                HQ Discovery stage-u, optional reveal email (1 credit)
              </li>
            </ol>
            <p className="mt-2 text-text-muted">
              <strong>Free tier:</strong> 100 credits/mj, search je free, samo
              email reveal koristi credit.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">
              {status.setupAt && (
                <>Setup: {new Date(status.setupAt).toLocaleString("hr-HR")}</>
              )}
            </span>
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
              Disconnect
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
