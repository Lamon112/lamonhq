"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import { Database, Eye, Plus, Check, AlertTriangle } from "lucide-react";
import {
  importClientsAction,
  importLeadsAction,
  previewNotionAction,
  type ImportResult,
  type Mapping,
} from "@/app/actions/notion";
import {
  Field,
  PrimaryButton,
  GhostButton,
  Badge,
  ErrorBanner,
} from "@/components/ui/common";
import type { NotionPreview } from "@/lib/notion";

type Target = "clients" | "leads";

const TARGET_LABEL = {
  clients: "Klijenti",
  leads: "Leads / Pipeline",
};

const HQ_FIELDS_CLIENTS = [
  { id: "name", label: "Name *", required: true },
  { id: "type", label: "Type (clinic/coach/affiliate)" },
  { id: "status", label: "Status (active/onboarding/paused/churned)" },
  { id: "monthly_revenue", label: "Monthly revenue (€)" },
  { id: "start_date", label: "Start date" },
  { id: "next_action", label: "Next action" },
  { id: "churn_risk", label: "Churn risk (low/medium/high)" },
  { id: "notes", label: "Notes" },
];

const HQ_FIELDS_LEADS = [
  { id: "name", label: "Name *", required: true },
  { id: "source", label: "Source (linkedin/instagram/tiktok/referral)" },
  { id: "niche", label: "Niche (stomato/estetska/fizio/coach)" },
  { id: "icp_score", label: "ICP score (0-20)" },
  { id: "stage", label: "Stage (discovery/pricing/booking/closed)" },
  { id: "estimated_value", label: "Estimated value (€)" },
  { id: "next_action", label: "Next action" },
  { id: "notes", label: "Notes" },
];

