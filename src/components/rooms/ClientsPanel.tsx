"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  Users,
  Plus,
  Check,
  Trash2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  addClient,
  updateClient,
  deleteClient,
} from "@/app/actions/clients";
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
import type { ClientRow, ClientsStats } from "@/lib/queries";

type Tab = "list" | "add";
type StatusFilter = "all" | "active" | "onboarding" | "paused" | "churned";

interface ClientsPanelProps {
  initialList: ClientRow[];
  initialStats: ClientsStats;
}

const TYPE_LABEL: Record<string, string> = {
  b2b_clinic: "Klinika (B2B)",
  coach_mentor: "Coach mentor",
  affiliate: "Affiliate",
};

const STATUS_TONE: Record<
  ClientRow["status"],
  "success" | "gold" | "warning" | "danger"
> = {
  active: "success",
  onboarding: "gold",
  paused: "warning",
  churned: "danger",
};

const RISK_TONE: Record<NonNullable<ClientRow["churn_risk"]>, "warning" | "danger"> = {
  low: "warning",
  medium: "warning",
  high: "danger",
};

export function ClientsPanel({
  initialList,
  initialStats,
}: ClientsPanelProps) {
  const [tab, setTab] = useState<Tab>("list");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [list, setList] = useState(initialList);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<ClientRow["type"]>("b2b_clinic");
  const [status, setStatus] = useState<ClientRow["status"]>("onboarding");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [churnRisk, setChurnRisk] = useState<
    "low" | "medium" | "high" | ""
  >("");

  function recalcStats(rows: ClientRow[]): ClientsStats {
    const s: ClientsStats = {
      active: 0,
      onboarding: 0,
      paused: 0,
      churned: 0,
      churnRisk: 0,
      mrrCents: 0,
    };
    for (const c of rows) {
      s[c.status] += 1;
      if (c.churn_risk && c.status === "active") s.churnRisk += 1;
      if (c.status === "active")
        s.mrrCents += Math.round(Number(c.monthly_revenue ?? 0) * 100);
    }
    return s;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Ime klijenta je obavezno");
    const mr = parseFloat(monthlyRevenue.replace(",", ".")) || 0;
    if (mr < 0) return setError("Monthly revenue mora biti pozitivno");
    startTransition(async () => {
      const res = await addClient({
        name: name.trim(),
        type,
        status,
        monthlyRevenue: mr,
        startDate: startDate || null,
        nextAction: nextAction || null,
        nextActionDate: nextActionDate || null,
        notes,
        churnRisk: churnRisk || null,
      });
      if (!res.ok) return setError(res.error ?? "Greška");
      const newRow: ClientRow = {
        id: res.id ?? crypto.randomUUID(),
        name: name.trim(),
        type,
        status,
        monthly_revenue: mr,
        start_date: startDate || null,
        notes: notes || null,
        last_touchpoint_at: new Date().toISOString(),
        next_action: nextAction || null,
        next_action_date: nextActionDate || null,
        churn_risk: churnRisk || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const next = [newRow, ...list];
      setList(next);
      setStats(recalcStats(next));
      // reset
      setName("");
      setMonthlyRevenue("");
      setStartDate("");
      setNextAction("");
      setNextActionDate("");
      setNotes("");
      setChurnRisk("");
      setStatus("onboarding");
      setTab("list");
    });
  }

  function changeStatus(id: string, newStatus: ClientRow["status"]) {
    startTransition(async () => {
      const prev = list;
      const next = list.map((c) =>
        c.id === id ? { ...c, status: newStatus } : c,
      );
      setList(next);
      setStats(recalcStats(next));
      const res = await updateClient({ id, status: newStatus });
      if (!res.ok) {
        setList(prev);
        setStats(recalcStats(prev));
        setError(res.error ?? "Greška");
      }
    });
  }

  function bumpTouchpoint(id: string) {
    startTransition(async () => {
      const now = new Date().toISOString();
      setList((rows) =>
        rows.map((r) => (r.id === id ? { ...r, last_touchpoint_at: now } : r)),
      );
      await updateClient({ id, bumpTouchpoint: true });
    });
  }

  function setRisk(id: string, risk: "low" | "medium" | "high" | null) {
    startTransition(async () => {
      const prev = list;
      const next = list.map((c) =>
        c.id === id ? { ...c, churn_risk: risk } : c,
      );
      setList(next);
      setStats(recalcStats(next));
      const res = await updateClient({ id, churnRisk: risk });
      if (!res.ok) {
        setList(prev);
        setStats(recalcStats(prev));
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Obrisati klijenta?")) return;
    startTransition(async () => {
      const prev = list;
      const next = list.filter((c) => c.id !== id);
      setList(next);
      setStats(recalcStats(next));
      const res = await deleteClient(id);
      if (!res.ok) {
        setList(prev);
        setStats(recalcStats(prev));
      }
    });
  }

  const filtered =
    filter === "all" ? list : list.filter((c) => c.status === filter);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="MRR (active)"
          value={formatEuro(stats.mrrCents, { compact: true })}
        />
        <StatTile label="Active" value={stats.active.toString()} accent="success" />
        <StatTile label="Onboarding" value={stats.onboarding.toString()} />
        <StatTile
          label="Churn risk"
          value={stats.churnRisk.toString()}
          accent={stats.churnRisk > 0 ? "danger" : "gold"}
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          <Users size={14} /> List · {list.length}
        </TabButton>
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          <Plus size={14} /> Add client
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "add" && (
          <motion.form
            key="add"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={submit}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Naziv klijenta *">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Estetska klinika Zagreb"
                  autoFocus
                />
              </Field>
              <Field label="Tip">
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value as ClientRow["type"])}
                >
                  <option value="b2b_clinic">Klinika (B2B)</option>
                  <option value="coach_mentor">Coach mentor</option>
                  <option value="affiliate">Affiliate</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Status">
                <select
                  className="input"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ClientRow["status"])
                  }
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="churned">Churned</option>
                </select>
              </Field>
              <Field label="Monthly revenue €">
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(e.target.value)}
                  placeholder="1497"
                />
              </Field>
              <Field label="Start date">
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Next action">
                <input
                  className="input"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Weekly report · poslati"
                />
              </Field>
              <Field label="By date">
                <input
                  className="input"
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kako je došao, što treba pratiti, kontakt info…"
              />
            </Field>

            <ErrorBanner message={error} />

            <div className="flex items-center justify-end gap-2">
              <GhostButton onClick={() => setTab("list")}>Cancel</GhostButton>
              <PrimaryButton disabled={pending} icon={<Plus size={14} />}>
                {pending ? "Adding…" : "Add client"}
              </PrimaryButton>
            </div>
          </motion.form>
        )}

        {tab === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ["all", `Svi · ${list.length}`],
                  ["active", `Active · ${stats.active}`],
                  ["onboarding", `Onb · ${stats.onboarding}`],
                  ["paused", `Paused · ${stats.paused}`],
                  ["churned", `Churned · ${stats.churned}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k as StatusFilter)}
                  className={
                    "rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors " +
                    (filter === k
                      ? "border-gold text-gold"
                      : "border-border text-text-muted hover:border-gold/40 hover:text-text-dim")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Još nema klijenata u ovom filteru. Dodaj prvog ↑
              </div>
            )}

            <ul className="space-y-2">
              {filtered.map((c) => {
                const isOpen = expanded === c.id;
                return (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border bg-bg-card/60 transition-colors hover:border-gold/40"
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      className="flex w-full items-start gap-3 p-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-text">
                            {c.name}
                          </span>
                          <Badge tone={STATUS_TONE[c.status]}>
                            {c.status}
                          </Badge>
                          <Badge tone="neutral">{TYPE_LABEL[c.type]}</Badge>
                          {c.churn_risk && (
                            <Badge tone={RISK_TONE[c.churn_risk]}>
                              <AlertTriangle
                                size={9}
                                className="-mt-0.5 inline"
                              />{" "}
                              risk · {c.churn_risk}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-dim">
                          <span>
                            {formatEuro(
                              Math.round(Number(c.monthly_revenue ?? 0) * 100),
                              { compact: true },
                            )}{" "}
                            / mj
                          </span>
                          {c.last_touchpoint_at && (
                            <span>
                              Last touch: {formatRelative(c.last_touchpoint_at)}
                            </span>
                          )}
                          {c.next_action && (
                            <span className="text-gold">
                              → {c.next_action}
                              {c.next_action_date && ` · ${c.next_action_date}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={
                          "shrink-0 transition-transform " +
                          (isOpen ? "rotate-90" : "")
                        }
                      />
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-border px-3 pb-3 pt-2"
                      >
                        {c.notes && (
                          <p className="mb-2 whitespace-pre-wrap text-[11px] text-text-dim">
                            {c.notes}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <GhostButton
                            icon={<Check size={12} />}
                            onClick={() => bumpTouchpoint(c.id)}
                          >
                            Touch
                          </GhostButton>
                          {c.status !== "active" && (
                            <GhostButton
                              onClick={() => changeStatus(c.id, "active")}
                            >
                              → Active
                            </GhostButton>
                          )}
                          {c.status !== "paused" && (
                            <GhostButton
                              onClick={() => changeStatus(c.id, "paused")}
                            >
                              → Paused
                            </GhostButton>
                          )}
                          {c.status !== "churned" && (
                            <GhostButton
                              onClick={() => changeStatus(c.id, "churned")}
                            >
                              → Churned
                            </GhostButton>
                          )}
                          <select
                            value={c.churn_risk ?? ""}
                            onChange={(e) =>
                              setRisk(
                                c.id,
                                (e.target.value || null) as
                                  | "low"
                                  | "medium"
                                  | "high"
                                  | null,
                              )
                            }
                            className="rounded-lg border border-border bg-bg-card px-2 py-1 text-[10px] text-text-dim"
                          >
                            <option value="">Risk: none</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                          </select>
                          <button
                            onClick={() => remove(c.id)}
                            className="ml-auto rounded p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            title="Obriši"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
