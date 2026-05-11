"use client";

/**
 * Outreach Action Lab — pure execution mode.
 *
 * 5 channel sub-rooms: Instagram · Mail · Phone · WhatsApp · LinkedIn.
 * Each shows leads where Holmes detected primary_channel = that channel,
 * sorted by ICP score (highest first). Each lead card pre-loads the
 * Holmes-generated channel-specific outreach draft + opening hook +
 * a deep-link button to that channel + "Mark sent" action.
 *
 * Workflow:
 *   1. Wake up · check Bureau (Holmes) + Lead Scorer for context
 *   2. Click Outreach Lab · pick channel tab · top-of-list = best ICP
 *   3. Read opening hook (1 sec) · review draft (5 sec) · send (1 click)
 *   4. Mark sent · move to next
 *
 * No approval queue, no template builder, no history pane. Pure action.
 */

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  Mail,
  Phone,
  MessageCircle,
  Briefcase,
  ExternalLink,
  Copy,
  Check,
  Send,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { addOutreach } from "@/app/actions/outreach";
import { sendViaGmail, getGmailStatus, type GmailStatus } from "@/app/actions/gmail";
import type { LeadRow } from "@/lib/queries";

type Channel = "instagram" | "linkedin" | "email" | "phone" | "whatsapp";

interface ChannelMeta {
  id: Channel;
  label: string;
  icon: typeof AtSign;
  accent: string;
  bg: string;
  ring: string;
  /** Why we contact via this channel — Leonardov mental podsjetnik */
  philosophy: string;
  /** Tactical style notes — kako pisati / kako zvučati */
  styleHints: string[];
  /** What 0-count usually means for this channel */
  emptyHint: string;
}

const CHANNELS: ChannelMeta[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: AtSign,
    accent: "text-pink-300",
    bg: "from-pink-500/15 to-rose-700/10 border-pink-400/40",
    ring: "ring-pink-400/40",
    philosophy:
      "IG je vizualni first-touch — vlasnik klinike provjerava DM 2-3× dnevno između pacijenata. Niska barijera, brz odgovor, zero formalnost.",
    styleHints: [
      "Otvori s reference na specifičan post (vidio sam vašu zadnju objavu o…)",
      "Kratko (≤80 riječi), 1 pitanje, 1 CTA",
      "Bez linkova u prvoj poruci (IG ih kažnjava)",
      "Voice-note opcija ako je warm — daje human feel",
    ],
    emptyHint:
      "Holmes je rijetko ekstraktirao @handle za klinike u HR — većina klinika nema personal IG vlasnika. Provjeri Detective Bureau ako misliš da bi netko trebao biti tu.",
  },
  {
    id: "email",
    label: "Mail",
    icon: Mail,
    accent: "text-cyan-300",
    bg: "from-cyan-500/15 to-blue-700/10 border-cyan-400/40",
    ring: "ring-cyan-400/40",
    philosophy:
      "Email = profesionalni first-contact, dulja forma OK, daje vlasniku vremena za promišljanje. Default kad ne znaš primary kanal.",
    styleHints: [
      "Subject je 60% bitke — testirati: ROI angle vs Observation angle",
      "120-150 riječi tijelo — manje = ne čita, više = TL;DR",
      "1 P.S. line s konkretnim brojem (često najčitaniji dio)",
      "Šalji uto/sri 10-12h CET (peak open rate za doktore)",
    ],
    emptyHint:
      "Email je default — ako je 0, znači Holmes nije ekstraktirao kontakte. Pokreni Holmes Bulk Investigation u Bureau-u.",
  },
  {
    id: "phone",
    label: "Phone",
    icon: Phone,
    accent: "text-amber-300",
    bg: "from-amber-500/15 to-orange-700/10 border-amber-400/40",
    ring: "ring-amber-400/40",
    philosophy:
      "Telefon = highest signal-to-noise. Nazoveš kad imaš jaku reason (warm intro, urgent angle, ili sve drugo failao). Najmanji volumen, najveći konverzija.",
    styleHints: [
      "Pripremi 30-sek opening prije nego nazoveš (Holmes ima script ispod)",
      "Idealno vrijeme: 11-13h ili 17-18h (između pacijenata)",
      "Ako odgovori asistentica: traži vrijeme za vlasnika, ne improviziraj pitch",
      "Ako voicemail: NE ostavi pitch — ostavi 8-sek 'Leonardo iz Lamon agency, javim se opet' message",
    ],
    emptyHint:
      "Telefon je za handle-with-care leadove (warm intro ili top-tier ICP). 0 znači ili Holmes nije imao broj ili svi koji ga imaju su bolje pristupiti drugim kanalom.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    accent: "text-emerald-300",
    bg: "from-emerald-500/15 to-green-700/10 border-emerald-400/40",
    ring: "ring-emerald-400/40",
    philosophy:
      "WhatsApp = warm channel. Koristiš samo ako te poznaje (referral, prošli kontakt, mutual connection). NIKAD cold WA — bezobrazno + spam-flag.",
    styleHints: [
      "Opener: 'Bok [Ime], javljam se preko [izvor — kolega/event/...]'",
      "Kratko + prijateljski + curiosity gap (per Leonardov warm-DM stil)",
      "Meka CTA: 'imaš minutu?' umjesto '15 min poziv'",
      "Voice note OK ako warm — graditi ton",
    ],
    emptyHint:
      "WA je samo za warm leadove (Apex Špehar style). Cold WA-anje = spam. 0 je očekivano osim za referrals + osobne kontakte.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Briefcase,
    accent: "text-sky-300",
    bg: "from-sky-500/15 to-blue-700/10 border-sky-400/40",
    ring: "ring-sky-400/40",
    philosophy:
      "LinkedIn = B2B authority kanal. Vlasnik provjerava 1-2× tjedno. Najduži response cycle (3-7 dana) ali najveći trust signal kad odgovori.",
    styleHints: [
      "Connect request s personalised note (max 300 char)",
      "Pričekaj accept prije nego pošalješ DM (ako pošalješ odmah = block)",
      "Engage 2-3 njegova posta tjedan prije DM-a (warm-up algorithm)",
      "Format: 4-part struktura — observation → pain Q → bridge → assumptive CTA",
    ],
    emptyHint:
      "Croatian dental owners imaju slab LinkedIn presence — Holmes rijetko ekstraktira personal LI. 3 ukupno na 55 leadova je realnost. Fokusiraj LI na office managers + 2nd-gen owners.",
  },
];