export function ImportClient() {
  const [target, setTarget] = useState<Target>("clients");
  const [token, setToken] = useState("");
  const [dbInput, setDbInput] = useState("");
  const [preview, setPreview] = useState<NotionPreview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fields = target === "clients" ? HQ_FIELDS_CLIENTS : HQ_FIELDS_LEADS;

  function doPreview() {
    setError(null);
    setResult(null);
    if (!token.trim()) return setError("Notion token je obavezan");
    if (!dbInput.trim()) return setError("Notion DB URL ili ID je obavezan");
    startTransition(async () => {
      const res = await previewNotionAction(token, dbInput, target);
      if (!res.ok) {
        setError(res.error ?? "Notion preview greška");
        setPreview(null);
        return;
      }
      setPreview(res);
      setMapping(res.suggestedMapping ?? {});
    });
  }

  function doImport() {
    setError(null);
    setResult(null);
    if (!preview || !mapping.name) {
      return setError("Mapiraj barem 'name' polje prije importa");
    }
    startTransition(async () => {
      const fn =
        target === "clients" ? importClientsAction : importLeadsAction;
      const res = await fn(token, dbInput, mapping);
      setResult(res);
    });
  }

  function reset() {
    setPreview(null);
    setMapping({});
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Target selector */}
      <div className="flex items-center gap-2">
        {(["clients", "leads"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTarget(t);
              reset();
            }}
            className={
              "rounded-lg border px-4 py-2 text-sm transition-colors " +
              (target === t
                ? "border-gold bg-gold/10 text-gold"
                : "border-border bg-bg-card text-text-dim hover:border-gold/40")
            }
          >
            {TARGET_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-bg-card/40 p-5">
        <div className="text-xs uppercase tracking-wider text-text-muted">
          Korak 1 · Notion token + database
        </div>

        <Field
          label="Notion integration secret *"
          hint="Stvorit ovdje: notion.so/my-integrations · Ne pohranjuje se nikad — samo za ovu sesiju."
        >
          <input
            type="password"
            className="input font-mono text-xs"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ntn_… ili secret_…"
          />
        </Field>

        <Field
          label={`URL ${TARGET_LABEL[target]} databaze *`}
          hint="Otvoriš DB u Notion-u, copy-aj URL iz address bar-a. Prije imaš kliknuti '···' → 'Connect to integration' i odabrati ovu integraciju."
        >
          <input
            className="input font-mono text-xs"
            value={dbInput}
            onChange={(e) => setDbInput(e.target.value)}
            placeholder="https://www.notion.so/workspace/abc123def456..."
          />
        </Field>

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-2">
          {preview && (
            <GhostButton onClick={reset}>Reset</GhostButton>
          )}
          <PrimaryButton
            onClick={doPreview}
            disabled={pending}
            icon={<Eye size={14} />}
            type="button"
          >
            {pending && !preview ? "Loading…" : preview ? "Re-preview" : "Preview"}
          </PrimaryButton>
        </div>
      </div>

      <AnimatePresence>
        {preview?.ok && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-xl border border-gold/30 bg-bg-card/40 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-text-muted">
                  Korak 2 · Mapiranje polja
                </div>
                <div className="text-sm font-medium text-text">
                  {preview.dbTitle} ·{" "}
                  <span className="text-text-muted">
                    {preview.columns?.length} kolona, preview{" "}
                    {preview.rows?.length} redova
                  </span>
                </div>
              </div>
              <Badge tone="success">
                <Database size={10} className="-mt-0.5 inline" /> connected
              </Badge>
            </div>

            <div className="space-y-2">
              {fields.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-3"
                >
                  <span className="text-xs text-text-dim">{f.label}</span>
                  <select
                    className="input sm:col-span-2"
                    value={mapping[f.id] ?? ""}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [f.id]: e.target.value || null,
                      })
                    }
                  >
                    <option value="">— preskoči —</option>
                    {preview.columns?.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {preview.rows && preview.rows.length > 0 && (
              <details className="rounded-lg border border-border bg-bg p-3">
                <summary className="cursor-pointer text-xs text-text-muted">
                  Preview prvih {preview.rows.length} redova (raw)
                </summary>
                <pre className="mt-2 overflow-x-auto text-[10px] text-text-dim">
                  {JSON.stringify(preview.rows, null, 2)}
                </pre>
              </details>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Duplikati po imenu (case-insensitive) se preskoči. Statusi i
                tipovi se mapiraju heuristički, ostalo ide kako je.
              </p>
              <PrimaryButton
                onClick={doImport}
                disabled={pending || !mapping.name}
                icon={<Plus size={14} />}
                type="button"
              >
                {pending ? "Importing…" : `Import → ${TARGET_LABEL[target]}`}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              "rounded-xl border p-5 " +
              (result.ok
                ? "border-success/30 bg-success/5"
                : "border-danger/30 bg-danger/5")
            }
          >
            <div className="text-xs uppercase tracking-wider text-text-muted">
              Korak 3 · Rezultat importa
            </div>
            {result.ok ? (
              <>
                <div className="mt-2 flex items-center gap-3 text-sm text-text">
                  <Check className="text-success" size={18} />
                  <span>
                    <strong className="text-success">
                      {result.imported}
                    </strong>{" "}
                    importano,{" "}
                    <strong className="text-warning">
                      {result.skipped}
                    </strong>{" "}
                    duplikata preskočeno,{" "}
                    <strong className="text-danger">{result.failed}</strong>{" "}
                    grešaka.
                  </span>
                </div>
                {result.failures && result.failures.length > 0 && (
                  <details className="mt-3 rounded-lg border border-border bg-bg p-3">
                    <summary className="cursor-pointer text-xs text-text-muted">
                      Detalji grešaka
                    </summary>
                    <ul className="mt-2 space-y-1 text-[11px] text-text-dim">
                      {result.failures.slice(0, 50).map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle size={11} className="mt-0.5 text-danger" />
                          <span>
                            <code className="text-text-muted">{f.name}</code>:{" "}
                            {f.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <p className="mt-3 text-xs text-text-muted">
                  Vrati se u HQ — nove zapise vidiš u top resource baru i u
                  odgovarajućoj sobi.
                </p>
              </>
            ) : (
              <div className="mt-2 flex items-start gap-2 text-sm text-danger">
                <AlertTriangle size={16} className="mt-0.5" />
                {result.error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick instructions */}
      <details className="rounded-xl border border-dashed border-border bg-bg-card/30 p-4 text-xs text-text-dim">
        <summary className="cursor-pointer text-text-muted">
          Kako stvoriti Notion integraciju (3 min)
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Otvori{" "}
            <a
              className="text-gold underline"
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noreferrer"
            >
              notion.so/my-integrations
            </a>
          </li>
          <li>
            <strong>+ New integration</strong> · Name: &ldquo;Lamon HQ
            Import&rdquo; · Type: Internal · Submit
          </li>
          <li>Copy-aj &ldquo;Internal Integration Secret&rdquo;</li>
          <li>
            Otvori svoju Notion databazu (npr. Klijenti) → top-right{" "}
            <code>···</code> → <strong>Connect to integration</strong> →
            odaberi &ldquo;Lamon HQ Import&rdquo;
          </li>
          <li>Copy URL iz browsera ovdje</li>
          <li>Klikni Preview → mapiraj polja → Import</li>
          <li>Ponovi za Pipeline / Leads DB</li>
        </ol>
      </details>
    </div>
  );
}
