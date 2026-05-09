"use client";

/**
 * Side drawer that slides in when a completed action is selected (either
 * just finished, or clicked from past actions list). Shows full markdown
 * result + sources + Notion link.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { getAction } from "@/app/actions/agentResearch";
import { HolmesPipelineCards } from "./HolmesPipelineCards";

const HOLMES_PIPELINE_ACTION = "holmes.b2b_10_leads_pipeline";
const HOLMES_PIPELINE_EXPECTED = 10;

interface ResearchResultDrawerProps {
  actionRowId: string | null;
  onClose: () => void;
}

interface FullActionRow {
  id: string;
  room: string;
  action_type: string;
  title: string;
  status: string;
  progress_text: string | null;
  result_md: string | null;
  summary: string | null;
  sources: Array<{ title: string; url: string }> | null;
  tags: string[] | null;
  notion_page_id: string | null;
  error_text: string | null;
  created_at: string;
  completed_at: string | null;
  usage: {
    cost_eur?: number;
    cost_usd?: number;
    web_search_calls?: number;
    apollo_calls?: number;
    places_calls?: number;
    lead_ids?: string[];
  } | null;
}

export function ResearchResultDrawer({
  actionRowId,
  onClose,
}: ResearchResultDrawerProps) {
  return (
    <AnimatePresence>
      {actionRowId && <DrawerInner actionRowId={actionRowId} onClose={onClose} />}
    </AnimatePresence>
  );
}

function DrawerInner({
  actionRowId,
  onClose,
}: {
  actionRowId: string;
  onClose: () => void;
}) {
  const [row, setRow] = useState<FullActionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // Reset to pristine "loading" state when the drawer is reopened
    // for a different action row (without unmount in between).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRow(null);

    function load() {
      getAction(actionRowId).then((res) => {
        if (!alive) return;
        if (res.ok) setRow(res.row as FullActionRow);
        setLoading(false);
      });
    }
    load();

    // Re-poll every 4s while still running (covers case: drawer opened
    // mid-run before Realtime hook in parent updates it)
    const interval = setInterval(() => {
      if (!alive) return;
      if (row && (row.status === "completed" || row.status === "failed")) return;
      load();
    }, 4000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
    // We intentionally exclude `row` from deps to avoid re-creating the
    // interval on every poll cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionRowId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col border-l-2 border-amber-500/40 bg-bg-elevated/98 backdrop-blur-md shadow-[-12px_0_60px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-strong px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Research Result
            </div>
            <h2 className="mt-0.5 truncate text-base font-semibold text-text">
              {row?.title ?? (loading ? "Loading…" : "Not found")}
            </h2>
            {row && <StatusBadge row={row} />}
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-bg-card p-1.5 text-text-muted hover:border-gold/50 hover:text-text"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {loading && !row && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Loading rezultat…
            </div>
          )}
          {row?.status === "running" && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-amber-200">
                <Loader2 size={14} className="animate-spin" />
                {row.progress_text ?? "Istraživanje u tijeku…"}
              </div>
              <p className="mt-2 text-[11px] text-text-muted">
                Tipično traje 2-5 min. Možeš zatvoriti drawer — animacija u sobi
                ostaje aktivna i Notion zapis se sprema na kraju automatski.
              </p>
            </div>
          )}
          {row?.status === "queued" && (
            <div className="text-sm text-text-muted">
              Akcija je u redu čekanja. Pokretanje će započeti za par sekundi…
            </div>
          )}
          {row?.status === "failed" && (
            <div className="rounded-md border border-danger/40 bg-danger/10 p-3">
              <div className="flex items-center gap-2 text-sm text-danger">
                <AlertCircle size={14} /> Akcija nije uspjela
              </div>
              {row.error_text && (
                <p className="mt-2 font-mono text-[11px] text-rose-200/90 whitespace-pre-wrap">
                  {row.error_text}
                </p>
              )}
            </div>
          )}
          {row?.status === "completed" && (
            <>
              {row.summary && (
                <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                    Summary
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-text">
                    {row.summary}
                  </p>
                </div>
              )}
              {row.tags && row.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {row.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-border bg-bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {row.action_type === HOLMES_PIPELINE_ACTION ? (
                <>
                  <HolmesPartialNote
                    actualCount={row.usage?.lead_ids?.length ?? 0}
                    costEur={row.usage?.cost_eur}
                  />
                  <HolmesPipelineCards actionRowId={row.id} />
                </>
              ) : (
                row.result_md && <ResultMarkdown source={row.result_md} />
              )}
              {row.sources && row.sources.length > 0 && (
                <div className="mt-4 border-t border-border-strong pt-3">
                  <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    Cited sources ({row.sources.length})
                  </h4>
                  <ul className="space-y-1">
                    {row.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-2 text-[11px] text-cyan-300 hover:underline"
                        >
                          <ExternalLink size={10} className="mt-0.5 shrink-0" />
                          <span>{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with cost pill + Notion link */}
        {row?.status === "completed" && (
          <div className="border-t border-border-strong px-4 py-3 space-y-2">
            {/* Cost / runtime pills */}
            {row.usage && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted">
                {typeof row.usage.cost_eur === "number" && (
                  <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono font-bold text-emerald-300">
                    €{row.usage.cost_eur.toFixed(row.usage.cost_eur < 1 ? 3 : 2)}
                  </span>
                )}
                {row.completed_at && (
                  <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono">
                    {Math.round(
                      (new Date(row.completed_at).getTime() -
                        new Date(row.created_at).getTime()) /
                        1000,
                    )}
                    s
                  </span>
                )}
                {typeof row.usage.web_search_calls === "number" &&
                  row.usage.web_search_calls > 0 && (
                    <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono">
                      🔍 {row.usage.web_search_calls}
                    </span>
                  )}
                {typeof row.usage.apollo_calls === "number" &&
                  row.usage.apollo_calls > 0 && (
                    <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono">
                      Apollo {row.usage.apollo_calls}
                    </span>
                  )}
              </div>
            )}
            {/* Notion link */}
            {row.notion_page_id && (
              <a
                href={`https://www.notion.so/${row.notion_page_id.replace(/-/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-200 hover:border-purple-400 hover:bg-purple-500/15"
              >
                <ExternalLink size={12} /> Open in Notion → 🧠 Knowledge Insights
              </a>
            )}
          </div>
        )}
      </motion.aside>
    </>
  );
}

/**
 * Drop the first TL;DR / Sažetak / Summary heading and its body. The green
 * Summary box above the markdown already shows this — keeping it here is
 * pure repetition for Leonardo. Conservative: only matches an H1/H2/H3
 * heading at the very start, then everything up to the next heading or end.
 */
function stripLeadingTldr(md: string): string {
  return md.replace(
    /^\s*#{1,3}\s*(?:TL;?DR|Sa[zž]etak|Summary|Sa[zž]etak)\b[^\n]*\n[\s\S]*?(?=\n#{1,3}\s|$)/i,
    "",
  );
}

function ResultMarkdown({ source }: { source: string }) {
  // Strip noise Claude often adds:
  //   - standalone `---` separator lines
  //   - doubled blank lines
  //   - stray `[Ime]` / `[ime]` placeholder tokens
  //   - leading TL;DR / Sažetak / Summary block (already shown in the
  //     green Summary box above this body, so it's pure duplication)
  const cleaned = stripLeadingTldr(source)
    .replace(/^---+$/gm, "")
    .replace(/\[(?:Ime|ime|Name|name)\]/g, "—")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return (
    <div className="text-[13px] leading-relaxed text-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => (
            <h1 className="mt-1 mb-2 text-lg font-bold text-text" {...p} />
          ),
          h2: (p) => (
            <h2
              className="mt-4 mb-1.5 border-b border-border-strong pb-1 text-sm font-bold uppercase tracking-wider text-amber-300"
              {...p}
            />
          ),
          h3: (p) => (
            <h3
              className="mt-3 mb-1 text-[13px] font-semibold text-text"
              {...p}
            />
          ),
          p: (p) => <p className="mb-2 text-[13px] text-text" {...p} />,
          strong: (p) => <strong className="font-semibold text-text" {...p} />,
          em: (p) => <em className="italic text-text-dim" {...p} />,
          ul: (p) => (
            <ul className="mb-2 ml-4 list-disc space-y-0.5 text-[13px]" {...p} />
          ),
          ol: (p) => (
            <ol className="mb-2 ml-4 list-decimal space-y-0.5 text-[13px]" {...p} />
          ),
          li: (p) => <li className="leading-snug" {...p} />,
          code: ({ className, children, ...rest }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="rounded bg-bg-card px-1 py-0.5 font-mono text-[12px] text-amber-200"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block whitespace-pre-wrap rounded border border-border bg-bg-card p-2 font-mono text-[12px] text-text"
                {...rest}
              >
                {children}
              </code>
            );
          },
          blockquote: (p) => (
            <blockquote
              className="my-2 border-l-2 border-amber-500/60 bg-amber-500/5 px-2 py-1 text-text-dim"
              {...p}
            />
          ),
          hr: () => <hr className="my-3 border-border-strong" />,
          a: (p) => (
            <a
              className="text-cyan-300 underline hover:text-cyan-200"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          table: (p) => (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full text-[12px]" {...p} />
            </div>
          ),
          th: (p) => (
            <th
              className="border-b border-border-strong px-2 py-1 text-left font-semibold text-text-dim"
              {...p}
            />
          ),
          td: (p) => (
            <td className="border-b border-border px-2 py-1 align-top" {...p} />
          ),
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}

function HolmesPartialNote({
  actualCount,
  costEur,
}: {
  actualCount: number;
  costEur?: number;
}) {
  if (actualCount >= HOLMES_PIPELINE_EXPECTED) return null;
  const cost = typeof costEur === "number" ? `€${costEur.toFixed(2)}` : "fiksni trošak";
  return (
    <div className="mb-4 flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
      <Info size={14} className="mt-0.5 shrink-0 text-amber-300" />
      <div className="text-[11px] leading-relaxed text-amber-100/90">
        <strong className="text-amber-200">
          {actualCount}/{HOLMES_PIPELINE_EXPECTED} leadova spremljeno.
        </strong>{" "}
        Cijena ({cost}) je za pokrenuti pipeline (Google Places + Apollo enrich
        + 10× Claude+web_search recon) — ne po lead-u. Kada Places vrati manje od
        traženih {HOLMES_PIPELINE_EXPECTED} klinika, Holmes obradi sve koje je
        dobio. Razlog: query &ldquo;stomatološka klinika Zagreb&rdquo; je vratio
        samo {actualCount} jedinstvenih objekata koje je Apollo uspio enrichati
        i Holmes recon dovršiti. Probaj proširiti niche (npr. dodati
        &ldquo;estetska&rdquo;) ili lokaciju (npr. &ldquo;Zagreb, Velika
        Gorica&rdquo;) da bi sljedeći run vratio puniju desetku.
      </div>
    </div>
  );
}

function StatusBadge({ row }: { row: FullActionRow }) {
  const Icon =
    row.status === "completed"
      ? CheckCircle2
      : row.status === "failed"
      ? AlertCircle
      : Loader2;
  const cls =
    row.status === "completed"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : row.status === "failed"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
      : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}
    >
      <Icon
        size={9}
        className={row.status === "running" || row.status === "queued" ? "animate-spin" : ""}
      />
      {row.status}
    </span>
  );
}