interface Props {
  initialList: LeadRow[];
}

export function OutreachActionLab({ initialList }: Props) {
  // Filter to leads not yet closed + with Holmes report
  const allLeads = useMemo(
    () =>
      initialList.filter(
        (l) =>
          l.stage !== "closed_won" &&
          l.stage !== "closed_lost" &&
          l.holmes_report,
      ),
    [initialList],
  );

  // Group by primary channel (fallback: derive from reachability or available channels)
  const byChannel = useMemo(() => {
    const map: Record<Channel, LeadRow[]> = {
      instagram: [],
      email: [],
      phone: [],
      whatsapp: [],
      linkedin: [],
    };
    for (const lead of allLeads) {
      const ch = inferPrimaryChannel(lead);
      if (ch) map[ch].push(lead);
    }
    // Sort each by ICP score descending
    for (const ch of Object.keys(map) as Channel[]) {
      map[ch].sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0));
    }
    return map;
  }, [allLeads]);

  // Pick default tab = channel with most leads
  const defaultChannel: Channel = useMemo(() => {
    let best: Channel = "email";
    let bestCount = -1;
    for (const ch of Object.keys(byChannel) as Channel[]) {
      if (byChannel[ch].length > bestCount) {
        best = ch;
        bestCount = byChannel[ch].length;
      }
    }
    return best;
  }, [byChannel]);

  const [activeChannel, setActiveChannel] = useState<Channel>(defaultChannel);
  const activeLeads = byChannel[activeChannel];
  const activeMeta = CHANNELS.find((c) => c.id === activeChannel)!;

  return (
    <div className="flex h-full flex-col">
      {/* ── Channel tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const count = byChannel[ch.id].length;
          const isActive = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={
                "flex items-center gap-2 rounded-md border-2 px-3 py-2 text-sm font-medium transition-all " +
                (isActive
                  ? `bg-gradient-to-br ${ch.bg} ${ch.accent}`
                  : "border-border bg-bg-card text-text-muted hover:border-border-strong hover:text-text")
              }
            >
              <Icon size={14} />
              <span>{ch.label}</span>
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

      {/* ── Active channel header ── */}
      <div className="mt-4 mb-3 flex items-center justify-between">
        <div>
          <h3 className={"text-lg font-semibold " + activeMeta.accent}>
            {activeMeta.label} · {activeLeads.length} lead
            {activeLeads.length === 1 ? "" : "ova"} u redu
          </h3>
          <p className="text-xs text-text-muted">
            Sortirano po ICP score · najbolji lead na vrhu · klikni{" "}
            <span className="text-text-dim">Send</span> ili{" "}
            <span className="text-text-dim">Open</span> po lead-u
          </p>
        </div>
      </div>

      {/* ── Channel philosophy reminder ── */}
      <div
        className={
          "mb-4 rounded-lg border bg-gradient-to-br p-3 backdrop-blur-sm " +
          activeMeta.bg
        }
      >
        <div className="mb-2 flex items-start gap-2">
          <span className={"mt-0.5 text-[11px] font-bold uppercase tracking-wider " + activeMeta.accent}>
            ▸ Zašto {activeMeta.label}
          </span>
          <p className="flex-1 text-xs leading-relaxed text-text">
            {activeMeta.philosophy}
          </p>
        </div>
        <div className="border-t border-white/5 pt-2">
          <p className={"mb-1 text-[10px] font-mono uppercase tracking-wider " + activeMeta.accent}>
            Style hints
          </p>
          <ul className="space-y-0.5 text-[11px] text-text-dim">
            {activeMeta.styleHints.map((hint, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={activeMeta.accent + " mt-0.5"}>·</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Lead cards ── */}
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {activeLeads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-card/40 px-6 py-8 text-center text-sm">
            <p className="mb-3 text-text">
              Nema lead-ova kojima je <span className={activeMeta.accent}>{activeMeta.label}</span>{" "}
              primary kanal trenutno.
            </p>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-text-muted">
              {activeMeta.emptyHint}
            </p>
          </div>
        ) : (
          activeLeads.map((lead) => (
            <LeadActionCard
              key={lead.id}
              lead={lead}
              channel={activeChannel}
              channelMeta={activeMeta}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Lead card — execution surface for one lead on one channel
// =====================================================================

function LeadActionCard({
  lead,
  channel,
  channelMeta,
}: {
  lead: LeadRow;
  channel: Channel;
  channelMeta: (typeof CHANNELS)[number];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showFullDraft, setShowFullDraft] = useState(false);
  const [draft, setDraft] = useState(() => initialDraft(lead, channel));
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);

  const report = lead.holmes_report ?? null;
  const angle = report?.best_angle ?? null;
  const reachability = report?.reachability ?? [];

  const score = lead.icp_score ?? 0;
  const scoreColor =
    score >= 17
      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
      : score >= 12
        ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
        : score >= 6
          ? "border-sky-400/60 bg-sky-500/15 text-sky-200"
          : "border-stone-400/40 bg-stone-500/10 text-stone-300";

  // Channel-specific contact / deep-link
  const contactValue = getContactForChannel(lead, channel);
  const channelHref = buildChannelHref(channel, contactValue, draft);
  const channelLabel = getChannelActionLabel(channel);

  function copyDraft() {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  async function markSent(message: string, channelId: Channel) {
    // addOutreach platform field is restricted — map phone/whatsapp → "other"
    const platform: "linkedin" | "instagram" | "tiktok" | "email" | "other" =
      channelId === "linkedin" || channelId === "instagram" || channelId === "email"
        ? channelId
        : "other";
    startTransition(async () => {
      await addOutreach({
        leadName: lead.name,
        platform,
        message,
      });
      setSent(true);
    });
  }

  async function sendEmail() {
    if (!gmail) {
      const s = await getGmailStatus();
      setGmail(s);
      if (!s.connected) return; // user must connect Gmail in /integrations
    }
    if (!contactValue) return;
    startTransition(async () => {
      const res = await sendViaGmail({
        to: contactValue,
        subject: emailSubject(lead),
        body: draft,
      });
      if (res.ok) {
        // Log the outreach event separately
        await addOutreach({
          leadName: lead.name,
          platform: "email",
          message: draft,
        });
        setSent(true);
      }
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: sent ? 0.55 : 1, y: 0 }}
      className={
        "rounded-lg border bg-bg-card/70 backdrop-blur-sm transition-all " +
        (sent
          ? "border-success/30"
          : `border-border hover:border-border-strong`)
      }
    >
      {/* ── Header (always visible) ── */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <span
          className={
            "flex h-10 w-10 items-center justify-center rounded-md border-2 font-mono text-sm font-bold " +
            scoreColor
          }
          title={`ICP score ${score}/20`}
        >
          {score}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {lead.name}
          </p>
          <p className="truncate text-xs text-text-muted">
            {[lead.niche, getCity(lead), getOwnerName(lead)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {sent ? (
          <span className="flex items-center gap-1 rounded border border-success/40 bg-success/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-success">
            <Check size={10} />
            Sent
          </span>
        ) : (
          <span className={"font-mono text-[10px] uppercase " + channelMeta.accent}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>

      {/* ── Body (expandable) ── */}
      <AnimatePresence>
        {expanded && !sent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border/50 px-4 py-3">
              {/* Best angle summary */}
              {angle?.summary && (
                <div>
                  <p className={"mb-1 text-[10px] font-mono uppercase tracking-wider " + channelMeta.accent}>
                    Best angle
                  </p>
                  <p className="text-sm text-text">{angle.summary}</p>
                </div>
              )}

              {/* Opening hook */}
              {angle?.opening_hook && (
                <div className="rounded-md border border-amber-400/20 bg-amber-500/5 px-3 py-2">
                  <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-amber-300/80">
                    Opening hook (prvih 30s)
                  </p>
                  <p className="text-sm italic leading-relaxed text-amber-100">
                    &ldquo;{angle.opening_hook}&rdquo;
                  </p>
                </div>
              )}

              {/* Things to AVOID */}
              {angle?.avoid && angle.avoid.length > 0 && (
                <div className="rounded-md border border-rose-400/20 bg-rose-500/5 px-3 py-2">
                  <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-rose-300/80">
                    NE govori / NE pitaj
                  </p>
                  <ul className="space-y-0.5 text-xs text-rose-100">
                    {angle.avoid.slice(0, 3).map((a, i) => (
                      <li key={i}>✕ {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Channel reachability ranking (info only) */}
              {reachability.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Reachability ranking (Holmes)
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {reachability.slice(0, 5).map((r, i) => (
                      <span
                        key={i}
                        className={
                          "rounded border px-1.5 py-0.5 " +
                          (r.channel === channel
                            ? "border-amber-400/50 bg-amber-500/15 text-amber-200"
                            : "border-border bg-bg-elevated text-text-dim")
                        }
                        title={r.reasoning}
                      >
                        {r.channel} · {Math.round(r.confidence * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact value */}
              {contactValue && (
                <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/40 px-3 py-2 font-mono text-xs">
                  <span className="text-text-muted">{channel}</span>
                  <span className="truncate text-text">{contactValue}</span>
                </div>
              )}

              {/* Draft message */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className={"text-[10px] font-mono uppercase tracking-wider " + channelMeta.accent}>
                    {channel === "phone" ? "Calling script" : "Pre-drafted poruka"}
                  </p>
                  <button
                    onClick={() => setShowFullDraft((v) => !v)}
                    className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text"
                  >
                    {showFullDraft ? <EyeOff size={10} /> : <Eye size={10} />}
                    {showFullDraft ? "Sakrij" : "Edit"}
                  </button>
                </div>
                {showFullDraft ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-xs text-text focus:border-border-strong focus:outline-none"
                  />
                ) : (
                  <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-bg-elevated/40 px-3 py-2 font-mono text-xs leading-relaxed text-text-dim">
                    {draft}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {channel === "email" ? (
                  <>
                    <button
                      onClick={sendEmail}
                      disabled={pending || !contactValue}
                      className={
                        "flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-all " +
                        channelMeta.bg +
                        " " +
                        channelMeta.accent +
                        " hover:scale-[1.03] disabled:opacity-50"
                      }
                    >
                      <Send size={12} />
                      {pending ? "Šaljem..." : "Pošalji preko Gmail"}
                    </button>
                    {gmail && !gmail.connected && (
                      <a
                        href="/integrations"
                        className="text-[10px] text-amber-300 underline"
                      >
                        Spoji Gmail prvo →
                      </a>
                    )}
                  </>
                ) : (
                  channelHref && (
                    <a
                      href={channelHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        "flex items-center gap-1.5 rounded-md border-2 bg-gradient-to-br px-3 py-1.5 text-xs font-semibold transition-all hover:scale-[1.03] " +
                        channelMeta.bg +
                        " " +
                        channelMeta.accent
                      }
                    >
                      <ExternalLink size={12} />
                      {channelLabel}
                    </a>
                  )
                )}

                <button
                  onClick={copyDraft}
                  className="flex items-center gap-1 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-muted hover:border-border-strong hover:text-text"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy poruku"}
                </button>

                {channel !== "email" && (
                  <button
                    onClick={() => markSent(draft, channel)}
                    disabled={pending}
                    className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 disabled:opacity-50"
                  >
                    <Check size={12} />
                    Mark sent
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =====================================================================
// Helpers
// =====================================================================

function inferPrimaryChannel(lead: LeadRow): Channel | null {
  const r = lead.holmes_report;
  if (!r) return null;
  // 1. explicit primary_channel from Holmes
  if (r.primary_channel) return r.primary_channel as Channel;
  // 2. top reachability with confidence > 0.6
  const top = (r.reachability ?? [])
    .slice()
    .sort((a, b) => b.confidence - a.confidence)[0];
  if (top && top.confidence >= 0.5) {
    const c = top.channel as Channel;
    if (["instagram", "linkedin", "email", "phone", "whatsapp"].includes(c))
      return c;
  }
  // 3. fallback by channel availability priority: WA > IG > LinkedIn > email > phone
  const ch = r.channels;
  if (ch?.instagram_personal || ch?.instagram_company) return "instagram";
  if (ch?.linkedin_personal || ch?.linkedin_company) return "linkedin";
  if (ch?.email) return "email";
  if (ch?.phone) return "phone";
  return null;
}

function initialDraft(lead: LeadRow, channel: Channel): string {
  const r = lead.holmes_report;
  if (!r) return "";
  // Prefer per-channel draft if available
  const byCh = r.channel_drafts;
  if (byCh && byCh[channel]) return byCh[channel] as string;
  // Fallback to general outreach_draft
  return r.outreach_draft ?? "";
}

function getContactForChannel(lead: LeadRow, channel: Channel): string | null {
  const ch = lead.holmes_report?.channels;
  if (!ch) return null;
  switch (channel) {
    case "instagram":
      return ch.instagram_personal ?? ch.instagram_company ?? null;
    case "linkedin":
      return ch.linkedin_personal ?? ch.linkedin_company ?? null;
    case "email":
      return ch.email ?? null;
    case "phone":
      return ch.phone ?? null;
    case "whatsapp":
      // WhatsApp uses phone number as the contact
      return ch.phone ?? null;
  }
}

function buildChannelHref(
  channel: Channel,
  contact: string | null,
  draftText: string,
): string | null {
  if (!contact) return null;
  const encoded = encodeURIComponent(draftText);
  switch (channel) {
    case "instagram": {
      // Strip URL prefix if present, keep handle
      const handle = contact.replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
        .replace(/^@/, "")
        .replace(/\/$/, "");
      return `https://instagram.com/${handle}`;
    }
    case "linkedin": {
      // Already a URL most of the time
      if (/^https?:/.test(contact)) return contact;
      return `https://linkedin.com/in/${contact}`;
    }
    case "email":
      return `mailto:${contact}?subject=${encodeURIComponent("Plima — kratko pitanje")}&body=${encoded}`;
    case "phone":
      return `tel:${contact.replace(/\s+/g, "")}`;
    case "whatsapp": {
      const num = contact.replace(/[^0-9+]/g, "");
      return `https://wa.me/${num}?text=${encoded}`;
    }
  }
}

function getChannelActionLabel(channel: Channel): string {
  switch (channel) {
    case "instagram":
      return "Otvori Instagram DM";
    case "linkedin":
      return "Otvori LinkedIn profil";
    case "email":
      return "Pošalji";
    case "phone":
      return "Nazovi";
    case "whatsapp":
      return "Otvori WhatsApp";
  }
}

function emailSubject(lead: LeadRow): string {
  const angle = lead.holmes_report?.best_angle?.summary;
  if (angle && angle.length < 60) return angle;
  return `${lead.name} — kratko pitanje`;
}

function getCity(lead: LeadRow): string | null {
  // city info commonly lives in holmes_report.publicity or notes — best effort
  const notes = lead.notes ?? "";
  const cityMatch = notes.match(
    /\b(Zagreb|Split|Rijeka|Zadar|Pula|Osijek|Varaždin|Karlovac|Šibenik|Dubrovnik|Sesvete|Maribor|Ljubljana)\b/i,
  );
  return cityMatch ? cityMatch[1] : null;
}

function getOwnerName(lead: LeadRow): string | null {
  return lead.holmes_report?.owner?.name ?? null;
}
