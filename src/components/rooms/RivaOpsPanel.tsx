"use client";

/**
 * Riva Ops — per-clinic monitor for what Riva (voice agent) is doing.
 *
 * Shows for each active Plima Voice client:
 *   - Config status (voice profile, language, hours, busy/idle)
 *   - Last N calls with outcome + duration + transcript link
 *   - Live stats (total calls today/week, avg duration, conversion rate)
 *   - Alerts (failed calls, low confidence, escalations needed)
 *
 * Phase 1: shell + manual call-log entry. Phase 2: live Vapi webhook
 * integration so calls auto-populate. Phase 3: AI evaluation of each
 * transcript (was qualification correct? was escalation handled?).
 *
 * NB: Baywash is NOT a Plima Voice client (compensation/barter detailing)
 * — the room handles "no Riva yet" gracefully by showing "Onboard Riva"
 * CTA per non-equipped client.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Phone,
  PhoneCall,
  PhoneOff,
  Activity,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import type { ClientRow } from "@/lib/queries";

interface Props {
  initialClients: ClientRow[];
}

type CallOutcome =
  | "booked"
  | "qualified"
  | "info"
  | "wrong_number"
  | "voicemail"
  | "escalated"
  | "failed";

interface RivaCall {
  id: string;
  startedAt: string;
  durationSec: number;
  callerNumber?: string;
  callerName?: string;
  outcome: CallOutcome;
  transcript?: string;
  confidence?: number; // 0-1
  language?: string;
}

interface RivaProfile {
  /** Has Riva been provisioned for this client? */
  provisioned: boolean;
  voicePreset?: "warm-hr-female" | "professional-hr-female" | "premium-multilingual";
  languages?: string[];
  hours?: string; // "24/7" or "08-20 Mon-Fri"
  busy: boolean; // currently handling a call?
  callsToday: number;
  callsThisWeek: number;
  avgDurationSec: number;
  conversionRate: number; // booked / total
  lastCallAt?: string;
  recentCalls: RivaCall[];
}

const OUTCOME_META: Record<
  CallOutcome,
  { label: string; tone: string; bg: string; Icon: typeof Phone }
