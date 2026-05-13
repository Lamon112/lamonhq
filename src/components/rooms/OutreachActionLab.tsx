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
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  addOutreach,
  refreshOutreachDraftsWithCurrentRules,
} from "@/app/actions/outreach";
import { sendViaGmail, getGmailStatus, type GmailStatus } from "@/app/actions/gmail";
import { cleanPremiumLanguage } from "@/lib/premiumLanguage";
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
      "Šalji uto/sri 10-12h CET (peak open rate za doktore)",
      "── 9 Premium Swaps (Brend · 09) — primijeniti SVE ──",
      "①  Lead don't Ask: 'evo što preporučam' ne 'odgovara li vam'",
      "②  Investment not Price: 'investicija' ne 'cijena'",
      "③  Specialist: 'specijaliziran sam za' ne 'samo radim'",
      "④  The Standard: ton 'ovako se radi u kategoriji' ne 'molim razmotrite'",
      "⑤  Outcome not Tenure: 'izgradio Plimu oko ovog ishoda' ne '10 godina iskustva'",
      "⑥  Packages-first: 'provedem kroz pakete' ne 'koji budget'",
      "⑦  Gratitude not Apology: 'hvala na strpljenju' ne 'oprostite na kašnjenju'",
      "⑧  Availability: 'provjerit ću dostupnost' ne 'pokušat ću ubaciti'",
      "⑨  Imply don't Claim: 'Plima je standard' ne 'najbolja agencija'",
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
      "Premium 9 swaps (Brend · 09): 'specijaliziran za' · 'investicija' · 'evo što preporučam' · 'provedem kroz pakete' · 'provjerit ću dostupnost'",
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
      "Premium lang: 'izgradio sam Plimu oko ovog ishoda' ne 'radim ovo X godina' (vidi Brend · 09 swap #5)",
    ],
    emptyHint:
      "Croatian dental owners imaju slab LinkedIn presence — Holmes rijetko ekstraktira personal LI. 3 ukupno na 55 leadova je realnost. Fokusiraj LI na office managers + 2nd-gen owners.",
  },
];

interface Props {
  initialList: LeadRow[];
  /**
   * Lead IDs that already have at least one outreach row. These leads are
   * hidden from Outreach Lab entirely — they live in the Sent Archive
   * room instead. Source of truth = outreach table, NOT lead.stage, so
   * "Mark sent" works deterministically the moment addOutreach inserts.
   */
  sentLeadIds: string[];
}

