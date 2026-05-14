"use client";

/**
 * Clinic Caller — HUMAN cold-caller CRM (Leonardov 2026-05-14 pivot per
 * Notion plan "18h dead time + cold caller hire pivot").
 *
 * NOT AI voice (Vapi). Real human earning €200/Plima Voice close, paid
 * weekly. Lamon HQ tracks: caller roster, queue assignments, daily call
 * reports, quality Zooms (≥15min + decision-maker present), close status,
 * payout ledger.
 *
 * Compensation model (locked):
 *   - Trial week: 50 calls test, no fixed pay, go/no-go after 7 days
 *   - First 3 closes: €200 / Voice close (cash 7 days)
 *   - Close #4+: €200 Voice / €300 Premium / €100 Mreza + €30/quality Zoom
 *
 * Realistic math (1 caller, full ramp):
 *   10 calls/day × 25 days = 250 calls/mj
 *   10% book rate → 25 Zooms/mj
 *   20% close rate → 5 closes
 *   Caller earns ~€1,660/mj
 *   Lamon recurring revenue ~€7,485/mj per caller
 *
 * Optimal call windows:
 *   9:30-11:30 + 14:00-16:30 (HR dental hours, NOT 12-13h pause, NOT 17h+)
 */

import { useEffect, useState } from "react";
import {
  PhoneCall,
  CheckCircle,
  Clock,
  User,
  Banknote,
  TrendingUp,
} from "lucide-react";

interface ColdCaller {
  id: string;
  full_name: string;
  status: "trial" | "active" | "paused" | "churned";
  trial_started_at: string | null;
  trial_ends_at: string | null;
  go_no_go_decision: string | null;
}

interface QueueRow {
  id: string;
  clinic_name: string;
  phone_e164: string;
  decision_maker_name: string | null;
  status: string;
  attempts_made: number;
  max_attempts: number;
  final_outcome: string | null;
  assigned_caller_id: string | null;
  caller_name: string | null;
}

interface PayoutSummary {
  caller_id: string;
  caller_name: string;
  earned_total_eur: number;
  unpaid_eur: number;
  closes_count: number;
  quality_zooms_count: number;
}

