"use client";

/**
 * Sent Archive — read-only history of every outreach Leonardo has ever sent.
 *
 * Lives separately from Outreach Lab. Outreach Lab is pure execution surface
 * (only leads that still need a first touch live there). Once a lead is
 * "Marked sent", it disappears from Outreach Lab and surfaces here.
 *
 * Per Leonardo's feedback (2026-05-12):
 *   > "Znaci jednom kada kliknem mark sent TOTALNO TREBA OTICI IZ
 *   > OUTREACH LAB-A. (...) na totalnom drugom mjestu treba biti povijest
 *   > poslanih dm-ova, zbog preglednosti."
 *
 * What this room shows:
 *   - Channel filter (Instagram · Mail · Phone · WhatsApp · LinkedIn · All)
 *   - Chronological list (newest first) of every outreach row
 *   - Click a row → expand to see full message + meta
 *   - No edit actions — this is an archive, not a workspace
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  Mail,
  Phone,
  MessageCircle,
  Briefcase,
  Inbox,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import type { OutreachArchiveRow } from "@/lib/queries";

type Channel = "all" | "instagram" | "email" | "phone" | "whatsapp" | "linkedin" | "other";

const CHANNEL_META: Record<
  Exclude<Channel, "all">,
  { label: string; icon: typeof AtSign; accent: string }
> = {
  instagram: { label: "Instagram", icon: AtSign, accent: "text-pink-300" },
  email: { label: "Mail", icon: Mail, accent: "text-cyan-300" },
  phone: { label: "Phone", icon: Phone, accent: "text-amber-300" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, accent: "text-emerald-300" },
  linkedin: { label: "LinkedIn", icon: Briefcase, accent: "text-sky-300" },
  other: { label: "Ostalo", icon: Inbox, accent: "text-stone-300" },
};

const STATUS_META: Record<
  OutreachArchiveRow["status"],
  { label: string; cls: string }
> = {
  sent: { label: "Sent", cls: "border-success/40 bg-success/10 text-success" },
  replied: { label: "Replied", cls: "border-emerald-400/50 bg-emerald-500/20 text-emerald-200" },
  no_reply: { label: "No reply", cls: "border-stone-500/40 bg-stone-500/10 text-stone-300" },
  bounced: { label: "Bounced", cls: "border-rose-400/50 bg-rose-500/15 text-rose-200" },
};

function platformToChannel(p: string | null): Exclude<Channel, "all"> {
  switch (p) {
    case "instagram":
    case "email":
    case "linkedin":
      return p;
    case "phone":
      return "phone";
    case "whatsapp":
      return "whatsapp";
    default:
      return "other";
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `prije ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `prije ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 14) return `prije ${diffD}d`;
  // Older → absolute date
  return d.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function SentArchivePanel({ rows }: { rows: OutreachArchiveRow[] }) {
  const [channel, setChannel] = useState<Channel>("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Count rows per channel for the pill badges. Always computed from the
  // full list so the badges show real totals regardless of current filter.
  const channelCounts = useMemo(() => {
    const counts: Record<Exclude<Channel, "all">, number> = {
      instagram: 0,
      email: 0,
      phone: 0,
      whatsapp: 0,
      linkedin: 0,
      other: 0,
    };
    for (const r of rows) counts[platformToChannel(r.platform)]++;
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (channel !== "all" && platformToChannel(r.platform) !== channel) {
        return false;
      }
      if (q) {
        const hay =
          (r.lead_name ?? "").toLowerCase() +
          " " +
          (r.message ?? "").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, channel, query]);

  const channelTabs: Channel[] = [
    "all",
    "instagram",
    "email",
    "phone",
    "whatsapp",
    "linkedin",
    "other",
  ];

  return (
    <div className="flex h-full flex-col">
      {/* ── Channel filter + search ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {channelTabs.map((ch) => {
          const isActive = channel === ch;
          if (ch === "all") {
            return (
              <button
                key={ch}
                onClick={() => setChannel("all")}
                className={
                  "flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-all " +
                  (isActive
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border bg-bg-card text-text-muted hover:border-border-strong hover:text-text")
                }
              >
                Svi
                <span
                  className={
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold " +
                    (isActive
                      ? "bg-black/40 text-white"
                      : "bg-bg-elevated text-text-dim")
                  }
                >
                  {rows.length}
                </span>
              </button>
            );
          }
          const meta = CHANNEL_META[ch];
          const Icon = meta.icon;
          const count = channelCounts[ch];
          return (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={
                "flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-all " +
                (isActive
                  ? `border-current ${meta.accent} bg-bg-elevated`
                  : "border-border bg-bg-card text-text-muted hover:border-border-strong hover:text-text")
              }
            >
              <Icon size={12} />
              <span>{meta.label}</span>
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold " +
                  (count === 0
                    ? "bg-stone-800 text-stone-500"
                    : isActive
                      ? "bg-black/40 text-white"
                      : "bg-bg-elevated text-text-dim")
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-bg-elevated/40 px-3 py-2">
        <Search size={14} className="text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Traži po lead-u ili tekstu poruke…"
          className="flex-1 bg-transparent text-sm text-text placeholder:text-text-dim focus:outline-none"
        />
      </div>

      {/* ── List ── */}
      <div className="flex-1 space-y-2 overflow-y-auto pb-4">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-card/40 px-6 py-8 text-center text-sm">
            <p className="mb-2 text-text">
              {rows.length === 0
                ? "Još nisi poslao nijedan outreach."
                : "Nema rezultata za odabran filter."}
            </p>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-text-muted">
              {rows.length === 0
                ? "Otvori Outreach Lab → odaberi kanal → klikni Mark sent na neku poruku. Poslane poruke automatski idu ovdje."
                : "Probaj drugi kanal ili obriši pretragu."}
            </p>
          </div>
        ) : (
          filtered.map((row) => {
            const meta = CHANNEL_META[platformToChannel(row.platform)];
            const Icon = meta.icon;
            const isExpanded = expandedId === row.id;
            const statusMeta = STATUS_META[row.status];
            return (
              <div
                key={row.id}
                className="overflow-hidden rounded-lg border border-border bg-bg-card/60 transition-all hover:border-border-strong"
              >
                <button
                  onClick={() =>
                    setExpandedId((id) => (id === row.id ? null : row.id))
                  }
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                >
                  <span
                    className={
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg-elevated " +
                      meta.accent
                    }
                  >
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text">
                        {row.lead_name ?? "Bez imena"}
                      </p>
                      {row.lead_icp_score != null && (
                        <span className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
                          ICP {row.lead_icp_score}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {row.message ?? "(prazna poruka)"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                        statusMeta.cls
                      }
                    >
                      {statusMeta.label}
                    </span>
                    <span className="font-mono text-[10px] text-text-dim">
                      {formatWhen(row.sent_at)}
                    </span>
                  </div>
                  <span className="ml-1 mt-0.5 shrink-0 text-text-dim">
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-border/50 bg-bg-elevated/30 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-text-muted">
                          <span>
                            Sent ·{" "}
                            <span className="text-text">
                              {new Date(row.sent_at).toLocaleString("hr-HR")}
                            </span>
                          </span>
                          {row.lead_niche && (
                            <span>
                              · niche ·{" "}
                              <span className="text-text">{row.lead_niche}</span>
                            </span>
                          )}
                          <span>
                            · platform ·{" "}
                            <span className="text-text">
                              {row.platform ?? "—"}
                            </span>
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-bg-card/60 px-3 py-2 font-mono text-xs leading-relaxed text-text">
                          {row.message ?? "(no message)"}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
