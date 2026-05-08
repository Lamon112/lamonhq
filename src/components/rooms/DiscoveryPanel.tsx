"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { Calendar, ClipboardList, Plus, ArrowRight } from "lucide-react";
import { updateLead } from "@/app/actions/leads";
import {
  StatTile,
  TabButton,
  Field,
  ErrorBanner,
  PrimaryButton,
  GhostButton,
  Badge,
} from "@/components/ui/common";
import { formatEuro, formatRelative } from "@/lib/format";
import type { LeadRow, DiscoveryStats } from "@/lib/queries";

type Tab = "upcoming" | "log" | "past";

interface DiscoveryPanelProps {
  initialList: LeadRow[];
  initialStats: DiscoveryStats;
}

const STAGE_LABEL: Record<LeadRow["stage"], string> = {
  discovery: "Discovery",
  pricing: "Pricing",
  financing: "Financing",
  booking: "Booking",
  closed_won: "Won",
  closed_lost: "Lost",
};

const OUTCOME_OPTS = [
  { id: "interested", label: "Interested → pricing" },
  { id: "needs_more_info", label: "Needs more info" },
  { id: "not_a_fit", label: "Not a fit" },
  { id: "no_show", label: "No-show" },
  { id: "rescheduled", label: "Rescheduled" },
];