export function ClinicCallerPanel() {
  const [callers, setCallers] = useState<ColdCaller[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clinic-caller/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setCallers(d.callers ?? []);
          setQueue(d.queue ?? []);
          setPayouts(d.payouts ?? []);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-xs text-text-muted">
        Učitavam Clinic Caller CRM...
      </div>
    );
  }

  const totalUnpaid = payouts.reduce((sum, p) => sum + p.unpaid_eur, 0);
  const totalEarned = payouts.reduce((sum, p) => sum + p.earned_total_eur, 0);
  const totalCloses = payouts.reduce((sum, p) => sum + p.closes_count, 0);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-bg-card/60 to-bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/15">
            <PhoneCall size={22} className="text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text">Clinic Caller</h3>
            <p className="mt-1 text-sm text-text-muted">
              Human cold-caller CRM. Pure performance: €200 / Plima Voice
              close (€300 Premium / €100 Mreža). Optimal call windows:
              <strong className="text-amber-300"> 9:30-11:30 i 14:00-16:30</strong>{" "}
              (NE 12-13h pauza, NE 17h+ dead time).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Aktivni callers"
                value={callers.filter((c) => c.status === "active").length.toString()}
                hint={`${callers.filter((c) => c.status === "trial").length} u trialu`}
                tone="success"
                icon={<User size={12} />}
              />
              <Stat
                label="Queue"
                value={queue.filter((q) => q.status === "queued").length.toString()}
                hint="leadova za zvati"
                icon={<Clock size={12} />}
              />
              <Stat
                label="Closes"
                value={totalCloses.toString()}
                hint={`€${totalEarned} ukupno`}
                tone="success"
                icon={<CheckCircle size={12} />}
              />
              <Stat
                label="Unpaid"
                value={`€${totalUnpaid}`}
                hint="moram isplatiti"
                tone={totalUnpaid > 0 ? "warning" : "neutral"}
                icon={<Banknote size={12} />}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded border border-rose-400/40 bg-rose-500/5 p-2 text-xs text-rose-200">
          ⚠ {error} — možda nije primijenjena migracija 0028 (cold_callers
          tabla). Otvori Supabase SQL editor i paste 0028_human_caller_pivot.sql.
        </div>
      )}

      {/* Callers roster */}
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          👥 Cold Callers ({callers.length})
        </h4>
        {callers.length === 0 ? (
          <div className="rounded border border-border bg-bg-card/40 p-3 text-xs text-text-muted">
            Još ni jednog cold caller-a. Hire pack je napravljen
            (Notion plan 2026-05-14): LinkedIn DM + Posao.hr + Facebook +
            IG story. Trial week 7 dana, 50 poziva, no fixed pay.
          </div>
        ) : (
          <div className="space-y-2">
            {callers.map((c) => (
              <div
                key={c.id}
                className={
                  "rounded-md border p-2.5 " +
                  (c.status === "trial"
                    ? "border-amber-400/40 bg-amber-500/5"
                    : c.status === "active"
                      ? "border-emerald-400/40 bg-emerald-500/5"
                      : "border-stone-400/30 bg-stone-500/5")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">{c.full_name}</p>
                    {c.trial_ends_at && c.status === "trial" && (
                      <p className="text-[10px] text-amber-200">
                        Trial do {c.trial_ends_at.slice(0, 10)} · go/no-go
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      "rounded px-2 py-0.5 text-[10px] uppercase " +
                      (c.status === "trial"
                        ? "bg-amber-500/20 text-amber-200"
                        : c.status === "active"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-stone-500/20 text-stone-300")
                    }
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout summary per caller */}
      {payouts.length > 0 && (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            💰 Payout summary
          </h4>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div
                key={p.caller_id}
                className="rounded-md border border-border bg-bg-card/40 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text">{p.caller_name}</p>
                  <div className="text-right">
                    <p className="text-xs text-emerald-200">
                      €{p.earned_total_eur} earned
                    </p>
                    {p.unpaid_eur > 0 && (
                      <p className="text-[10px] font-bold text-amber-200">
                        €{p.unpaid_eur} TO PAY
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-text-dim">
                  {p.closes_count} closeova · {p.quality_zooms_count} kvalitetnih Zoom-ova
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue */}
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          📋 Queue ({queue.length})
        </h4>
        {queue.length === 0 ? (
          <div className="rounded border border-border bg-bg-card/40 p-3 text-xs text-text-muted">
            Queue je prazan. INSERT-aj klinike u clinic_call_queue
            (clinic_name + phone_e164) i caller ih može pokupiti.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.slice(0, 15).map((q) => (
              <div
                key={q.id}
                className="rounded-md border border-border bg-bg-card/40 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{q.clinic_name}</p>
                    <p className="text-[10px] font-mono text-text-dim">
                      {q.phone_e164} · {q.decision_maker_name ?? "(no DM)"}
                      {q.caller_name && ` · → ${q.caller_name}`}
                    </p>
                  </div>
                  <div className="text-right text-[10px]">
                    <p className="font-mono text-text-muted">{q.status}</p>
                    <p className="text-text-dim">
                      {q.attempts_made}/{q.max_attempts}
                    </p>
                    {q.final_outcome && (
                      <p
                        className={
                          q.final_outcome.startsWith("won")
                            ? "font-bold text-emerald-300"
                            : "text-rose-300"
                        }
                      >
                        {q.final_outcome}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reference card */}
      <div className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-3">
        <p className="text-[11px] font-semibold text-sky-200">
          📚 Reference (Notion plan 2026-05-14)
        </p>
        <ul className="mt-1 space-y-0.5 text-[11px] text-sky-200/80">
          <li>· Trial: 50 poziva, 7 dana, no fixed pay</li>
          <li>· €200/Voice · €300/Premium · €100/Mreža</li>
          <li>· Close #4+: bonus €30/quality Zoom unaprijed</li>
          <li>· Quality Zoom = pojavio se + DM + 15+min + interes</li>
          <li>· Optimal: 9:30-11:30 i 14:00-16:30</li>
          <li>· DEAD: 12-13h, poslije 17h, petak nakon 14h</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "success" | "warning";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "warning"
      ? "border-amber-400/50 bg-amber-500/10"
      : tone === "success"
        ? "border-emerald-400/50 bg-emerald-500/10"
        : "border-border bg-bg-card/50";
  return (
    <div className={"rounded-lg border px-3 py-2 " + cls}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </p>
      <p className="text-lg font-bold text-text">{value}</p>
      {hint && <p className="text-[10px] text-text-dim">{hint}</p>}
    </div>
  );
}