> = {
  booked: {
    label: "Booked",
    tone: "text-emerald-300",
    bg: "border-emerald-400/40 bg-emerald-500/10",
    Icon: CheckCircle,
  },
  qualified: {
    label: "Qualified",
    tone: "text-cyan-300",
    bg: "border-cyan-400/40 bg-cyan-500/10",
    Icon: PhoneCall,
  },
  info: {
    label: "Info",
    tone: "text-blue-300",
    bg: "border-blue-400/40 bg-blue-500/10",
    Icon: Phone,
  },
  escalated: {
    label: "Escalated",
    tone: "text-amber-300",
    bg: "border-amber-400/40 bg-amber-500/10",
    Icon: AlertTriangle,
  },
  voicemail: {
    label: "Voicemail",
    tone: "text-stone-300",
    bg: "border-stone-400/40 bg-stone-500/10",
    Icon: Phone,
  },
  wrong_number: {
    label: "Wrong#",
    tone: "text-stone-400",
    bg: "border-stone-500/40 bg-stone-500/10",
    Icon: PhoneOff,
  },
  failed: {
    label: "Failed",
    tone: "text-rose-300",
    bg: "border-rose-400/40 bg-rose-500/10",
    Icon: PhoneOff,
  },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `prije ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `prije ${h}h`;
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

/**
 * Phase 1 stub: synthesize a RivaProfile from the client row. Since we
 * don't have the Riva backend wired yet, this returns an empty profile
 * (provisioned=false) which renders the "Onboard Riva" placeholder.
 * Phase 2 will load real call data from a `riva_calls` table populated
 * by Vapi webhooks.
 */
function profileForClient(client: ClientRow): RivaProfile {
  // For Phase 1 — everyone is non-provisioned (no Riva backend yet).
  // When the Riva runtime is live and we have client_id → vapi_assistant_id
  // mappings, swap this out for a real DB lookup.
  return {
    provisioned: false,
    busy: false,
    callsToday: 0,
    callsThisWeek: 0,
    avgDurationSec: 0,
    conversionRate: 0,
    recentCalls: [],
  };
}

/**
 * DEMO PREVIEW — a fully-provisioned, currently-busy Riva profile for a
 * hypothetical clinic (Apex Dental Centar). Shows Leonardo what the room
 * looks like once Riva is live and handling real patient calls. Realistic
 * mix of outcomes: 4 booked, 1 qualified (callback), 1 escalated to
 * doctor, 1 info-only, 1 voicemail. Multilingual hint via Slovenian
 * caller. Marked DEMO via the client name suffix so it's never confused
 * with real data.
 */
const DEMO_RIVA: { client: ClientRow; profile: RivaProfile } = {
  client: {
    id: "demo-apex-riva",
    name: "Apex Dental Centar (DEMO)",
    type: "b2b_clinic",
    status: "active",
    monthly_revenue: 1497,
    start_date: new Date().toISOString(),
    notes: "DEMO PREVIEW — not a real client. Shows what Riva Ops looks like when fully provisioned.",
    last_touchpoint_at: null,
    next_action: null,
    next_action_date: null,
    churn_risk: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  profile: {
    provisioned: true,
    voicePreset: "warm-hr-female",
    languages: ["HR", "EN", "SL"],
    hours: "08-20 Mon-Sat",
    busy: true,
    callsToday: 12,
    callsThisWeek: 47,
    avgDurationSec: 105, // 1:45
    conversionRate: 0.38,
    lastCallAt: new Date(Date.now() - 30 * 1000).toISOString(),
    recentCalls: [
      {
        id: "demo-1",
        startedAt: new Date(Date.now() - 30 * 1000).toISOString(),
        durationSec: 142,
        callerName: "Ivana Marić",
        callerNumber: "+385 91 555 1234",
        outcome: "booked",
        confidence: 0.94,
        language: "HR",
        transcript:
          "Pacijentica je zvala za konzultaciju o implantatima. Riva je kvalificirala (1 izgubljeni zub, prošla nije imala iskustvo s klinikom, budžet 800-1200€). Bukirana srijeda 11:00 kod dr. Špehara.",
      },
      {
        id: "demo-2",
        startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        durationSec: 89,
        callerName: "Marko Babić",
        callerNumber: "+385 98 123 9876",
        outcome: "qualified",
        confidence: 0.87,
        language: "HR",
        transcript:
          "Caller pitao za all-on-4. Riva ga je educirala (proces, trajanje, indikativni raspon), kvalificirala (interes je tu, želi razmisliti). Callback zakazan za petak 10h.",
      },
      {
        id: "demo-3",
        startedAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
        durationSec: 23,
        callerName: "Nepoznat",
        callerNumber: "+385 95 888 4421",
        outcome: "escalated",
        confidence: 0.65,
        language: "HR",
        transcript:
          "Caller je odmah počeo glasno govoriti o nezadovoljstvu s prethodnim tretmanom. Riva nije pokušala kvalificirati — escalation rule okinula u 12s, poziv prebačen na dr. Špehar mobitel uz 30s context briefing.",
      },
      {
        id: "demo-4",
        startedAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
        durationSec: 67,
        callerName: "Tina Horvat",
        callerNumber: "+385 91 222 3344",
        outcome: "booked",
        confidence: 0.96,
        language: "HR",
        transcript:
          "Pacijent rutinski pregled + čišćenje. Riva fully autonomous — provjerila kalendar, predložila slobodne termine, potvrdila četvrtak 14:30.",
      },
      {
        id: "demo-5",
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        durationSec: 154,
        callerName: "Jan Kovač",
        callerNumber: "+386 41 555 2233",
        outcome: "booked",
        confidence: 0.91,
        language: "SL",
        transcript:
          "Slovenski pacijent zvao za implantate (dental turizam). Riva detected SL → switched to slovenian voice profile. Educirala o procesu + dao orientacijski raspored 2-dnevnog termina. Bukirano za drugi tjedan u utorak 09:00.",
      },
      {
        id: "demo-6",
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        durationSec: 35,
        callerName: "Anonimni",
        outcome: "info",
        confidence: 0.88,
        language: "HR",
        transcript:
          "Caller pitao radno vrijeme + adresu. Riva dala info + soft CTA (\"mogu Vam odmah pomoći ako želite zakazati termin\"). Caller rekao da će razmisliti.",
      },
      {
        id: "demo-7",
        startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        durationSec: 8,
        callerNumber: "+385 99 000 1111",
        outcome: "wrong_number",
        confidence: 0.95,
        language: "HR",
        transcript:
          "Caller pitao za pizzeriju. Riva: 'Bok, ovo je Apex Dental Centar. Mislim da imate krivi broj. Ugodan dan!'",
      },
      {
        id: "demo-8",
        startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        durationSec: 18,
        callerName: "Petra Novak",
        callerNumber: "+385 91 444 7788",
        outcome: "voicemail",
        confidence: 0.7,
        language: "HR",
        transcript:
          "Caller frustrirana, htjela hitno govoriti s doktorom, Riva nije uspjela zadržati. Voicemail message: 'Trebam dr. Špehara hitno za zub koji me boli, javim se opet sutra.' → Auto-push Leonardu kao Telegram alert.",
      },
    ],
  },
};

export function RivaOpsPanel({ initialClients }: Props) {
  // Demo preview toggle — surfaces a fully-provisioned Apex Dental card
  // at the top so Leonardo can see what the room looks like once Riva
  // is handling real patient calls. Defaults ON so the room is never
  // empty-looking on first visit. Toggle off to see only real state.
  const [demoVisible, setDemoVisible] = useState(true);

  const activeClients = useMemo(
    () => initialClients.filter((c) => c.status === "active"),
    [initialClients],
  );
  // B2B clinics are the Riva target — strip B2C coaches + affiliates.
  const rivaTargets = useMemo(
    () => activeClients.filter((c) => c.type === "b2b_clinic"),
    [activeClients],
  );

  const realProfiles = useMemo(
    () =>
      activeClients.map((c) => ({
        client: c,
        profile: profileForClient(c),
      })),
    [activeClients],
  );

  const profiles = demoVisible
    ? [DEMO_RIVA, ...realProfiles]
    : realProfiles;

  const [expandedId, setExpandedId] = useState<string | null>(
    demoVisible ? DEMO_RIVA.client.id : realProfiles[0]?.client.id ?? null,
  );

  // Global summary — counts include DEMO row when visible so the stats
  // tiles also "come alive" in demo mode. Production state would only
  // count real provisioned clinics.
  const totalProvisioned = profiles.filter((p) => p.profile.provisioned).length;
  const totalCallsToday = profiles.reduce(
    (sum, p) => sum + p.profile.callsToday,
    0,
  );
  const totalBusy = profiles.filter((p) => p.profile.busy).length;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-rose-300">
            Riva Ops · {totalProvisioned} klinika opremlj
            {totalProvisioned === 1 ? "ena" : "eno"}
          </h3>
          <p className="text-xs text-text-muted">
            Real-time monitor za Riva voice agent po klijentu · pozivi · alerts · transcripts
          </p>
        </div>
        <button
          onClick={() => setDemoVisible((v) => !v)}
          className={
            "flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all " +
            (demoVisible
              ? "border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
              : "border-border bg-bg-card text-text-muted hover:border-amber-400/40 hover:text-amber-200")
          }
          title="Toggle DEMO preview card (Apex Dental — fake but realistic Riva data)"
        >
          {demoVisible ? "▸ Sakrij DEMO" : "▸ Prikaži DEMO preview"}
        </button>
      </div>

      {/* ── Global stats ── */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-rose-300">
            Today's calls
          </div>
          <div className="font-mono text-2xl font-bold text-rose-200">
            {totalCallsToday}
          </div>
          <div className="text-[10px] text-text-dim">across all clinics</div>
        </div>
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300">
            Live now
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-200">
            {totalBusy}
            <span className="ml-1 text-sm font-normal text-emerald-400/80">
              {totalBusy > 0 ? "active" : "idle"}
            </span>
          </div>
          <div className="text-[10px] text-text-dim">Riva instancama</div>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-amber-300">
            Capacity
          </div>
          <div className="font-mono text-2xl font-bold text-amber-200">
            {rivaTargets.length - totalProvisioned}
          </div>
          <div className="text-[10px] text-text-dim">klinika čeka onboarding</div>
        </div>
      </div>

      {/* ── Per-client cards ── */}
      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-card/40 px-6 py-8 text-center">
          <p className="text-sm text-text">
            Nema aktivnih klijenata. Riva Ops postaje korisna kad onboardaš prvu kliniku s Plima Voice paketom.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map(({ client, profile }) => (
            <ClientRivaCard
              key={client.id}
              client={client}
              profile={profile}
              expanded={expandedId === client.id}
              onToggle={() =>
                setExpandedId((id) => (id === client.id ? null : client.id))
              }
            />
          ))}
        </div>
      )}

      {/* Future hookup note */}
      <p className="mt-4 text-[10px] text-text-dim">
        v1: shell (svi klijenti pre-Riva). v2: Vapi webhook hookup → live call
        log po klinici. v3: AI quality-eval po transcriptu (kvalifikacija +
        eskalacija + tone).
      </p>
    </div>
  );
}

function ClientRivaCard({
  client,
  profile,
  expanded,
  onToggle,
}: {
  client: ClientRow;
  profile: RivaProfile;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isDemo = client.name.includes("(DEMO)");
  return (
    <div
      className={
        "overflow-hidden rounded-lg border bg-bg-card/60 transition-all " +
        (isDemo
          ? "border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/20"
          : expanded
            ? "border-rose-400/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
            : "border-border hover:border-border-strong")
      }
    >
      {isDemo && (
        <div className="border-b border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200">
          ⚠ DEMO PREVIEW — sintetički podaci za vizualizaciju, nije pravi klijent
        </div>
      )}
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={
            "flex h-9 w-9 items-center justify-center rounded-md border " +
            (profile.provisioned
              ? profile.busy
                ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                : "border-rose-400/40 bg-rose-500/10 text-rose-200"
              : "border-stone-500/40 bg-stone-500/10 text-stone-400")
          }
        >
          <Mic size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-text">
              {client.name}
            </p>
            {profile.provisioned ? (
              profile.busy ? (
                <span className="flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_3px_rgba(110,231,183,1)]" />
                  ON CALL
                </span>
              ) : (
                <span className="rounded border border-rose-400/40 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-300">
                  IDLE
                </span>
              )
            ) : (
              <span className="rounded border border-stone-500/40 bg-stone-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-stone-400">
                NOT PROVISIONED
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-text-muted">
            {profile.provisioned
              ? `${profile.callsToday} today · ${profile.callsThisWeek} this week · ${(profile.conversionRate * 100).toFixed(0)}% conversion`
              : `${client.type === "b2b_clinic" ? "Klinika — kandidat za Plima Voice paket" : "B2C — Riva nije za ovaj tip klijenta"}`}
          </p>
        </div>
        <span className="text-text-dim">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-rose-400/20 px-4 py-3">
              {!profile.provisioned ? (
                <div className="rounded-md border border-amber-400/30 bg-amber-500/5 px-3 py-3 text-center">
                  <p className="text-sm text-amber-100">
                    Riva nije provisionirana za ovog klijenta.
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {client.type === "b2b_clinic"
                      ? "Sljedeći korak: pokreni Plima Voice setup → Vapi asistent → telefonski broj → routing. ETA Phase 1 build (in progress)."
                      : "Riva voice agent je per design samo za B2B klinike (Plima Voice paket). Za B2C coache/affiliates ne aktiviramo."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Config strip */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border border-rose-400/30 bg-rose-500/5 px-2 py-1.5">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-rose-300">
                        Voice
                      </div>
                      <div className="font-mono text-[11px] text-text">
                        {profile.voicePreset ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-md border border-rose-400/30 bg-rose-500/5 px-2 py-1.5">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-rose-300">
                        Languages
                      </div>
                      <div className="font-mono text-[11px] text-text">
                        {profile.languages?.join(", ") ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-md border border-rose-400/30 bg-rose-500/5 px-2 py-1.5">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-rose-300">
                        Hours
                      </div>
                      <div className="font-mono text-[11px] text-text">
                        {profile.hours ?? "24/7"}
                      </div>
                    </div>
                  </div>

                  {/* Recent calls */}
                  <div>
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-rose-300">
                      Recent calls · {profile.recentCalls.length}
                    </p>
                    {profile.recentCalls.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border bg-bg-card/40 px-3 py-2 text-center text-[11px] text-text-muted">
                        Još nema poziva.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {profile.recentCalls.slice(0, 8).map((call) => {
                          const meta = OUTCOME_META[call.outcome];
                          const Icon = meta.Icon;
                          return (
                            <div
                              key={call.id}
                              className="overflow-hidden rounded-md border border-border bg-bg-elevated/40"
                            >
                              {/* Call row header */}
                              <div className="flex items-center gap-2 px-2 py-1.5">
                                <span
                                  className={
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded border " +
                                    meta.bg +
                                    " " +
                                    meta.tone
                                  }
                                >
                                  <Icon size={10} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate font-mono text-[11px] font-semibold text-text">
                                      {call.callerName ??
                                        call.callerNumber ??
                                        "Anon"}
                                    </p>
                                    {call.language && (
                                      <span className="rounded border border-stone-500/40 bg-stone-500/10 px-1 py-px font-mono text-[8px] uppercase tracking-wider text-stone-300">
                                        {call.language}
                                      </span>
                                    )}
                                    {call.confidence != null && (
                                      <span
                                        className={
                                          "font-mono text-[9px] " +
                                          (call.confidence >= 0.85
                                            ? "text-emerald-300"
                                            : call.confidence >= 0.7
                                              ? "text-amber-300"
                                              : "text-rose-300")
                                        }
                                      >
                                        {(call.confidence * 100).toFixed(0)}% conf
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-[9px] text-text-dim">
                                    {formatDuration(call.durationSec)} ·{" "}
                                    {formatWhen(call.startedAt)}
                                    {call.callerNumber && call.callerName
                                      ? ` · ${call.callerNumber}`
                                      : ""}
                                  </p>
                                </div>
                                <span
                                  className={
                                    "shrink-0 rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                                    meta.bg +
                                    " " +
                                    meta.tone
                                  }
                                >
                                  {meta.label}
                                </span>
                              </div>
                              {/* Transcript summary — the killer demo content */}
                              {call.transcript && (
                                <div className="border-t border-border/50 bg-bg-card/40 px-2 py-1.5">
                                  <p className="mb-0.5 font-mono text-[8px] uppercase tracking-wider text-text-muted">
                                    Transcript summary
                                  </p>
                                  <p className="text-[11px] leading-relaxed text-text">
                                    {call.transcript}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
