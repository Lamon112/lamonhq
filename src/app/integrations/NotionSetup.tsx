"use client";

import { useState, useTransition } from "react";
import { Check, BookOpen } from "lucide-react";
import { setupNotionSync } from "@/app/actions/notionSync";
import {
  Field,
  PrimaryButton,
  ErrorBanner,
  Badge,
} from "@/components/ui/common";

interface InitialStatus {
  connected: boolean;
  activityLogDbId?: string;
  klijentiDbId?: string;
  pipelineDbId?: string;
  setupAt?: string;
}

export function NotionSetup({
  initialStatus,
}: {
  initialStatus: InitialStatus;
}) {
  const [token, setToken] = useState("");
  const [parentPage, setParentPage] = useState("");
  const [klijenti, setKlijenti] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);

  function connect() {
    setError(null);
    if (!token.trim()) return setError("Notion integration token je obavezan");
    startTransition(async () => {
      const res = await setupNotionSync(
        token.trim(),
        parentPage.trim() || undefined,
        klijenti.trim() || undefined,
        pipeline.trim() || undefined,
      );
      if (!res.ok) {
        setError(res.error ?? "Notion setup greška");
        return;
      }
      setStatus({
        connected: true,
        activityLogDbId: res.activityLogDbId,
        klijentiDbId: klijenti.trim() || status.klijentiDbId,
        pipelineDbId: pipeline.trim() || status.pipelineDbId,
        setupAt: new Date().toISOString(),
      });
      setToken("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-2xl">
          📓
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">Notion</h2>
          <p className="text-xs text-text-muted">
            Sve aktivnosti iz HQ se auto-loguju u Notion Activity Log
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
                href="https://www.notion.so/profile/integrations"
                target="_blank"
                rel="noreferrer"
              >
                notion.so/profile/integrations
              </a>{" "}
              → New integration → naziv &ldquo;Lamon HQ&rdquo; → Save
            </li>
            <li>
              <span className="text-gold">2.</span> Otvori Lamon Command Center
              page u Notionu → ··· (top right) → Connections → dodaj &ldquo;Lamon
              HQ&rdquo;
            </li>
            <li>
              <span className="text-gold">3.</span> Copy &ldquo;Internal
              Integration Token&rdquo; (ntn_…) i paste-aj ovdje
            </li>
            <li>
              <span className="text-gold">4.</span> Klikni Connect — ja ću
              automatski stvoriti &ldquo;📓 Lamon HQ Activity Log&rdquo; database
            </li>
          </ol>

          <Field
            label="Notion Internal Integration Token *"
            hint="Token se pohranjuje šifriran u našoj bazi (RLS owner-only)."
          >
            <input
              type="password"
              className="input font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ntn_…"
            />
          </Field>

          <Field
            label="Parent page URL (optional)"
            hint="Default: Lamon Command Center. Override samo ako želiš drugu parent stranicu."
          >
            <input
              className="input text-xs"
              value={parentPage}
              onChange={(e) => setParentPage(e.target.value)}
              placeholder="https://www.notion.so/Lamon-Command-Center-…"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Klijenti DB URL (optional)"
              hint="Ako mapiraš, novi klijent ide i u tvoj postojeći Klijenti DB."
            >
              <input
                className="input text-xs"
                value={klijenti}
                onChange={(e) => setKlijenti(e.target.value)}
                placeholder="https://www.notion.so/…?v=…"
              />
            </Field>
            <Field
              label="Pipeline DB URL (optional)"
              hint="Ako mapiraš, novi lead ide i u tvoj postojeći Pipeline DB."
            >
              <input
                className="input text-xs"
                value={pipeline}
                onChange={(e) => setPipeline(e.target.value)}
                placeholder="https://www.notion.so/…?v=…"
              />
            </Field>
          </div>

          <ErrorBanner message={error} />

          <div className="flex justify-end">
            <PrimaryButton
              onClick={connect}
              disabled={pending}
              type="button"
              icon={<BookOpen size={14} />}
            >
              {pending ? "Connecting…" : "Connect Notion"}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 text-sm text-success">
            <Check size={18} />
            Notion connected
            {status.setupAt && (
              <span className="text-text-dim">
                · setup {new Date(status.setupAt).toLocaleString("hr-HR")}
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-text-dim">
            <p>
              <strong className="text-text">Activity Log DB:</strong>{" "}
              <code className="rounded bg-bg-card px-1.5 py-0.5 text-[11px]">
                {status.activityLogDbId ?? "—"}
              </code>
            </p>
            {status.klijentiDbId && (
              <p>
                <strong className="text-text">Klijenti DB:</strong>{" "}
                <code className="rounded bg-bg-card px-1.5 py-0.5 text-[11px]">
                  {status.klijentiDbId}
                </code>
              </p>
            )}
            {status.pipelineDbId && (
              <p>
                <strong className="text-text">Pipeline DB:</strong>{" "}
                <code className="rounded bg-bg-card px-1.5 py-0.5 text-[11px]">
                  {status.pipelineDbId}
                </code>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-bg/40 p-3 text-[11px] text-text-dim">
            <strong className="text-text">Što se sinkronizira:</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                <strong>Outreach poslan</strong> → row u Activity Log
              </li>
              <li>
                <strong>Lead scored</strong> → row sa ICP scorom
              </li>
              <li>
                <strong>Klijent dodan</strong> → row sa MRR
              </li>
              <li>
                <strong>Deal WON</strong> → row 🎉
              </li>
              <li>
                <strong>Weekly report sent</strong> → row sa summary-jem
              </li>
            </ul>
            <p className="mt-2 text-text-muted">
              Fire-and-forget — ako Notion fail-a, HQ nastavlja raditi normalno.
            </p>
          </div>

          <div className="text-[11px] text-text-muted">
            Da promijeniš token ili re-mapiraš DB-ove, klikni gumb i submit-aj
            ponovno.
          </div>
        </div>
      )}
    </div>
  );
}
