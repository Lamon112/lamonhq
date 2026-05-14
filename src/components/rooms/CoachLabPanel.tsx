"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Activity, CheckCircle } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  niche: string | null;
  primary_platform: string | null;
  monthly_goal_eur: number | null;
  status: string;
  months_paid: number;
  monthly_fee_eur: number;
  ai_roadmap_generated_at: string | null;
}

interface Checkin {
  id: string;
  student_id: string;
  student_name: string;
  week_number: number;
  ai_generated_at: string | null;
  leonardo_approved: boolean;
}

export function CoachLabPanel() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [pendingCheckins, setPendingCheckins] = useState<Checkin[]>([]);

  useEffect(() => {
    fetch("/api/coach-lab/overview")
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students ?? []);
        setPendingCheckins(d.pendingCheckins ?? []);
      })
      .catch(() => setStudents([]));
  }, []);

  if (students === null) {
    return (
      <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-xs text-text-muted">
        Učitavam Coach Lab...
      </div>
    );
  }

  const active = students.filter((s) => s.status === "active");
  const onboarding = students.filter((s) => s.status === "onboarding");
  const totalMrr = active.reduce((sum, s) => sum + (s.monthly_fee_eur ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 via-bg-card/60 to-bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-500/15">
            <BookOpen size={22} className="text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text">Coach Lab</h3>
            <p className="mt-1 text-sm text-text-muted">
              AI YouTube biznis coach za tvoje 1:1 mentorstvo studente.
              Onboarding intake → 12-tj Opus roadmap → weekly Sonnet check-in
              analiza. Leonardo oversight: svaki AI reply moraš odobriti prije
              slanja (default-on safety).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Active"
                value={String(active.length)}
                hint={`€${totalMrr.toLocaleString()}/mj MRR`}
                tone="success"
                icon={<GraduationCap size={12} />}
              />
              <Stat
                label="Onboarding"
                value={String(onboarding.length)}
                hint="awaiting roadmap"
                tone="warning"
                icon={<Activity size={12} />}
              />
              <Stat
                label="Pending checkins"
                value={String(pendingCheckins.length)}
                hint="čeka tvoj approve"
                tone={pendingCheckins.length > 0 ? "danger" : "neutral"}
                icon={<CheckCircle size={12} />}
              />
              <Stat
                label="Slots"
                value={`${active.length}/5`}
                hint="€500/mj × 3-mj min"
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
          Još nemaš ni jednog studenta. Otvori action: createStudent iz
          src/app/actions/coachLab.ts (UI form ships v1.1).
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Studenti
          </h4>
          {students.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-border bg-bg-card/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text">{s.full_name}</p>
                  <p className="text-[11px] text-text-muted">
                    {s.niche ?? "(no niche)"} · {s.primary_platform ?? "?"} ·
                    cilj €{s.monthly_goal_eur ?? "?"}/mj
                  </p>
                  {s.ai_roadmap_generated_at && (
                    <p className="mt-1 text-[10px] text-emerald-300">
                      ✓ Roadmap generiran
                    </p>
                  )}
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  <p>{s.status}</p>
                  <p>{s.months_paid} mj plaćeno</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingCheckins.length > 0 && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold text-amber-100">
            🚨 {pendingCheckins.length} AI check-in analize čekaju tvoj approve
            prije slanja studentu
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-amber-200/80">
            {pendingCheckins.slice(0, 5).map((c) => (
              <li key={c.id}>
                · {c.student_name} W{c.week_number}
              </li>
            ))}
          </ul>
        </div>
      )}
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
  tone: "neutral" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "danger"
      ? "border-rose-400/50 bg-rose-500/10"
      : tone === "warning"
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
