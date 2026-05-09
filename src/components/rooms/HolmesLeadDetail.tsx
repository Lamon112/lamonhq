"use client";

/**
 * Shared Holmes lead detail card — used by both the classic Holmes Bureau
 * panel (in HQ classic view) and the vault Holmes pipeline result drawer.
 * Renders the full per-lead investigation: profile / team / social /
 * angle / publicity tabs, with channel-specific outreach drafts ready
 * to copy-paste into IG / LinkedIn / email / phone / WhatsApp.
 *
 * Single source of truth — change the look here, both surfaces update.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Loader2,
  Copy,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { TabButton, PrimaryButton } from "@/components/ui/common";
import { formatRelative } from "@/lib/format";
import type { LeadRow } from "@/lib/queries";

export type HolmesDetailTab =
  | "profile"
  | "team"
  | "social"
  | "angle"
  | "publicity";

const TIER_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
  veteran: { emoji: "🚀", label: "Veteran", color: "text-purple-300" },
  intermediate: { emoji: "📈", label: "Intermediate", color: "text-amber-300" },
  starter: { emoji: "🌱", label: "Starter", color: "text-emerald-300" },
  dead: { emoji: "💀", label: "Dead", color: "text-text-dim" },
};

const CHANNEL_META: Record<
  string,
  { label: string; emoji: string; format: string }
> = {
  instagram: { label: "Instagram DM", emoji: "📷", format: "≤950ch · casual premium" },
  linkedin: { label: "LinkedIn DM", emoji: "💼", format: "≤700ch · professional" },
  email: { label: "Email", emoji: "📧", format: "full V8 · with subject" },
  phone: { label: "Phone Script", emoji: "📞", format: "3-min call script" },
  whatsapp: { label: "WhatsApp", emoji: "🟢", format: "text + voice memo prep" },
};

interface HolmesLeadDetailProps {
  lead: LeadRow;
  tab: HolmesDetailTab;
  onTabChange: (t: HolmesDetailTab) => void;
  onCopy?: (s: string) => void;
  onRerun?: () => void;
  rerunPending?: boolean;
}

export function HolmesLeadDetail({
  lead,
  tab,
  onTabChange,
  onCopy,
  onRerun,
  rerunPending = false,
}: HolmesLeadDetailProps) {
  const r = lead.holmes_report;
  const handleCopy = onCopy ?? defaultCopy;

  if (!r) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-sm text-text-muted">
          Holmes nije još istražio {lead.name}
        </p>
        {onRerun && (
          <PrimaryButton onClick={onRerun} disabled={rerunPending}>
            {rerunPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Istražujem (~30s)…
              </>
            ) : (
              <>🕵️ Pokreni Holmes</>
            )}
          </PrimaryButton>
        )}
      </div>
    );
  }

  const tier = r.pitch_tier ? TIER_LABEL[r.pitch_tier] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{lead.name}</h3>
          <div className="flex flex-wrap items-baseline gap-2 text-[10px] text-text-dim">
            {tier && (
              <span className={tier.color}>
                {tier.emoji} {tier.label} tier
              </span>
            )}
            {r.recommended_package && (
              <span className="text-amber-300">
                💼 {r.recommended_package}
              </span>
            )}
            <span>· refreshed {formatRelative(r.generated_at)}</span>
          </div>
        </div>
        {onRerun && (
          <button
            onClick={onRerun}
            disabled={rerunPending}
            className="text-[10px] text-text-muted hover:text-amber-300 disabled:opacity-50"
          >
            {rerunPending ? <Loader2 size={11} className="animate-spin" /> : "↻ re-run"}
          </button>
        )}
      </div>

      {/* Quick contact strip — primary channels right at the top so Leonardo
          can open IG / call / email in one click without scrolling. */}
      <ContactStrip lead={lead} report={r} />

      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "profile"} onClick={() => onTabChange("profile")}>
          👤 Profile
        </TabButton>
        <TabButton active={tab === "team"} onClick={() => onTabChange("team")}>
          👥 Tim
        </TabButton>
        <TabButton active={tab === "social"} onClick={() => onTabChange("social")}>
          📊 Social Depth
        </TabButton>
        <TabButton active={tab === "angle"} onClick={() => onTabChange("angle")}>
          🎯 Best Angle
        </TabButton>
        <TabButton active={tab === "publicity"} onClick={() => onTabChange("publicity")}>
          🎤 Publicity
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            <div>
              <div className="text-sm font-semibold text-text">
                {r.owner.name ?? "—"}
              </div>
              {r.owner.title && (
                <div className="text-[11px] text-text-dim">{r.owner.title}</div>
              )}
              {r.owner.bio && (
                <p className="mt-1 text-[11px] text-text-dim">{r.owner.bio}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-dim">
                {r.owner.years_experience != null && (
                  <span>📅 {r.owner.years_experience}+ god</span>
                )}
                {r.owner.education?.length > 0 && (
                  <span>🎓 {r.owner.education.join(", ")}</span>
                )}
                {r.owner.languages?.length > 0 && (
                  <span>🌐 {r.owner.languages.join(", ")}</span>
                )}
              </div>
            </div>

            {r.reachability?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  📡 Najbolji kanali (po confidence)
                </div>
                <ul className="mt-1 space-y-1">
                  {[...r.reachability]
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 5)
                    .map((rch, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="text-[11px] font-medium text-amber-200">
                          {Math.round(rch.confidence * 100)}%
                        </span>
                        <a
                          href={rch.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-text underline-offset-2 hover:underline"
                        >
                          {rch.channel}
                        </a>
                        <span className="text-[10px] text-text-dim">
                          {rch.reasoning}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {tab === "team" && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <TeamTab report={r} />
          </motion.div>
        )}

        {tab === "social" && (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {r.social_depth ? (
              <>
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-amber-300">
                      Tier
                    </span>
                    {tier && (
                      <span className={`text-sm font-semibold ${tier.color}`}>
                        {tier.emoji} {tier.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-text">
                    {r.social_depth.tier_reason}
                  </p>
                  <p className="mt-1 text-[10px] text-text-dim">
                    Composite score: {r.social_depth.score}/100
                  </p>
                  {r.recommended_package && (
                    <p className="mt-1 text-[11px] text-amber-200">
                      💼 Preporuka: {r.recommended_package}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {r.social_depth.tiktok && (
                    <ChannelDepthCard label="🎵 TikTok" depth={r.social_depth.tiktok} />
                  )}
                  {r.social_depth.instagram && (
                    <ChannelDepthCard label="📷 Instagram" depth={r.social_depth.instagram} />
                  )}
                  {r.social_depth.youtube && (
                    <ChannelDepthCard label="▶️ YouTube" depth={r.social_depth.youtube} />
                  )}
                  {r.social_depth.linkedin && (
                    <ChannelDepthCard label="💼 LinkedIn" depth={r.social_depth.linkedin} />
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-text-dim">
                Holmes nije izmjerio social depth (možda nema dostupnih
                kanala). Pokreni re-run da pokušaš ponovno.
              </p>
            )}
          </motion.div>
        )}

        {tab === "angle" && (
          <motion.div
            key="angle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-300">
                💡 Najbolji kut
              </div>
              <p className="mt-0.5 text-[12px] text-text">
                {r.best_angle.summary}
              </p>
              {r.best_angle.opening_hook && (
                <p className="mt-1.5 rounded border border-amber-500/30 bg-bg/40 px-2 py-1 text-[11px] italic text-amber-200">
                  &quot;{r.best_angle.opening_hook}&quot;
                </p>
              )}
              {r.best_angle.avoid?.length > 0 && (
                <div className="mt-1 flex items-start gap-1 text-[10px] text-danger">
                  <AlertCircle size={10} className="mt-0.5 shrink-0" />
                  <span>Izbjegavaj: {r.best_angle.avoid.join(" · ")}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {r.personal_angles.interests?.length > 0 && (
                <AngleList label="Interesi" items={r.personal_angles.interests} />
              )}
              {r.personal_angles.values?.length > 0 && (
                <AngleList label="Vrijednosti" items={r.personal_angles.values} />
              )}
              {r.personal_angles.recent_activity?.length > 0 && (
                <AngleList label="Recent activity" items={r.personal_angles.recent_activity} />
              )}
              {r.personal_angles.pain_points?.length > 0 && (
                <AngleList label="Pain points" items={r.personal_angles.pain_points} />
              )}
            </div>

            <ChannelDraftPicker report={r} onCopy={handleCopy} />
          </motion.div>
        )}

        {tab === "publicity" && (
          <motion.div
            key="publicity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {r.publicity?.length === 0 ? (
              <p className="text-[11px] text-text-dim">
                Holmes nije našao publicity hits (intervjue, podcasts,
                predavanja).
              </p>
            ) : (
              <ul className="space-y-1.5">
                {r.publicity.map((p, i) => (
                  <li key={i} className="rounded border border-border bg-bg/40 p-2">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-medium text-amber-200 hover:underline"
                    >
                      {p.title} <ExternalLink size={10} className="inline" />
                    </a>
                    {p.snippet && (
                      <p className="mt-0.5 text-[11px] text-text-dim">
                        {p.snippet}
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

function ContactStrip({
  lead,
  report,
}: {
  lead: LeadRow;
  report: NonNullable<LeadRow["holmes_report"]>;
}) {
  const ch = report.channels;
  const items: Array<{ key: string; label: string; href: string; emoji: string }> = [];
  if (ch.instagram_personal)
    items.push({ key: "ig", label: "Instagram", href: ch.instagram_personal, emoji: "📷" });
  if (ch.linkedin_personal)
    items.push({ key: "li", label: "LinkedIn", href: ch.linkedin_personal, emoji: "💼" });
  if (ch.email)
    items.push({ key: "em", label: ch.email, href: `mailto:${ch.email}`, emoji: "📧" });
  if (ch.phone)
    items.push({ key: "ph", label: ch.phone, href: `tel:${ch.phone}`, emoji: "📞" });
  if (ch.website)
    items.push({ key: "web", label: "Website", href: ch.website, emoji: "🌐" });
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-bg-elevated/60 px-2 py-1 text-[11px] text-amber-200 hover:border-amber-500 hover:bg-amber-500/10"
          title={`Otvori ${it.label} za ${lead.name}`}
        >
          <span>{it.emoji}</span>
          <span className="max-w-[160px] truncate">{it.label}</span>
        </a>
      ))}
    </div>
  );
}

function ChannelDepthCard({
  label,
  depth,
}: {
  label: string;
  depth: {
    followers?: number;
    postsCount?: number;
    totalViews?: number;
    topViewCount?: number;
    status: string;
    reason?: string;
  };
}) {
  const tone =
    depth.status === "alive"
      ? "border-success/30 bg-success/5"
      : depth.status === "dormant"
        ? "border-warning/30 bg-warning/5"
        : depth.status === "dead"
          ? "border-danger/30 bg-danger/5"
          : "border-border bg-bg/40";
  return (
    <div className={`rounded border ${tone} p-2`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-text">{label}</span>
        <span className="text-[10px] text-text-dim">{depth.status}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-dim">
        {depth.followers != null && <span>👥 {fmt(depth.followers)}</span>}
        {depth.postsCount != null && <span>📝 {depth.postsCount}</span>}
        {depth.totalViews != null && (
          <span>👁 {fmt(depth.totalViews)}</span>
        )}
        {depth.topViewCount != null && (
          <span className="text-amber-300">🚀 top {fmt(depth.topViewCount)}</span>
        )}
      </div>
    </div>
  );
}

function AngleList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <ul className="mt-0.5 space-y-0.5">
        {items.slice(0, 4).map((it, i) => (
          <li key={i} className="text-[11px] text-text">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function TeamTab({ report }: { report: NonNullable<LeadRow["holmes_report"]> }) {
  const team = report.team;
  const rec = report.recommended_contact;
  const sizeLabel: Record<string, string> = {
    solo: "Solo praksa (1-3 doctors)",
    small: "Mala praksa (4-8)",
    mid: "Srednja klinika (9-20)",
    large: "Premium / multi-lokacija (20+)",
  };
  return (
    <div className="space-y-3">
      {rec && (
        <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-amber-300">
            🎯 Holmes preporuča kontaktirati
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-base font-semibold text-text">
              {rec.name}
            </span>
            {rec.role && (
              <span className="text-[11px] text-text-dim">{rec.role}</span>
            )}
            {rec.channel && (
              <span className="ml-auto rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200">
                {CHANNEL_META[rec.channel]?.emoji ?? ""}{" "}
                {CHANNEL_META[rec.channel]?.label ?? rec.channel}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-text">{rec.why}</p>
          {rec.fallback && (
            <div className="mt-2 rounded border border-border bg-bg/40 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted">
                Fallback ako primary ne odgovori
              </div>
              <div className="mt-0.5 text-[12px] text-text">
                <span className="font-medium">{rec.fallback.name}</span>
                {rec.fallback.role && (
                  <span className="text-text-dim"> · {rec.fallback.role}</span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-text-dim">
                {rec.fallback.why}
              </p>
            </div>
          )}
        </div>
      )}

      {team && (
        <div className="rounded-lg border border-border bg-bg-card/40 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              📐 Org struktura
            </span>
            <span className="text-[11px] text-amber-300">
              {sizeLabel[team.size_estimate] ?? team.size_estimate}
            </span>
          </div>
          {team.structure_note && (
            <p className="mt-1 text-[11px] text-text">{team.structure_note}</p>
          )}
          {team.members?.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {team.members.map((m, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-2 rounded border border-border bg-bg/40 p-2"
                >
                  <span className="text-sm font-medium text-text">
                    {m.name}
                  </span>
                  {m.role && (
                    <span className="text-[11px] text-text-dim">{m.role}</span>
                  )}
                  {m.signals?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.signals.map((s, j) => (
                        <span
                          key={j}
                          className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.linkedin_url && (
                    <a
                      href={m.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-300 hover:border-blue-500"
                    >
                      💼 LinkedIn
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-text-dim">
              Holmes nije identificirao članove tima (LinkedIn search prazan).
            </p>
          )}
        </div>
      )}

      {!team && !rec && (
        <p className="text-[11px] text-text-dim">
          Holmes nije analizirao tim. Re-run da generira team analysis +
          recommended_contact.
        </p>
      )}
    </div>
  );
}

function ChannelDraftPicker({
  report,
  onCopy,
}: {
  report: NonNullable<LeadRow["holmes_report"]>;
  onCopy: (s: string) => void;
}) {
  const drafts = report.channel_drafts ?? {};
  const primary = report.primary_channel;
  const available: Array<{
    key: keyof typeof CHANNEL_META;
    text: string;
  }> = [];
  const order: Array<keyof typeof CHANNEL_META> = primary
    ? [
        primary as keyof typeof CHANNEL_META,
        ...(["instagram", "linkedin", "email", "phone", "whatsapp"] as const).filter(
          (k) => k !== primary,
        ),
      ]
    : ["email", "instagram", "linkedin", "phone", "whatsapp"];
  for (const k of order) {
    const t = (drafts as Record<string, string | null | undefined>)[k];
    if (typeof t === "string" && t.trim().length > 0) {
      available.push({ key: k, text: t });
    }
  }
  if (available.length === 0 && report.outreach_draft) {
    available.push({ key: "email", text: report.outreach_draft });
  }
  const [activeKey, setActiveKey] = useState<keyof typeof CHANNEL_META | null>(
    available[0]?.key ?? null,
  );
  if (available.length === 0) return null;

  const active =
    available.find((a) => a.key === activeKey) ?? available[0];
  const meta = CHANNEL_META[active.key];
  const len = active.text.length;
  const limit =
    active.key === "linkedin" ? 750 : active.key === "instagram" ? 1000 : null;
  const over = limit ? len > limit : false;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          ✉️ Outreach po kanalu (Holmes-personalizirano · tier-prilagođen)
        </span>
        {primary && (
          <span className="text-[10px] text-amber-300">
            ⭐ Primary: {CHANNEL_META[primary].label}
          </span>
        )}
      </div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {available.map(({ key }) => {
          const m = CHANNEL_META[key];
          const isActive = key === active.key;
          const isPrimary = key === primary;
          return (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              className={
                "flex items-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors " +
                (isActive
                  ? "border-amber-500 bg-amber-500/15 text-amber-200"
                  : "border-border bg-bg/60 text-text-muted hover:border-amber-500/40 hover:text-amber-300")
              }
              title={m.format}
            >
              {isPrimary && "⭐ "}
              {m.emoji} {m.label}
            </button>
          );
        })}
      </div>
      <div className="mb-1 flex items-baseline justify-between text-[10px]">
        <span className="text-text-dim">{meta.format}</span>
        <span
          className={
            over
              ? "text-danger font-semibold"
              : limit && len > limit * 0.85
                ? "text-warning"
                : "text-text-dim"
          }
        >
          {len} {limit ? `/ ${limit}` : "znakova"}
          {over && " · IMA PREKO!"}
        </span>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded border border-border bg-bg/60 p-2 text-[11px] font-mono text-text">
        {active.text}
      </pre>
      <div className="mt-1.5 flex justify-end">
        <button
          onClick={() => onCopy(active.text)}
          className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 hover:border-amber-500"
        >
          <Copy size={10} /> Copy {meta.label}
        </button>
      </div>
    </div>
  );
}

async function defaultCopy(s: string) {
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    /* ignore */
  }
}
