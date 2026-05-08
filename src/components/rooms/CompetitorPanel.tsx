"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { Eye, Plus, ExternalLink, Trash2, Telescope } from "lucide-react";
import {
  addCompetitor,
  deleteCompetitor,
  deleteCompetitorUpdate,
  logCompetitorUpdate,
} from "@/app/actions/competitor";
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
import type {
  CompetitorRow,
  CompetitorUpdateRow,
  CompetitorStats,
} from "@/lib/queries";

type Tab = "list" | "log" | "add";

interface CompetitorPanelProps {
  initialList: CompetitorRow[];
  initialUpdates: CompetitorUpdateRow[];
  initialStats: CompetitorStats;
}

export function CompetitorPanel({
  initialList,
  initialUpdates,
  initialStats,
}: CompetitorPanelProps) {
  const [tab, setTab] = useState<Tab>("list");
  const [list, setList] = useState(initialList);
  const [updates, setUpdates] = useState(initialUpdates);
  const stats = initialStats; // refresh on revalidatePath
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Add competitor
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Log update
  const [logCompetitorId, setLogCompetitorId] = useState<string>("");
  const [observation, setObservation] = useState("");
  const [obsUrl, setObsUrl] = useState("");

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Ime je obavezno");
    startTransition(async () => {
      const res = await addCompetitor(name, url, notes);
      if (!res.ok) return setError(res.error ?? "Greška");
      const newRow: CompetitorRow = {
        id: res.id ?? crypto.randomUUID(),
        name: name.trim(),
        url: url.trim() || null,
        notes: notes.trim() || null,
        last_check_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setList([newRow, ...list]);
      setName("");
      setUrl("");
      setNotes("");
      setTab("list");
    });
  }

  function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logCompetitorId) return setError("Odaberi konkurenta");
    if (!observation.trim()) return setError("Što si primijetio?");
    startTransition(async () => {
      const res = await logCompetitorUpdate(
        logCompetitorId,
        observation,
        obsUrl,
      );
      if (!res.ok) return setError(res.error ?? "Greška");
      const newRow: CompetitorUpdateRow = {
        id: res.id ?? crypto.randomUUID(),
        competitor_id: logCompetitorId,
        observation: observation.trim(),
        url: obsUrl.trim() || null,
        created_at: new Date().toISOString(),
      };
      setUpdates([newRow, ...updates]);
      // Also bump last_check_at locally
      setList((rows) =>
        rows.map((r) =>
          r.id === logCompetitorId
            ? { ...r, last_check_at: new Date().toISOString() }
            : r,
        ),
      );
      setObservation("");
      setObsUrl("");
      setTab("list");
    });
  }

  function removeCompetitor(id: string) {
    if (!confirm("Obrisati konkurenta sa svim updates?")) return;
    startTransition(async () => {
      setList(list.filter((c) => c.id !== id));
      setUpdates(updates.filter((u) => u.competitor_id !== id));
      await deleteCompetitor(id);
    });
  }

  function removeUpdate(id: string) {
    startTransition(async () => {
      setUpdates(updates.filter((u) => u.id !== id));
      await deleteCompetitorUpdate(id);
    });
  }

  const compsByName = useMemo(
    () => Object.fromEntries(list.map((c) => [c.id, c.name])),
    [list],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Tracked" value={stats.count.toString()} />
        <StatTile
          label="Updates ovaj tj"
          value={stats.updatesThisWeek.toString()}
          accent="gold"
        />
        <StatTile
          label="Najstariji check"
          value={`${stats.staleSinceDays}d`}
          accent={stats.staleSinceDays > 14 ? "warning" : "gold"}
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          <Eye size={14} /> List · {list.length}
        </TabButton>
        <TabButton active={tab === "log"} onClick={() => setTab("log")}>
          <Telescope size={14} /> Log update
        </TabButton>
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          <Plus size={14} /> Add
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "add" && (
          <motion.form
            key="add"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={submitAdd}
            className="space-y-3"
          >
            <Field label="Ime konkurenta *">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bolutions"
                autoFocus
              />
            </Field>
            <Field label="URL / Instagram / LinkedIn">
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://bolutions.com"
              />
            </Field>
            <Field label="Notes (pozicioniranje, cijena, USP, što rade dobro)">
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <ErrorBanner message={error} />
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setTab("list")}>Cancel</GhostButton>
              <PrimaryButton disabled={pending} icon={<Plus size={14} />}>
                {pending ? "Saving…" : "Add"}
              </PrimaryButton>
            </div>
          </motion.form>
        )}

        {tab === "log" && (
          <motion.form
            key="log"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={submitLog}
            className="space-y-3"
          >
            <Field label="Konkurent">
              <select
                className="input"
                value={logCompetitorId}
                onChange={(e) => setLogCompetitorId(e.target.value)}
              >
                <option value="">Odaberi…</option>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Što si primijetio? *"
              hint="Novi post, nova cijena, novi USP, novi case study, partner, klijent…"
            >
              <textarea
                className="input"
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Objavili case study o klinici X — booking +47%. Cijena nije navedena. Story-driven format."
              />
            </Field>
            <Field label="URL">
              <input
                className="input"
                value={obsUrl}
                onChange={(e) => setObsUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <ErrorBanner message={error} />
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setTab("list")}>Cancel</GhostButton>
              <PrimaryButton disabled={pending} icon={<Telescope size={14} />}>
                {pending ? "Logging…" : "Log update"}
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
            className="space-y-4"
          >
            {list.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Još nema konkurenata. Krenimo s Bolutions ↑
              </div>
            ) : (
              <ul className="space-y-2">
                {list.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border bg-bg-card/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {c.name}
                      </span>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-muted hover:text-gold"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                      {c.last_check_at && (
                        <Badge tone="neutral">
                          Checked {formatRelative(c.last_check_at)}
                        </Badge>
                      )}
                      <button
                        onClick={() => removeCompetitor(c.id)}
                        className="ml-auto rounded p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {c.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-[11px] text-text-dim">
                        {c.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {updates.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">
                  Recent updates · {updates.length}
                </h4>
                <ul className="space-y-1.5">
                  {updates.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-lg border border-border bg-bg-card/40 p-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone="gold">
                          {compsByName[u.competitor_id] ?? "?"}
                        </Badge>
                        <span className="text-text-muted">
                          {formatRelative(u.created_at)}
                        </span>
                        {u.url && (
                          <a
                            href={u.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-text-muted hover:text-gold"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                        <button
                          onClick={() => removeUpdate(u.id)}
                          className="ml-auto rounded p-0.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <p className="mt-0.5 text-text-dim">{u.observation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