export function OutreachActionLab({ initialList, sentLeadIds }: Props) {
  // Build a Set for O(1) membership checks; recompute only when the parent
  // refreshes the array. Mark sent inserts an outreach row + revalidates
  // the path, which re-renders the parent with the lead's id now in this
  // set, which makes the lead disappear from the queue — permanently.
  const sentSet = useMemo(() => new Set(sentLeadIds), [sentLeadIds]);

  const allLeads = useMemo(
    () =>
      initialList.filter(
        (l) =>
          !sentSet.has(l.id) &&
          l.holmes_report &&
          l.stage !== "closed_won" &&
          l.stage !== "closed_lost",
      ),
    [initialList, sentSet],
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
    // Queue is pure execution surface — always best ICP first.
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

  // Brend · 09 refresh state — bulk-regenerate all active drafts with the
  // latest 9-premium-swaps prompt. Disabled while running so users can't
  // double-fire (each lead = 1 Anthropic call).
  const [refreshing, startRefresh] = useTransition();
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const handleRefreshAll = () => {
    setRefreshMsg(null);
    startRefresh(async () => {
      const res = await refreshOutreachDraftsWithCurrentRules();
      if (!res.ok) {
        setRefreshMsg(`❌ ${res.error ?? "Greška"}`);
        return;
      }
      setRefreshMsg(
        `✨ Osvježeno ${res.refreshed} drafts po Brend · 09 pravilima (${res.skipped} preskočeno)`,
      );
      // Refresh the page so new drafts pull through; revalidatePath on
      // server already invalidated cache, this just forces a re-render.
      setTimeout(() => window.location.reload(), 1200);
    });
  };

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
      <div className="mt-4 mb-3 flex items-start justify-between gap-3">
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
          {refreshMsg && (
            <p className="mt-1 text-[11px] text-cyan-300">{refreshMsg}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={refreshing}
          title="Regeneriraj sve active drafts s trenutnim Brend · 09 (9 premium swap) pravilima — jedan AI call po leadu"
          className={
            "flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all " +
            (refreshing
              ? "cursor-wait border-cyan-400/30 bg-cyan-500/5 text-cyan-300/60"
              : "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/70 hover:bg-cyan-500/20")
          }
        >
          <RefreshCw
            size={12}
            className={refreshing ? "animate-spin" : undefined}
          />
          <span>
            {refreshing
              ? "Refreshing…"
              : "Osvježi sve drafts (Brend · 09)"}
          </span>
        </button>
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
  channelMeta: ChannelMeta;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showFullDraft, setShowFullDraft] = useState(false);
  // Initial draft is auto-cleaned via premium positioning language swaps.
  // Stash the swap metadata for the UI badge.
  //
  // Also strip a leading "Subject: …" line from the body. The AI emits
  // one inline and we extract it for the actual email Subject header in
  // sendEmail / emailSubject. Keeping it in the body would (a) show as
  // literal "Subject: X" text to recipients and (b) confuse Leonardo
  // looking at the draft preview.
  const initialResult = useMemo(() => {
    const raw = initialDraft(lead, channel);
    // Only strip Subject for email channel — other channels (IG, LI,
    // WA, phone) don't have separate subject headers.
    const bodyOnly =
      channel === "email" ? splitSubjectFromBody(raw).body : raw;
    return cleanPremiumLanguage(bodyOnly);
  }, [lead, channel]);
  const [draft, setDraft] = useState(initialResult.cleaned);
  // Sent state is local-only — the moment Mark sent inserts an outreach
  // row, revalidatePath fires and the parent re-renders without this lead
  // in the list (filter is now sentLeadIds-based). Local state shows the
  // success badge for the 200ms before that re-render lands so the click
  // feels instant.
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
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
  const holmesContact = getContactForChannel(lead, channel);
  // Manual contact override — when Holmes didn't find an email/handle,
  // Leonardo can paste one inline so the lead isn't blocked from send.
  // Auto-suggest comes from the website domain (e.g. bagatin.hr → info@bagatin.hr).
  const [manualContact, setManualContact] = useState("");
  const websiteDomain = useMemo(() => {
    if (channel !== "email") return null;
    const notes = lead.notes ?? "";
    const m = notes.match(/(?:Website|Web|Site):\s*https?:\/\/(?:www\.)?([^/\s]+)/i);
    return m ? m[1].toLowerCase() : null;
  }, [lead.notes, channel]);
  const suggestedContact =
    channel === "email" && websiteDomain ? `info@${websiteDomain}` : null;
  const contactValue = holmesContact || manualContact || null;
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
        leadId: lead.id,
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
    // Parse leading "Subject: …" line from draft body — AI sometimes
    // emits the subject inside the body. If found, use it as the actual
    // email Subject header AND strip it from the body so the recipient
    // doesn't see "Subject: …" as the first body line.
    const split = splitSubjectFromBody(draft);
    const finalSubject = split.subject ?? emailSubject(lead);
    const finalBody = split.body;
    startTransition(async () => {
      const res = await sendViaGmail({
        to: contactValue,
        subject: finalSubject,
        body: finalBody,
      });
      if (res.ok) {
        // Log the outreach event separately
        await addOutreach({
          leadName: lead.name,
          leadId: lead.id,
          platform: "email",
          message: finalBody,
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
          {/* Subject preview on Mail channel rows — visible without
              expanding, so Leonardo can scan subjects across the queue. */}
          {channel === "email" && (
            <p className="mt-0.5 truncate text-[11px] italic text-cyan-200/80">
              ✉ {splitSubjectFromBody(draft).subject ?? emailSubject(lead)}
            </p>
          )}
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
              {contactValue ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/40 px-3 py-2 font-mono text-xs">
                  <span className="text-text-muted">{channel}</span>
                  <span className="truncate text-text">{contactValue}</span>
                </div>
              ) : channel === "email" ? (
                // No email contact from Holmes — let Leonardo paste one inline.
                // Auto-suggest from website domain (e.g. info@bagatin.hr).
                <div className="rounded-md border border-amber-400/40 bg-amber-500/5 px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-300">
                    ⚠ Holmes nije našao email — upiši ručno
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={manualContact}
                      onChange={(e) => setManualContact(e.target.value)}
                      placeholder={suggestedContact ?? "ime@klinika.hr"}
                      className="flex-1 rounded-sm border border-amber-400/30 bg-bg-elevated/60 px-2 py-1 font-mono text-xs text-text placeholder:text-text-dim focus:border-amber-400/70 focus:outline-none"
                    />
                    {suggestedContact && !manualContact && (
                      <button
                        type="button"
                        onClick={() => setManualContact(suggestedContact)}
                        className="rounded-sm border border-amber-400/40 bg-amber-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-200 hover:bg-amber-500/20"
                        title={`Auto-fill from website domain`}
                      >
                        Try {suggestedContact}
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Email subject preview — only for email channel. Shows
                  what the actual Gmail Subject header will be when sent
                  (parsed from leading "Subject:" line in AI draft, or
                  falls back to emailSubject(lead) heuristic). */}
              {channel === "email" && (
                <div className="rounded-md border border-cyan-400/30 bg-cyan-500/5 px-3 py-2">
                  <p className={"mb-1 text-[10px] font-mono uppercase tracking-wider " + channelMeta.accent}>
                    Email subject
                  </p>
                  <p className="font-medium text-sm text-cyan-100">
                    {splitSubjectFromBody(draft).subject ?? emailSubject(lead)}
                  </p>
                </div>
              )}

              {/* Draft message */}
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className={"text-[10px] font-mono uppercase tracking-wider " + channelMeta.accent}>
                    {channel === "phone" ? "Calling script" : "Pre-drafted poruka"}
                  </p>
                  {initialResult.swapCount > 0 && (
                    <span
                      className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200"
                      title={initialResult.reasons.join(" · ")}
                    >
                      ✨ Premium-cleaned · {initialResult.swapCount} swap{initialResult.swapCount === 1 ? "" : "s"}
                    </span>
                  )}
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
                      title={
                        !contactValue
                          ? "Upiši primateljev email iznad — bez toga ne mogu poslati"
                          : pending
                            ? "Šaljem..."
                            : `Pošalji na ${contactValue}`
                      }
                      className={
                        "flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-all " +
                        channelMeta.bg +
                        " " +
                        channelMeta.accent +
                        " hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
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
                      // For WhatsApp, reuse a single named tab across clicks so
                      // we don't spawn multiple web.whatsapp.com tabs that
                      // fight over the same WhatsApp Web session (WA Web only
                      // allows one active claim per browser — extra tabs get
                      // stuck on the loading spinner). For everything else,
                      // open in a fresh tab as before.
                      target={
                        channel === "whatsapp"
                          ? "lamon-whatsapp-web"
                          : "_blank"
                      }
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

                <button
                  onClick={() => markSent(draft, channel)}
                  disabled={pending}
                  title={
                    channel === "email"
                      ? "Use this when you sent the email externally (Gmail web/app) instead of clicking 'Pošalji preko Gmail'"
                      : undefined
                  }
                  className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 disabled:opacity-50"
                >
                  <Check size={12} />
                  Mark sent
                </button>

                {/*
                 * Parallel WhatsApp quick-send button on the email card.
                 * Multi-touch outreach (email + WhatsApp same day) roughly
                 * triples response rate, so when Leonardo sends an email
                 * to a lead that ALSO has a phone number, surface a one-
                 * click WhatsApp shortcut right next to "Pošalji preko
                 * Gmail" instead of forcing him to scroll to the WA card.
                 *
                 * Uses the same named-tab target as the WhatsApp card so
                 * subsequent clicks reuse the existing WhatsApp Web tab
                 * (no session-conflict spinner).
                 */}
                {channel === "email" &&
                  (() => {
                    const waNumRaw = lead.holmes_report?.channels?.phone ?? "";
                    const waNum = waNumRaw.replace(/[^0-9+]/g, "").replace(/^\+/, "");
                    if (!waNum) return null;
                    // Short WhatsApp body — more conversational than email,
                    // references the email he just sent so the recipient
                    // bridges the two touchpoints in their head.
                    const waBody =
                      `Pozdrav, poslao sam vam mail o filtriranju pacijenata ` +
                      `prije recepcije — možda ćete kasnije pogledati. Ako ` +
                      `vam je lakše porazgovarati ovdje, samo javite. — Leonardo`;
                    const waHref = `https://web.whatsapp.com/send?phone=${waNum}&text=${encodeURIComponent(waBody)}`;
                    const handleWaClick = () => {
                      // Belt-and-suspenders: copy phone + message to
                      // clipboard so Leonardo can paste into his existing
                      // logged-in WhatsApp Business tab even if the
                      // session-conflict spinner blocks the new tab from
                      // loading. Format: "+38591…\n\n[message]" so pasting
                      // into WA search jumps to the contact, and a second
                      // paste into the message box drops the prefilled text.
                      const clipboardPayload = `+${waNum}\n\n${waBody}`;
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(clipboardPayload).then(() => {
                          setWaCopied(true);
                          setTimeout(() => setWaCopied(false), 2500);
                        });
                      }
                      // Still attempt to open the named WhatsApp tab — if
                      // it works, great; if it spins because of an
                      // existing WA Web session in another tab, Leonardo
                      // just alt-tabs there and pastes from clipboard.
                      if (typeof window !== "undefined") {
                        window.open(waHref, "lamon-whatsapp-web");
                      }
                    };
                    return (
                      <button
                        onClick={handleWaClick}
                        title={
                          `Kopira +${waNum} + poruku u clipboard i pokušava otvoriti ` +
                          `WhatsApp tab. Ako tab zapne, idi na svoju WA Business tabu i paste.`
                        }
                        className="flex items-center gap-1 rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                      >
                        <span className="text-sm leading-none">{waCopied ? "✅" : "💬"}</span>
                        {waCopied ? "Kopirano + WA otvoren" : "i WhatsApp"}
                      </button>
                    );
                  })()}
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
  switch (channel) {
    case "instagram":
      return ch?.instagram_personal ?? ch?.instagram_company ?? null;
    case "linkedin":
      return ch?.linkedin_personal ?? ch?.linkedin_company ?? null;
    case "email":
      return resolveEmailForLead(lead);
    case "phone":
      return ch?.phone ?? null;
    case "whatsapp":
      // WhatsApp uses phone number as the contact
      return ch?.phone ?? null;
  }
}

/**
 * Resolve a sendable email for the lead by walking all known sources in
 * priority order. Returns the FIRST hit so we never have to ask Leonardo
 * to type anything.
 *
 *   1. Holmes channels.email — explicit extraction from socials/website
 *   2. person_enrichment.owner.channels.email — Apollo owner channel
 *   3. person_enrichment.owner.email — Apollo owner profile email
 *   4. lead.email — top-level (CSV import / Apollo basic)
 *   5. Notes-extracted "Owner email:" / "Email:" line
 *   6. Notes-extracted bare email anywhere (foo@bar.tld pattern)
 *   7. Notes URL → info@<domain> (any https://… in notes)
 *   8. Lead name slug → info@<slug>.hr (last-ditch guess)
 *
 * If none match (truly empty notes + name un-sluggable), returns null
 * and the UI surfaces a manual input box.
 */
function resolveEmailForLead(lead: LeadRow): string | null {
  // 1 & 2 & 3: Holmes + Apollo owner
  const holmesEmail = lead.holmes_report?.channels?.email;
  if (holmesEmail) return holmesEmail;
  const owner = lead.person_enrichment?.owner;
  const ownerChannelEmail = owner?.channels?.email;
  if (ownerChannelEmail) return ownerChannelEmail;
  if (owner?.email) return owner.email;
  // 4: top-level lead.email column
  if (lead.email) return lead.email;
  const notes = lead.notes ?? "";
  // 5: notes — labeled email
  const labeledMatch = notes.match(
    /(?:Owner email|Email|Mail):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  );
  if (labeledMatch) return labeledMatch[1].toLowerCase();
  // 6: notes — any bare email
  const bareEmailMatch = notes.match(
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
  );
  if (bareEmailMatch) return bareEmailMatch[1].toLowerCase();
  // 7: notes URL → info@<domain>. Match ANY https://… or http://…
  // — not just explicitly labeled "Website:". Strip www. and common
  // subdomains. Skip social media domains (instagram.com etc.).
  const urlMatch = notes.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)/);
  if (urlMatch) {
    const host = urlMatch[1].toLowerCase();
    const socialDomains = [
      "instagram.com",
      "facebook.com",
      "tiktok.com",
      "linkedin.com",
      "youtube.com",
      "x.com",
      "twitter.com",
      "google.com",
      "google.hr",
      "googleusercontent.com",
    ];
    if (!socialDomains.some((d) => host.endsWith(d))) {
      return `info@${host}`;
    }
  }
  // 8: derive from lead name slug as last-ditch fallback. Strip Croatian
  // diacritics, drop common suffixes ("klinika", "centar", "dental",
  // "stomatologija"), kebab-case the rest. Reasonable for short names
  // ("Premium Smile" → premium-smile.hr) but skip for very long
  // institutional names where the guess would be wildly wrong.
  const slugSource = lead.name
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "d")
    .replace(
      /\b(klinika|centar|center|dental|stomatologija|stomatoloska|poliklinika|ordinacija)\b/gi,
      "",
    )
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  // Skip if slug is too long (>30 chars = likely institutional name we
  // can't guess) or too short (<3 chars).
  if (slugSource.length >= 3 && slugSource.length <= 30) {
    return `info@${slugSource}.hr`;
  }
  return null;
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
      // Use web.whatsapp.com/send directly so the chat opens inside the user's
      // existing WhatsApp Web session (which can be linked to a WhatsApp
      // Business phone account). wa.me/ redirects through a landing page that
      // can mis-route to a different WhatsApp session.
      const num = contact.replace(/[^0-9+]/g, "").replace(/^\+/, "");
      return `https://web.whatsapp.com/send?phone=${num}&text=${encoded}`;
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
  // Prefer the AI-authored subject if it's at the top of the draft body
  // (e.g. "Subject: Videntis ima sadržaj — nedostaje sustav…"). Otherwise
  // fall back to a Holmes best_angle.summary if short, else generic.
  const draft =
    lead.holmes_report?.channel_drafts?.email ??
    lead.holmes_report?.outreach_draft ??
    "";
  const fromDraft = splitSubjectFromBody(draft).subject;
  if (fromDraft) return cleanPremiumLanguage(fromDraft).cleaned;
  const angle = lead.holmes_report?.best_angle?.summary;
  const raw =
    angle && angle.length < 60 ? angle : `${lead.name} — kratko pitanje`;
  return cleanPremiumLanguage(raw).cleaned;
}

/**
 * Detects a leading "Subject: …" line in a draft body and splits it off.
 * Returns the parsed subject + cleaned body (with the line removed).
 *
 * The AI sometimes emits a `Subject: …` line at the very top of the
 * draft. If we don't extract it, the recipient sees "Subject: X" as
 * literal text in the email body, while the actual email Subject header
 * stays as a generic fallback ("X — kratko pitanje"). This is the bug
 * Leonardo flagged after the Videntis send.
 */
function splitSubjectFromBody(raw: string): {
  subject: string | null;
  body: string;
} {
  if (!raw) return { subject: null, body: raw };
  const lines = raw.split(/\r?\n/);
  const first = lines[0]?.trim() ?? "";
  // Match: "Subject:", "SUBJECT:", optional bold markers etc.
  const m = first.match(/^\**\s*subject\s*:\s*(.+?)\s*\**$/i);
  if (!m) return { subject: null, body: raw };
  const subject = m[1].trim();
  if (!subject) return { subject: null, body: raw };
  // Drop the Subject line + any blank line right after it
  let cut = 1;
  while (cut < lines.length && lines[cut].trim() === "") cut++;
  const body = lines.slice(cut).join("\n").trimStart();
  return { subject, body };
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
