"use client";

/**
 * Side drawer for vault room "data-view" actions — instant dashboards
 * (clients, tasks, calendar, revenue, client stats).
 *
 * No Inngest, no AI cost. Just fetches via getRoomDataView() server
 * action and renders a compact list/table appropriate for that viewKey.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";
import {
  getRoomDataView,
  type RoomDataViewKey,
  type RoomDataViewPayload,
} from "@/app/actions/roomDataView";

interface Props {
  viewKey: RoomDataViewKey | null;
  title: string | null;
  onClose: () => void;
}

export function RoomDataViewDrawer({ viewKey, title, onClose }: Props) {
  return (
    <AnimatePresence>
      {viewKey && (
        <DrawerInner viewKey={viewKey} title={title ?? "View"} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function DrawerInner({
  viewKey,
  title,
  onClose,
}: {
  viewKey: RoomDataViewKey;
  title: string;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<RoomDataViewPayload | null>(null);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(null);
    getRoomDataView(viewKey).then((res) => {
      if (alive) setPayload(res);
    });
    return () => {
      alive = false;
    };
  }, [viewKey]);

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
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-2xl flex-col border-l-2 border-amber-500/40 bg-bg-elevated/98 backdrop-blur-md shadow-[-12px_0_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-strong px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Quick View
            </div>
            <h2 className="mt-0.5 truncate text-base font-semibold text-text">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-bg-card p-1.5 text-text-muted hover:border-gold/50 hover:text-text"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {!payload ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : !payload.ok ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger flex items-center gap-2">
              <AlertCircle size={14} /> {payload.error}
            </div>
          ) : (
            <ViewBody payload={payload} />
          )}
        </div>
      </motion.aside>
    </>
  );
}

function ViewBody({ payload }: { payload: Extract<RoomDataViewPayload, { ok: true }> }) {
  switch (payload.viewKey) {
    case "clients":
      return <ClientsBody data={payload.data} />;
    case "client_stats":
      return <ClientStatsBody data={payload.data} />;
    case "revenue":
      return <RevenueBody data={payload.data} />;
    case "tasks":
      return <TasksBody data={payload.data} />;
    case "booking":
      return <BookingBody data={payload.data} />;
  }
}

/* =============================== Clients =============================== */
function ClientsBody({ data }: { data: Extract<RoomDataViewPayload, { ok: true; viewKey: "clients" }>["data"] }) {
  return (
    <div className="space-y-5">
      <StatRow
        items={[
          { label: "Active", value: String(data.totals.activeCount) },
          { label: "Onboarding", value: String(data.totals.onboardingCount) },
          { label: "Paused", value: String(data.totals.pausedCount) },
          {
            label: "B2B MRR",
            value: `€${(data.totals.b2bMrrCents / 100).toFixed(0)}`,
          },
          {
            label: "B2C MRR",
            value: `€${(data.totals.b2cMrrCents / 100).toFixed(0)}`,
          },
        ]}
      />
      <Section title={`B2B klinike (${data.b2b.length})`}>
        {data.b2b.length === 0 ? (
          <Empty text="Još nema B2B clinic clients-a." />
        ) : (
          <ul className="space-y-1.5">
            {data.b2b.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-bg-card p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text truncate">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {c.type} · {c.status}
                    {c.nextAction ? ` · next: ${c.nextAction}` : ""}
                  </div>
                </div>
                <div className="font-mono text-xs text-emerald-300">
                  €{c.monthlyEur.toFixed(0)}/mj
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title={`B2C coachevi (${data.b2c.length})`}>
        {data.b2c.length === 0 ? (
          <Empty text="Još nema B2C clients-a." />
        ) : (
          <ul className="space-y-1.5">
            {data.b2c.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-bg-card p-2.5"
              >
                <div>
                  <div className="text-sm font-medium text-text">{c.name}</div>
                  <div className="text-[11px] text-text-muted">
                    {c.type} · {c.status}
                  </div>
                </div>
                <div className="font-mono text-xs text-emerald-300">
                  €{c.monthlyEur.toFixed(0)}/mj
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {data.barter.length > 0 && (
        <Section title={`Barter / komp. (${data.barter.length})`}>
          <ul className="space-y-1.5">
            {data.barter.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-stone-700 bg-stone-900/40 p-2.5 text-sm text-text-dim"
              >
                {c.name} · {c.type}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/* =========================== Client stats ============================ */
function ClientStatsBody({
  data,
}: {
  data: Extract<RoomDataViewPayload, { ok: true; viewKey: "client_stats" }>["data"];
}) {
  return (
    <div className="space-y-5">
      <StatRow
        items={[
          {
            label: "Avg MRR",
            value: `€${(data.totals.avgMrrCents / 100).toFixed(0)}`,
          },
          {
            label: "Median months",
            value: String(data.totals.medianMonthsActive),
          },
          { label: "At-risk", value: String(data.totals.atRiskCount) },
        ]}
      />
      <Section title="Per-klijent health">
        {data.perClient.length === 0 ? (
          <Empty text="Još nema klijenata." />
        ) : (
          <ul className="space-y-1.5">
            {data.perClient.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-border bg-bg-card p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-text">{c.name}</div>
                  <HealthBadge label={c.healthLabel} risk={c.churnRisk} />
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-text-muted">
                  <span>{c.type}</span>
                  <span>·</span>
                  <span className="font-mono text-emerald-300">
                    €{(c.mrrCents / 100).toFixed(0)}/mj
                  </span>
                  <span>·</span>
                  <span>{c.monthsActive}mj aktivan</span>
                </div>
                {c.nextAction && (
                  <div className="text-[11px] text-text-dim">
                    Next: {c.nextAction}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function HealthBadge({
  label,
  risk,
}: {
  label: "healthy" | "watch" | "at-risk";
  risk: number;
}) {
  const c =
    label === "healthy"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : label === "watch"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${c}`}
    >
      {label} · {Math.round(risk * 100)}%
    </span>
  );
}

/* ============================== Revenue =============================== */
function RevenueBody({
  data,
}: {
  data: Extract<RoomDataViewPayload, { ok: true; viewKey: "revenue" }>["data"];
}) {
  const goalPct = Math.min(
    100,
    Math.round((data.mrrCents / Math.max(1, data.goalCents)) * 100),
  );
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-yellow-500/5 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
          MRR · cilj 30K€/mj
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-bold text-text">
            €{(data.mrrCents / 100).toFixed(0)}
          </div>
          <div className="text-[11px] text-text-muted">
            / €{(data.goalCents / 100).toFixed(0)} ({goalPct}%)
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
          <span>
            B2B:{" "}
            <span className="font-mono text-emerald-300">
              €{(data.breakdown.b2bMrrCents / 100).toFixed(0)}
            </span>
          </span>
          <span>
            B2C:{" "}
            <span className="font-mono text-emerald-300">
              €{(data.breakdown.b2cMrrCents / 100).toFixed(0)}
            </span>
          </span>
          <span>
            Barter:{" "}
            <span className="font-mono text-text-dim">
              {data.breakdown.barterCount}
            </span>
          </span>
          <span>
            Δ ovaj mj:{" "}
            <span
              className={
                data.monthlyDeltaCents >= 0
                  ? "font-mono text-emerald-300"
                  : "font-mono text-rose-300"
              }
            >
              €{(data.monthlyDeltaCents / 100).toFixed(0)}
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300">
          AI burn ovaj mjesec
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-2xl font-bold text-text">
            €{data.estimatedMonthlyAiCostEur.toFixed(2)}
          </div>
          <div className="text-[11px] text-text-muted">
            (Anthropic + Apollo + Places)
          </div>
        </div>
        <div className="mt-2 text-[11px] text-text-muted">
          NET:{" "}
          <span
            className={
              data.netThisMonthEur >= 0
                ? "font-mono text-emerald-300"
                : "font-mono text-rose-300"
            }
          >
            €{data.netThisMonthEur.toFixed(2)}
          </span>{" "}
          (revenue − AI spend)
        </div>
      </div>

      {data.perClientMrr.length > 0 && (
        <Section title="MRR po klijentu">
          <ul className="space-y-1">
            {data.perClientMrr.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded border border-border bg-bg-card px-2 py-1.5 text-xs"
              >
                <span className="text-text">{c.name}</span>
                <span className="font-mono text-emerald-300">
                  €{(c.mrrCents / 100).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.topAiCostsThisMonth.length > 0 && (
        <Section title="Top AI troškovi (ovaj mj)">
          <ul className="space-y-1">
            {data.topAiCostsThisMonth.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded border border-border bg-bg-card px-2 py-1.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-text">
                  <span className="font-mono text-[10px] text-text-muted">
                    {c.room}
                  </span>{" "}
                  {c.title}
                </span>
                <span className="font-mono text-rose-300">
                  €{c.costEur.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/* =============================== Tasks ================================ */
function TasksBody({
  data,
}: {
  data: Extract<RoomDataViewPayload, { ok: true; viewKey: "tasks" }>["data"];
}) {
  return (
    <div className="space-y-5">
      <StatRow
        items={[
          { label: "Today open", value: String(data.stats.openToday) },
          { label: "Done today", value: String(data.stats.doneToday) },
          { label: "Total open", value: String(data.stats.total) },
        ]}
      />
      {data.overdue.length > 0 && (
        <Section title={`Overdue (${data.overdue.length})`}>
          <ul className="space-y-1.5">
            {data.overdue.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-200"
              >
                <span className="font-mono text-[10px] mr-2">
                  {fmtDate(t.dueDate)}
                </span>
                {t.title}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={`Today (${data.today.length})`}>
        {data.today.length === 0 ? (
          <Empty text="Nema task-ova za danas. Dobro spavaj." />
        ) : (
          <TaskList items={data.today} />
        )}
      </Section>
      <Section title={`Ovaj tjedan (${data.thisWeek.length})`}>
        {data.thisWeek.length === 0 ? (
          <Empty text="Tjedan čist." />
        ) : (
          <TaskList items={data.thisWeek} />
        )}
      </Section>
    </div>
  );
}

function TaskList({
  items,
}: {
  items: Array<{ id: string; title: string; status: string; priority: string | null; dueDate: string | null }>;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li
          key={t.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-card p-2"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm text-text">{t.title}</div>
            <div className="text-[10px] text-text-muted">
              {t.dueDate ? fmtDate(t.dueDate) : "no due date"}
              {t.status !== "open" ? ` · ${t.status}` : ""}
            </div>
          </div>
          {t.priority && (
            <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 text-[9px] uppercase text-text-muted">
              {t.priority}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ============================== Booking =============================== */
function BookingBody({
  data,
}: {
  data: Extract<RoomDataViewPayload, { ok: true; viewKey: "booking" }>["data"];
}) {
  return (
    <div className="space-y-5">
      <StatRow
        items={[
          {
            label: "Sljedećih 7 dana",
            value: String(data.thisWeekCount),
          },
          {
            label: "Sljedeći u",
            value: data.nextDiscoveryAt ? fmtRelative(data.nextDiscoveryAt) : "—",
          },
        ]}
      />
      {data.upcoming.length === 0 ? (
        <Empty text="Nema discovery callova u sljedećih 7 dana." />
      ) : (
        <ul className="space-y-2">
          {data.upcoming.map((b) => (
            <li
              key={b.leadId}
              className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-text">{b.name}</div>
                <div className="font-mono text-[11px] text-cyan-300">
                  {fmtDateTime(b.discoveryAt)}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-text-muted">
                {typeof b.icpScore === "number" && (
                  <span>ICP {b.icpScore}/20</span>
                )}
                {typeof b.estimatedValue === "number" && (
                  <span>~€{b.estimatedValue.toFixed(0)}</span>
                )}
                <span
                  className={
                    b.holmesReady
                      ? "rounded border border-emerald-500/40 bg-emerald-500/10 px-1 py-px text-[9px] font-bold uppercase text-emerald-300"
                      : "rounded border border-amber-500/40 bg-amber-500/10 px-1 py-px text-[9px] font-bold uppercase text-amber-300"
                  }
                >
                  {b.holmesReady ? "Holmes brief ✓" : "Holmes pending"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =============================== shared =============================== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
        ▾ {title}
      </h3>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[11px] text-text-muted">{text}</p>;
}

function StatRow({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((s, i) => (
        <div
          key={i}
          className="rounded-md border border-border bg-bg-card px-2.5 py-1.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            {s.label}
          </div>
          <div className="mt-0.5 font-mono text-sm font-bold text-text">
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
  });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.round(ms / (1000 * 60 * 60));
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
