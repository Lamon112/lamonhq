"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { ChartBar, Plus, ExternalLink, Trash2 } from "lucide-react";
import {
  addContentPost,
  deleteContentPost,
  updateContentStats,
} from "@/app/actions/content";
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
import type { ContentPostRow, ContentStats } from "@/lib/queries";

type Tab = "list" | "add";
type Platform = "all" | "tiktok" | "instagram" | "youtube" | "linkedin";

interface AnalyticsPanelProps {
  initialList: ContentPostRow[];
  initialStats: ContentStats;
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function AnalyticsPanel({
  initialList,
  initialStats,
}: AnalyticsPanelProps) {
  const [tab, setTab] = useState<Tab>("list");
  const [filter, setFilter] = useState<Platform>("all");
  const [list, setList] = useState(initialList);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [platform, setPlatform] = useState<ContentPostRow["platform"]>("tiktok");
  const [postUrl, setPostUrl] = useState("");
  const [title, setTitle] = useState("");
  const [postedAt, setPostedAt] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [saves, setSaves] = useState("");

  function recalcStats(rows: ContentPostRow[]): ContentStats {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = rows.filter(
      (p) => p.posted_at && new Date(p.posted_at) >= monthStart,
    );
    const totalViews = month.reduce((s, p) => s + (p.views ?? 0), 0);
    let totalEng = 0;
    let counted = 0;
    for (const p of month) {
      const v = p.views ?? 0;
      if (v > 0) {
        totalEng +=
          ((p.likes ?? 0) + (p.comments ?? 0) + (p.saves ?? 0)) / v;
        counted += 1;
      }
    }
    let best: ContentStats["bestPost"] = null;
    for (const p of month) {
      if (!best || (p.views ?? 0) > best.views) {
        best = { title: p.title, platform: p.platform, views: p.views ?? 0 };
      }
    }
    return {
      postsThisMonth: month.length,
      totalViewsThisMonth: totalViews,
      bestPost: best,
      avgEngagement: counted ? totalEng / counted : 0,
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!postUrl.trim() && !title.trim())
      return setError("Unesi bar URL ili naslov");
    const v = parseInt(views) || 0;
    if (v < 0) return setError("Views ne mogu biti negativni");
    startTransition(async () => {
      const res = await addContentPost({
        platform,
        postUrl,
        title,
        postedAt,
        views: v,
        likes: parseInt(likes) || 0,
        comments: parseInt(comments) || 0,
        saves: parseInt(saves) || 0,
      });
      if (!res.ok) return setError(res.error ?? "Greška");
      const newRow: ContentPostRow = {
        id: res.id ?? crypto.randomUUID(),
        platform,
        post_url: postUrl || null,
        title: title || null,
        posted_at: postedAt
          ? new Date(postedAt).toISOString()
          : new Date().toISOString(),
        views: v,
        likes: parseInt(likes) || 0,
        comments: parseInt(comments) || 0,
        saves: parseInt(saves) || 0,
        link_clicks: 0,
        created_at: new Date().toISOString(),
      };
      const next = [newRow, ...list];
      setList(next);
      setStats(recalcStats(next));
      setPostUrl("");
      setTitle("");
      setPostedAt("");
      setViews("");
      setLikes("");
      setComments("");
      setSaves("");
      setTab("list");
    });
  }

  function remove(id: string) {
    if (!confirm("Obrisati post?")) return;
    startTransition(async () => {
      const next = list.filter((p) => p.id !== id);
      setList(next);
      setStats(recalcStats(next));
      await deleteContentPost(id);
    });
  }

  const filtered = useMemo(
    () =>
      filter === "all" ? list : list.filter((p) => p.platform === filter),
    [filter, list],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Posts ovaj mj"
          value={stats.postsThisMonth.toString()}
        />
        <StatTile
          label="Total views"
          value={formatViews(stats.totalViewsThisMonth)}
          accent="gold"
        />
        <StatTile
          label="Avg engagement"
          value={`${(stats.avgEngagement * 100).toFixed(2)}%`}
          accent="success"
        />
        <StatTile
          label="Best post"
          value={stats.bestPost ? formatViews(stats.bestPost.views) : "—"}
          hint={stats.bestPost?.title ?? stats.bestPost?.platform ?? undefined}
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          <ChartBar size={14} /> List · {list.length}
        </TabButton>
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          <Plus size={14} /> Add post
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
              <Field label="Platforma">
                <select
                  className="input"
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as ContentPostRow["platform"])
                  }
                >
                  {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Posted at">
                <input
                  className="input"
                  type="datetime-local"
                  value={postedAt}
                  onChange={(e) => setPostedAt(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Title / hook">
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="3 razloga zašto klinike gube 38% bookinga noću"
              />
            </Field>
            <Field label="Post URL">
              <input
                className="input"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@lamon.leonardo/video/…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Views">
                <input
                  className="input"
                  type="number"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                />
              </Field>
              <Field label="Likes">
                <input
                  className="input"
                  type="number"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                />
              </Field>
              <Field label="Comments">
                <input
                  className="input"
                  type="number"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </Field>
              <Field label="Saves">
                <input
                  className="input"
                  type="number"
                  value={saves}
                  onChange={(e) => setSaves(e.target.value)}
                />
              </Field>
            </div>
            <ErrorBanner message={error} />
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setTab("list")}>Cancel</GhostButton>
              <PrimaryButton disabled={pending} icon={<Plus size={14} />}>
                {pending ? "Saving…" : "Add post"}
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
                  ["all", `All · ${list.length}`],
                  [
                    "tiktok",
                    `TikTok · ${list.filter((p) => p.platform === "tiktok").length}`,
                  ],
                  [
                    "instagram",
                    `IG · ${list.filter((p) => p.platform === "instagram").length}`,
                  ],
                  [
                    "youtube",
                    `YT · ${list.filter((p) => p.platform === "youtube").length}`,
                  ],
                  [
                    "linkedin",
                    `LinkedIn · ${list.filter((p) => p.platform === "linkedin").length}`,
                  ],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k as Platform)}
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

            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-bg-card/50 p-6 text-center text-sm text-text-muted">
                Još nema postova. Kad objaviš sljedeći — paste URL + stats ovdje
                ↑
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((p) => {
                  const eng =
                    (p.views ?? 0) > 0
                      ? ((p.likes ?? 0) + (p.comments ?? 0) + (p.saves ?? 0)) /
                        (p.views ?? 1)
                      : 0;
                  return (
                    <li
                      key={p.id}
                      className="rounded-lg border border-border bg-bg-card/60 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">
                          {PLATFORM_LABEL[p.platform]}
                        </Badge>
                        {p.title && (
                          <span className="text-sm font-medium text-text">
                            {p.title}
                          </span>
                        )}
                        {p.post_url && (
                          <a
                            href={p.post_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-text-muted hover:text-gold"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <span className="ml-auto text-[11px] text-text-dim">
                          {p.posted_at && formatRelative(p.posted_at)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-text-dim">
                        <span>
                          👁 <span className="text-text">{formatViews(p.views ?? 0)}</span>
                        </span>
                        <span>
                          ❤ {formatViews(p.likes ?? 0)}
                        </span>
                        <span>
                          💬 {formatViews(p.comments ?? 0)}
                        </span>
                        <span>
                          💾 {formatViews(p.saves ?? 0)}
                        </span>
                        <span className="text-gold">
                          eng {(eng * 100).toFixed(2)}%
                        </span>
                        <button
                          onClick={() => remove(p.id)}
                          className="ml-auto rounded p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                          title="Obriši"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
