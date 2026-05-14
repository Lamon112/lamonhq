"use client";

import { useEffect, useState } from "react";
import { PhoneCall, CheckCircle, XCircle, Clock, Mic } from "lucide-react";

interface QueueRow {
  id: string;
  clinic_name: string;
  phone_e164: string;
  decision_maker_name: string | null;
  status: string;
  attempts_made: number;
  max_attempts: number;
  last_attempt_at: string | null;
  final_outcome: string | null;
}

interface Attempt {
  id: string;
  queue_id: string;
  clinic_name: string;
  outcome: string | null;
  duration_seconds: number | null;
  cost_usd: number;
  vapi_recording_url: string | null;
  ai_summary: string | null;
  started_at: string;
}

export function ClinicCallerPanel() {
  const [queue, setQueue] = useState<QueueRow[] | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    fetch("/api/clinic-caller/overview")
      .then((r) => r.json())
      .then((d) => {
        setQueue(d.queue ?? []);
        setAttempts(d.recentAttempts ?? []);
      })
      .catch(() => setQueue([]));
  }, []);

  if (queue === null) {
    return (
      <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-xs text-text-muted">
        Učitavam Clinic Caller...
      </div>
    );
  }

  const counts = {
    queued: queue.filter((q) => q.status === "queued").length,
    calling: queue.filter((q) => q.status === "calling").length,
    completed: queue.filter((q) => q.status === "completed").length,
    booked: queue.filter((q) => q.final_outcome === "booked").length,
  };

  const vapiConfigured =
    typeof process !== "undefined" && process.env?.VAPI_API_KEY != null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-400/40 bg-gradient-to-br from-sky-500/10 via-bg-card/60 to-bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-sky-400/50 bg-sky-500/15">
            <PhoneCall size={22} className="text-sky-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text">Clinic Caller</h3>
            <p className="mt-1 text-sm text-text-muted">
              AI voice agent (Vapi + ElevenLabs + Sonnet) zove dentalne /
              estetske ordinacije s tvojim 4-part outreach playbookom
              (opažanje → pain-point Q → solution-proof most → assumptive CTA).
              Cron svake 15 min, max 5 concurrent calls.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Queued" value={counts.queued.toString()} icon={<Clock size={12} />} />
              <Stat label="Calling" value={counts.calling.toString()} icon={<Mic size={12} />} tone="warning" />
              <Stat label="Completed" value={counts.completed.toString()} icon={<CheckCircle size={12} />} />
              <Stat label="Booked 🔥" value={counts.booked.toString()} tone="success" />
            </div>
            {!vapiConfigured && (
              <p className="mt-3 rounded border border-amber-400/40 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-200">
                ⚠ VAPI_API_KEY nije u Vercel envu — cron je no-op dok ne setiraš.
                Treba: VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, VAPI_ASSISTANT_ID,
                ELEVENLABS_HR_VOICE_ID, VAPI_WEBHOOK_SECRET.
              </p>
            )}
          </div>
        </div>
      </div>

      {queue.length === 0 && (
        <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
          Queue je prazan. Insertaj redove u clinic_call_queue
          (lead_id + clinic_name + phone_e164 minimalno) i cron krene.
        </div>
      )}

      {queue.length > 0 && (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Queue (top 10)
          </h4>
          <div className="space-y-2">
            {queue.slice(0, 10).map((q) => (
              <div
                key={q.id}
                className="rounded-md border border-border bg-bg-card/40 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{q.clinic_name}</p>
                    <p className="text-[10px] font-mono text-text-dim">
                      {q.phone_e164} ·{" "}
                      {q.decision_maker_name ?? "(no decision maker)"}
                    </p>
                  </div>
                  <div className="text-right text-[10px]">
                    <p className="font-mono text-text-muted">{q.status}</p>
                    <p className="text-text-dim">
                      {q.attempts_made}/{q.max_attempts} pokušaja
                    </p>
                    {q.final_outcome && (
                      <p className={
                        q.final_outcome === "booked"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }>
                        {q.final_outcome}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attempts.length > 0 && (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Zadnji pokušaji
          </h4>
          <div className="space-y-2">
            {attempts.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="rounded-md border border-border bg-bg-card/40 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">{a.clinic_name}</p>
                    {a.ai_summary && (
                      <p className="line-clamp-2 text-[11px] italic text-text-muted">
                        {a.ai_summary}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[10px]">
                    <p className={
                      a.outcome === "booked"
                        ? "font-bold text-emerald-300"
                        : "text-text-muted"
                    }>
                      {a.outcome ?? "?"}
                    </p>
                    {a.duration_seconds && (
                      <p className="text-text-dim">{a.duration_seconds}s · ${a.cost_usd.toFixed(2)}</p>
                    )}
                    {a.vapi_recording_url && (
                      <a
                        href={a.vapi_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-300 hover:underline"
                      >
                        🎙 listen
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "border-emerald-400/40 bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-400/40 bg-amber-500/10"
        : "border-border bg-bg-card/50";
  return (
    <div className={"rounded-lg border px-3 py-2 " + cls}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
        {icon}
        {label}
      </p>
      <p className="text-lg font-bold text-text">{value}</p>
    </div>
  );
}
