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

import { useMemo, useState, useTransition } from "react";
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
  Clock,
  XCircle,
  ThumbsUp,
  CalendarCheck,
  Trophy,
  Ban,
} from "lucide-react";
import type { OutreachArchiveRow } from "@/lib/queries";
import { addOutreach, updateOutreachStatus } from "@/app/actions/outreach";

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
  replied_positive: { label: "Pozitivno", cls: "border-emerald-400/60 bg-emerald-500/25 text-emerald-100" },
  replied_booked: { label: "Booked", cls: "border-cyan-400/60 bg-cyan-500/25 text-cyan-100" },
  replied_won: { label: "Won", cls: "border-amber-400/60 bg-amber-500/25 text-amber-100" },
  replied_rejected: { label: "Odbijen", cls: "border-stone-400/60 bg-stone-500/20 text-stone-200" },
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
  const [waCopiedId, setWaCopiedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /**
   * Marker phrase that uniquely identifies a Sent-Archive WhatsApp
   * follow-up message. The body text in copyWaFollowUp() always starts
   * with this string, and no other outreach platform reuses it, so we
   * can detect WA follow-ups even when they are persisted under
   * platform="other" (which is the only value the outreach table's
   * platform CHECK constraint accepts for non-{email,instagram,linkedin}
   * touchpoints).
   */
  const WA_FOLLOWUP_MARKER =
    "poslao sam vam mail o filtriranju pacijenata prije recepcije";

  /**
   * Map of lead_id → most-recent WhatsApp follow-up outreach row.
   * Detection accepts EITHER platform="whatsapp" (forward-compat once
   * the platform CHECK is relaxed) OR platform="other" with the marker
   * phrase in the message body. Used to:
   * (a) skip the addOutreach call on re-clicks so we don't duplicate
   *     rows, and
   * (b) render a "+WA · prije X" badge on email rows whose lead has a
   *     paired WA follow-up (multi-touch coverage at a glance).
   */
  const waOutreachByLead = useMemo(() => {
    const map = new Map<string, OutreachArchiveRow>();
    for (const r of rows) {
      if (!r.lead_id) continue;
      const isWa =
        r.platform === "whatsapp" ||
        (r.platform === "other" &&
          (r.message ?? "").includes(WA_FOLLOWUP_MARKER));
      if (!isWa) continue;
      const existing = map.get(r.lead_id);
      if (!existing || new Date(r.sent_at) > new Date(existing.sent_at)) {
        map.set(r.lead_id, r);
      }
    }
    return map;
  }, [rows]);

  /**
   * Multi-touch follow-up.
   *
   * 1. Copies WhatsApp click-to-chat URL to clipboard so Leonardo can
   *    paste it into his already-logged-in WA Business tab's URL bar
   *    (Ctrl+L → Ctrl+V → Enter) and land on the prefilled chat without
   *    spawning a new tab.
   * 2. Optimistically logs an outreach row with platform="whatsapp" so
   *    the multi-touch pattern (email → WhatsApp same day) shows up in
   *    the channel filter and feeds the "+WA" badge on the email row.
   *    Skipped if there's already a paired WA row for this lead so
   *    re-clicking to re-copy the URL doesn't create duplicates.
   */
  function copyWaFollowUp(row: OutreachArchiveRow) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    if (!row.lead_phone) return;
    const num = row.lead_phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    if (!num) return;
    const body =
      "Pozdrav, poslao sam vam mail o filtriranju pacijenata prije " +
      "recepcije — možda ćete kasnije pogledati. Ako vam je lakše " +
      "porazgovarati ovdje, samo javite. — Leonardo";
    // Click-to-chat URL — paste in WA Business browser URL bar
    // (Ctrl+L → Ctrl+V → Enter) auto-navigates to /send and opens the
    // chat with body prefilled. NOT for pasting into WA's New chat
    // search field (that only matches saved contact names).
    const payload = `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(body)}`;

    navigator.clipboard.writeText(payload).then(() => {
      setWaCopiedId(row.id);
      setTimeout(() => {
        setWaCopiedId((id) => (id === row.id ? null : id));
      }, 2500);
    });

    // Optimistically log the WhatsApp outreach (only if this lead doesn't
    // already have a paired WA row — re-copy clicks shouldn't duplicate).
    //
    // Persisted as platform="other" because the outreach table's platform
    // CHECK constraint rejects "whatsapp" today — addOutreach silently
    // returned ok=false in live testing, leaving the WA row missing.
    // The waOutreachByLead lookup above detects WA follow-ups by message
    // body marker, so the badge + state still work end-to-end.
    const alreadyLogged = row.lead_id && waOutreachByLead.has(row.lead_id);
    if (row.lead_id && !alreadyLogged) {
      startTransition(async () => {
        const result = await addOutreach({
          leadName: row.lead_name ?? "(no name)",
          leadId: row.lead_id ?? undefined,
          platform: "other",
          message: body,
        });
        if (!result.ok) {
          // eslint-disable-next-line no-console
          console.error(
            "[SentArchive] addOutreach failed for WhatsApp follow-up:",
            result.error,
            { leadId: row.lead_id, leadName: row.lead_name },
          );
        }
      });
    }
  }

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
            // Multi-touch badge: only meaningful on EMAIL rows that
            // already have a paired WhatsApp follow-up on the same lead.
            const pairedWa =
              row.platform === "email" && row.lead_id
                ? waOutreachByLead.get(row.lead_id)
                : null;
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
                      {pairedWa && (
                        <span
                          title={`WhatsApp follow-up poslan ${formatWhen(pairedWa.sent_at)}`}
                          className="flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300"
                        >
                          <MessageCircle size={9} />
                          +WA · {formatWhen(pairedWa.sent_at)}
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

                        {/*
                         * Multi-touch action row.
                         *
                         * If this row was an email AND we have a phone
                         * number on the lead, surface a one-click WhatsApp
                         * follow-up. Pure clipboard copy — no window.open —
                         * because every previous attempt to open a new
                         * web.whatsapp.com tab got stuck on the loading
                         * spinner whenever Leonardo's existing WhatsApp
                         * Business tab was already holding the session
                         * claim. Pasting into the live Business tab works
                         * every time.
                         */}
                        {/*
                         * Status update strip — lets Leonardo mark a sent
                         * outreach as replied / no_reply / bounced after
                         * the prospect responds. Uses updateOutreachStatus
                         * server action (already wired to revalidatePath).
                         * Highlights the current status so the active
                         * pill is obvious and others read as "promote to".
                         */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[10px] uppercase tracking-wider text-text-muted">
                            Status:
                          </span>
                          {(
                            [
                              { key: "replied_positive", label: "Pozitivno", Icon: ThumbsUp, on: "border-emerald-400/70 bg-emerald-500/25 text-emerald-100", off: "border-border bg-bg-elevated text-text-muted hover:border-emerald-400/40 hover:text-emerald-300" },
                              { key: "replied_booked", label: "Booked", Icon: CalendarCheck, on: "border-cyan-400/70 bg-cyan-500/25 text-cyan-100", off: "border-border bg-bg-elevated text-text-muted hover:border-cyan-400/40 hover:text-cyan-300" },
                              { key: "replied_won", label: "Won", Icon: Trophy, on: "border-amber-400/70 bg-amber-500/25 text-amber-100", off: "border-border bg-bg-elevated text-text-muted hover:border-amber-400/40 hover:text-amber-300" },
                              { key: "replied_rejected", label: "Odbijen", Icon: Ban, on: "border-stone-400/70 bg-stone-500/25 text-stone-100", off: "border-border bg-bg-elevated text-text-muted hover:border-stone-400/40 hover:text-stone-300" },
                              { key: "no_reply", label: "No reply", Icon: Clock, on: "border-stone-500/60 bg-stone-500/20 text-stone-200", off: "border-border bg-bg-elevated text-text-muted hover:border-stone-500/40 hover:text-stone-300" },
                              { key: "bounced", label: "Bounced", Icon: XCircle, on: "border-rose-400/60 bg-rose-500/20 text-rose-200", off: "border-border bg-bg-elevated text-text-muted hover:border-rose-400/40 hover:text-rose-300" },
                            ] as const
                          ).map(({ key, label, Icon, on, off }) => {
                            // Highlight any "replied*" sub-status when the
                            // row carries the legacy generic "replied"
                            // value too, so old rows still light up the
                            // closest pill instead of looking inactive.
                            const active =
                              row.status === key ||
                              (row.status === "replied" && key === "replied_positive");
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (row.status === key) return;
                                  startTransition(async () => {
                                    await updateOutreachStatus(row.id, key);
                                  });
                                }}
                                disabled={row.status === key}
                                title={
                                  key === "replied_positive"
                                    ? "Zainteresirani, traže više info / dogovor"
                                    : key === "replied_booked"
                                      ? "Bookirao Zoom / poziv"
                                      : key === "replied_won"
                                        ? "Postao klijent / potpisao"
                                        : key === "replied_rejected"
                                          ? "Odbijen — 'nismo zainteresirani'"
                                          : key === "no_reply"
                                            ? "Tišina nakon 4–7 dana"
                                            : "Email/broj ne radi"
                                }
                                className={
                                  "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-all " +
                                  (active ? on + " cursor-default" : off)
                                }
                              >
                                <Icon size={9} />
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {row.platform === "email" && row.lead_phone && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              onClick={() => copyWaFollowUp(row)}
                              title={
                                pairedWa
                                  ? `WhatsApp follow-up već poslan ${formatWhen(pairedWa.sent_at)}. Klik samo re-kopira URL.`
                                  : "Kopira web.whatsapp.com/send URL. " +
                                    "U WA Business tabu: Ctrl+L (URL bar gore) → Ctrl+V → Enter. " +
                                    "Auto-otvori prefilled chat. NE pastei u WA-ovu search bar."
                              }
                              className={
                                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:opacity-90 " +
                                (pairedWa
                                  ? "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-300/80"
                                  : "border-emerald-400/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20")
                              }
                            >
                              <span className="text-sm leading-none">
                                {waCopiedId === row.id
                                  ? "✅"
                                  : pairedWa
                                    ? "✓"
                                    : "💬"}
                              </span>
                              {waCopiedId === row.id
                                ? "URL kopiran → paste u URL bar (Ctrl+L → V → ⏎)"
                                : pairedWa
                                  ? `WA poslan · ${formatWhen(pairedWa.sent_at)}`
                                  : "Follow-up WhatsApp"}
                            </button>
                            <span className="font-mono text-[10px] text-text-dim">
                              +{row.lead_phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}
                            </span>
                          </div>
                        )}
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
