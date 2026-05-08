"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import {
  Calendar,
  Plus,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { addTask, deleteTask, setTaskStatus } from "@/app/actions/tasks";
import {
  StatTile,
  TabButton,
  Field,
  ErrorBanner,
  PrimaryButton,
  GhostButton,
  Badge,
} from "@/components/ui/common";
import { formatRelative } from "@/lib/format";
import type { TaskRow, TasksStats, ClientRow, LeadRow } from "@/lib/queries";

type Tab = "today" | "week" | "all" | "add";

interface CalendarPanelProps {
  initialList: TaskRow[];
  initialStats: TasksStats;
  clients: ClientRow[];
  leads: LeadRow[];
}

const ROOM_OPTS = [
  { id: "outreach", label: "Outreach" },
  { id: "discovery", label: "Discovery" },
  { id: "closing", label: "Closing" },
  { id: "lead_scorer", label: "Lead Scorer" },
  { id: "analytics", label: "Analytics" },
  { id: "competitor", label: "Competitor" },
  { id: "clients", label: "Clients" },
  { id: "calendar", label: "Calendar" },
  { id: "reports", label: "Reports" },
];

function todayStr(): string {
  const t = new Date();
  return t.toISOString().slice(0, 10);
}

function isToday(date: string | null): boolean {
  if (!date) return false;
  return date === todayStr();
}

function inNextWeek(date: string | null): boolean {
  if (!date) return false;
  const today = todayStr();
  const t = new Date();
  t.setDate(t.getDate() + 7);
  const end = t.toISOString().slice(0, 10);
  return date >= today && date <= end;
}

function isOverdue(t: TaskRow): boolean {
  if (!t.due_date || t.status === "done") return false;
  return t.due_date < todayStr();
}

export function CalendarPanel({
  initialList,
  initialStats,
  clients,
  leads,
}: CalendarPanelProps) {
  const [tab, setTab] = useState<Tab>("today");
  const [list, setList] = useState(initialList);
  const stats = initialStats;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [linkedClient, setLinkedClient] = useState("");
  const [linkedLead, setLinkedLead] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    if (tab === "today")
      return list.filter(
        (t) =>
          (isToday(t.due_date) || isOverdue(t)) && t.status !== "done",
      );
    if (tab === "week")
      return list.filter(
        (t) => inNextWeek(t.due_date) && t.status !== "done",
      );
    return list;
  }, [tab, list]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Title je obavezan");
    startTransition(async () => {
      const res = await addTask({
        title,
        room: room || undefined,
        dueDate,
        notes,
        clientId: linkedClient || null,
        leadId: linkedLead || null,
      });
      if (!res.ok) return setError(res.error ?? "Greška");
      const newRow: TaskRow = {
        id: res.id ?? crypto.randomUUID(),
        title: title.trim(),
        room: room || null,
        status: "todo",
        due_date: dueDate || null,
        completed_at: null,
        notes: notes || null,
        client_id: linkedClient || null,
        lead_id: linkedLead || null,
        created_at: new Date().toISOString(),
      };
      setList([newRow, ...list]);
      setTitle("");
      setRoom("");
      setDueDate(todayStr());
      setLinkedClient("");
      setLinkedLead("");
      setNotes("");
      setTab("today");
    });
  }

  function toggle(t: TaskRow) {
    const next = t.status === "done" ? "todo" : "done";
    startTransition(async () => {
      setList(
        list.map((x) =>
          x.id === t.id
            ? {
                ...x,
                status: next,
                completed_at:
                  next === "done" ? new Date().toISOString() : null,
              }
            : x,
        ),
      );
      await setTaskStatus(t.id, next);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      setList(list.filter((t) => t.id !== id));
      await deleteTask(id);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Danas" value={stats.todayCount.toString()} />
        <StatTile label="Tjedan" value={stats.weekCount.toString()} />
        <StatTile
          label="Overdue"
          value={stats.overdue.toString()}
          accent={stats.overdue > 0 ? "danger" : "gold"}
        />
        <StatTile
          label="Done danas"
          value={stats.doneToday.toString()}
          accent="success"
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "today"} onClick={() => setTab("today")}>
          <Calendar size={14} /> Today
        </TabButton>
        <TabButton active={tab === "week"} onClick={() => setTab("week")}>
          Week
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All · {list.length}
        </TabButton>
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          <Plus size={14} /> Add task
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
            <Field label="Title *">
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pošalji ponudu Estetska Zagreb"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Due date">
                <input
                  type="date"
                  className="input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
              <Field label="Room">
                <select
                  className="input"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  <option value="">— bilo koji —</option>
                  {ROOM_OPTS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Linked klijent (opcionalno)">
                <select
                  className="input"
                  value={linkedClient}
                  onChange={(e) => {
                    setLinkedClient(e.target.value);
                    if (e.target.value) setLinkedLead("");
                  }}
                >
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Linked lead (opcionalno)">
                <select
                  className="input"
                  value={linkedLead}
                  onChange={(e) => {
                    setLinkedLead(e.target.value);
                    if (e.target.value) setLinkedClient("");
                  }}
                >
                  <option value="">—</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                className="input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <ErrorBanner message={error} />
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setTab("today")}>Cancel</GhostButton>
              <PrimaryButton disabled={pending} icon={<Plus size={14} />}>
                {pending ? "Adding…" : "Add task"}
              </PrimaryButton>
            </div>
          </motion.form>
        )}

        {tab !== "add" && (
          <motion.ul
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-1.5"
          >
            {filtered.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Nema task-ova ovdje. {tab === "today" && "Dodaj nešto za danas ↑"}
              </li>
            ) : (
              filtered.map((t) => {
                const overdue = isOverdue(t);
                return (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-bg-card/60 p-2.5"
                  >
                    <button
                      onClick={() => toggle(t)}
                      className={
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors " +
                        (t.status === "done"
                          ? "border-success bg-success text-bg"
                          : "border-border hover:border-gold")
                      }
                    >
                      {t.status === "done" && <Check size={12} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          "text-sm " +
                          (t.status === "done"
                            ? "text-text-muted line-through"
                            : "text-text")
                        }
                      >
                        {t.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {overdue && (
                          <Badge tone="danger">
                            <AlertTriangle
                              size={9}
                              className="-mt-0.5 inline"
                            />{" "}
                            overdue
                          </Badge>
                        )}
                        {t.due_date && (
                          <Badge
                            tone={
                              isToday(t.due_date)
                                ? "gold"
                                : overdue
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {t.due_date}
                          </Badge>
                        )}
                        {t.room && <Badge tone="neutral">{t.room}</Badge>}
                        {t.completed_at && (
                          <span className="text-text-muted">
                            done {formatRelative(t.completed_at)}
                          </span>
                        )}
                      </div>
                      {t.notes && (
                        <p className="mt-0.5 text-[11px] text-text-dim">
                          {t.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(t.id)}
                      className="rounded p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={11} />
                    </button>
                  </li>
                );
              })
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