export function DiscoveryPanel({
  initialList,
  initialStats,
}: DiscoveryPanelProps) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [list, setList] = useState(initialList);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Schedule form (for an existing lead)
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [discoveryAt, setDiscoveryAt] = useState("");

  // Log form
  const [logLeadId, setLogLeadId] = useState<string>("");
  const [logOutcome, setLogOutcome] = useState<string>("interested");
  const [logNotes, setLogNotes] = useState("");

  const now = new Date();

  const upcomingLeads = useMemo(
    () =>
      list
        .filter((l) => l.discovery_at && new Date(l.discovery_at) >= now)
        .sort(
          (a, b) =>
            new Date(a.discovery_at!).getTime() -
            new Date(b.discovery_at!).getTime(),
        ),
    [list],
  );

  const pastLeads = useMemo(
    () =>
      list
        .filter((l) => l.discovery_at && new Date(l.discovery_at) < now)
        .sort(
          (a, b) =>
            new Date(b.discovery_at!).getTime() -
            new Date(a.discovery_at!).getTime(),
        ),
    [list],
  );

  const unscheduledLeads = useMemo(
    () =>
      list
        .filter((l) => !l.discovery_at && l.stage === "discovery")
        .sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0)),
    [list],
  );

  function schedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedLeadId) return setError("Odaberi lead");
    if (!discoveryAt) return setError("Odaberi datum + vrijeme");
    startTransition(async () => {
      const isoAt = new Date(discoveryAt).toISOString();
      const prev = list;
      const next = list.map((l) =>
        l.id === selectedLeadId ? { ...l, discovery_at: isoAt } : l,
      );
      setList(next);
      const res = await updateLead({
        id: selectedLeadId,
        discoveryAt: isoAt,
      });
      if (!res.ok) {
        setList(prev);
        setError(res.error ?? "Greška");
        return;
      }
      setSelectedLeadId("");
      setDiscoveryAt("");
      setTab("upcoming");
    });
  }

  function logCall(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logLeadId) return setError("Odaberi lead");
    startTransition(async () => {
      const prev = list;
      // Auto-advance stage based on outcome
      const stage =
        logOutcome === "interested"
          ? "pricing"
          : logOutcome === "not_a_fit"
            ? "closed_lost"
            : undefined;
      const next = list.map((l) =>
        l.id === logLeadId
          ? {
              ...l,
              discovery_outcome: logOutcome,
              discovery_notes: logNotes || null,
              stage: stage ?? l.stage,
            }
          : l,
      );
      setList(next);
      const res = await updateLead({
        id: logLeadId,
        discoveryOutcome: logOutcome,
        discoveryNotes: logNotes,
        stage,
      });
      if (!res.ok) {
        setList(prev);
        setError(res.error ?? "Greška");
        return;
      }
      setLogLeadId("");
      setLogNotes("");
      setLogOutcome("interested");
      setTab("past");
    });
  }

  const stats = {
    thisWeek: initialStats.thisWeek,
    upcoming: upcomingLeads.length,
    showUpRate: initialStats.showUpRate,
    conversionToPricing: initialStats.conversionToPricing,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Ovaj tjedan" value={stats.thisWeek.toString()} />
        <StatTile
          label="Upcoming"
          value={stats.upcoming.toString()}
          accent={stats.upcoming > 0 ? "success" : "gold"}
        />
        <StatTile
          label="Show-up rate"
          value={`${(stats.showUpRate * 100).toFixed(0)}%`}
        />
        <StatTile
          label="→ Pricing"
          value={stats.conversionToPricing.toString()}
          accent="success"
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
        >
          <Calendar size={14} /> Upcoming · {upcomingLeads.length}
        </TabButton>
        <TabButton active={tab === "log"} onClick={() => setTab("log")}>
          <ClipboardList size={14} /> Log call
        </TabButton>
        <TabButton active={tab === "past"} onClick={() => setTab("past")}>
          Past · {pastLeads.length}
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "upcoming" && (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <form
              onSubmit={schedule}
              className="rounded-lg border border-border bg-bg-card/40 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider text-text-muted">
                  + Schedule discovery call
                </h4>
                <span className="text-[10px] text-text-muted">
                  Calendly link → paste vrijeme ručno za sad
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Lead">
                  <select
                    className="input"
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                  >
                    <option value="">Odaberi lead…</option>
                    {unscheduledLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.icp_score ?? 0}/20
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Datum + vrijeme">
                  <input
                    type="datetime-local"
                    className="input"
                    value={discoveryAt}
                    onChange={(e) => setDiscoveryAt(e.target.value)}
                  />
                </Field>
              </div>
              <ErrorBanner message={error} />
              <div className="flex justify-end">
                <PrimaryButton disabled={pending} icon={<Plus size={14} />}>
                  {pending ? "Saving…" : "Schedule"}
                </PrimaryButton>
              </div>
            </form>

            {upcomingLeads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Nema upcoming discovery calls. Schedule jedan ↑
              </div>
            ) : (
              <ul className="space-y-2">
                {upcomingLeads.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-lg border border-border bg-bg-card/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {l.name}
                      </span>
                      <Badge tone="gold">
                        {new Date(l.discovery_at!).toLocaleString("hr-HR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Badge>
                      <Badge tone="neutral">{l.icp_score ?? 0}/20</Badge>
                    </div>
                    {l.notes && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-text-dim">
                        {l.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {tab === "log" && (
          <motion.form
            key="log"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={logCall}
            className="space-y-3"
          >
            <Field label="Lead">
              <select
                className="input"
                value={logLeadId}
                onChange={(e) => setLogLeadId(e.target.value)}
              >
                <option value="">Odaberi lead…</option>
                {[...upcomingLeads, ...pastLeads, ...unscheduledLeads].map(
                  (l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {STAGE_LABEL[l.stage]}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Outcome">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {OUTCOME_OPTS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setLogOutcome(o.id)}
                    className={
                      "rounded-lg border px-3 py-2 text-xs transition-colors text-left " +
                      (logOutcome === o.id
                        ? "border-gold bg-gold/10 text-text"
                        : "border-border bg-bg-card/60 text-text-dim hover:border-gold/50")
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Notes"
              hint="Što su rekli, što je njihov problem, sljedeći korak. Outcome 'interested' će automatski pomaknuti lead u pricing."
            >
              <textarea
                className="input"
                rows={4}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Glavna bol: missed bookings nakon 17h. Zainteresirani za Rast paket. Sljedeće: pošalji ponudu do petka."
              />
            </Field>

            <ErrorBanner message={error} />

            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setTab("upcoming")}>Cancel</GhostButton>
              <PrimaryButton
                disabled={pending}
                icon={<ClipboardList size={14} />}
              >
                {pending ? "Saving…" : "Log call"}
              </PrimaryButton>
            </div>
          </motion.form>
        )}

        {tab === "past" && (
          <motion.div
            key="past"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {pastLeads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Još nema log-iranih discovery calls.
              </div>
            ) : (
              <ul className="space-y-2">
                {pastLeads.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-lg border border-border bg-bg-card/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {l.name}
                      </span>
                      <Badge
                        tone={
                          l.discovery_outcome === "interested"
                            ? "success"
                            : l.discovery_outcome === "no_show"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {l.discovery_outcome ?? "—"}
                      </Badge>
                      <Badge tone="neutral">
                        {formatRelative(l.discovery_at!)}
                      </Badge>
                      <Badge tone="gold">
                        <ArrowRight
                          size={9}
                          className="-mt-0.5 inline"
                        />{" "}
                        {STAGE_LABEL[l.stage]}
                      </Badge>
                      {l.estimated_value && (
                        <Badge tone="neutral">
                          ~{" "}
                          {formatEuro(
                            Math.round(Number(l.estimated_value) * 100),
                            { compact: true },
                          )}
                        </Badge>
                      )}
                    </div>
                    {l.discovery_notes && (
                      <p className="mt-1 whitespace-pre-wrap text-[11px] text-text-dim">
                        {l.discovery_notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
