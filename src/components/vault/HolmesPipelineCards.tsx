"use client";

/**
 * Structured Holmes pipeline result — renders one Sherlock-style card
 * per lead created by a Holmes 10-leads pipeline run. Mirrors the
 * essential fields from HolmesBureauPanel's SelectedDetail view so
 * Leonardo sees the SAME info shape inside the vault that he'd see
 * in the Classic hub's Holmes Bureau.
 *
 * Per lead: tier badge + recommended_package, owner card, channels,
 * recommended_contact, best_angle, all 5 channel_drafts (collapsible).
 */

import { useEffect, useState } from "react";
import {
  Globe,
  Briefcase,
  Camera,
  Mail,
  Phone,
  MessageSquare,
  Search,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { getHolmesPipelineLeads } from "@/app/actions/agentResearch";

type ChannelKey =
  | "instagram"
  | "linkedin"
  | "email"
  | "phone_script"
  | "whatsapp";

interface HolmesReport {
  owner?: {
    name?: string;
    title?: string;
    bio?: string;
    photo?: string;
    education?: string[];
    languages?: string[];
    years_experience?: number | null;
  };
  channels?: {
    linkedin_personal?: string;
    instagram_personal?: string;
    email?: string;
    phone?: string;
    linkedin_company?: string;
    instagram_company?: string;
    website?: string;
  };
  best_angle?: {
    summary?: string;
    opening_hook?: string;
    avoid?: string[];
  };
  publicity?: Array<{ title: string; url: string; date?: string }>;
  pitch_tier?: "veteran" | "intermediate" | "starter" | "dead";
  recommended_package?: string;
  recommended_contact?: {
    name?: string;
    channel?: string;
    reasoning?: string;
  };
  channel_drafts?: Partial<Record<ChannelKey, string>>;
  team?: Array<{ name?: string; role?: string; linkedin?: string | null }>;
}

interface LeadRow {
  id: string;
  name: string;
  niche: string | null;
  website_url: string | null;
  notes: string | null;
  holmes_report: HolmesReport | null;
  icp_score: number | null;
}

const TIER_STYLE: Record<NonNullable<HolmesReport["pitch_tier"]>, string> = {
  veteran:
    "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
  intermediate: "border-amber-500/60 bg-amber-500/15 text-amber-300",
  starter: "border-cyan-500/60 bg-cyan-500/15 text-cyan-300",
  dead: "border-stone-600 bg-stone-800/60 text-stone-400",
};

const TIER_LABEL: Record<NonNullable<HolmesReport["pitch_tier"]>, string> = {
  veteran: "VETERAN",
  intermediate: "INTERMEDIATE",
  starter: "STARTER",
  dead: "DEAD",
};

export function HolmesPipelineCards({ actionRowId }: { actionRowId: string }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; error: string }
    | { kind: "ok"; leads: LeadRow[] }
  >({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    getHolmesPipelineLeads(actionRowId).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setState({ kind: "ok", leads: res.leads as LeadRow[] });
      } else {
        setState({ kind: "error", error: res.error });
      }
    });
    return () => {
      alive = false;
    };
  }, [actionRowId]);

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 size={14} className="animate-spin" /> Učitavam Holmes
        dossier…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
        {state.error}
      </div>
    );
  }
  if (state.leads.length === 0) {
    return (
      <p className="text-[11px] text-text-muted">
        Nema spremljenih leadova za ovaj run (možda Places nije pronašao
        rezultate).
      </p>
    );
  }

  const sorted = [...state.leads].sort((a, b) => {
    const order: Record<string, number> = {
      veteran: 0,
      intermediate: 1,
      starter: 2,
      dead: 3,
    };
    const ta = order[a.holmes_report?.pitch_tier ?? "starter"] ?? 2;
    const tb = order[b.holmes_report?.pitch_tier ?? "starter"] ?? 2;
    return ta - tb;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          ▾ {state.leads.length} leadova · sortirano po tieru
        </h4>
      </div>
      {sorted.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const r = lead.holmes_report;
  const tier = r?.pitch_tier;
  const tierStyle = tier ? TIER_STYLE[tier] : "border-stone-600 bg-stone-800/40 text-stone-400";
  const tierLabel = tier ? TIER_LABEL[tier] : "PENDING";
  const [open, setOpen] = useState<ChannelKey | null>(null);
  const drafts = r?.channel_drafts ?? {};

  return (
    <article className="rounded-md border border-amber-500/30 bg-bg-card p-3 space-y-3">
      {/* Header: clinic name + tier + package */}
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text">{lead.name}</h3>
          {r?.recommended_package && (
            <p className="mt-0.5 text-[11px] text-amber-300">
              → {r.recommended_package}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierStyle}`}
        >
          {tierLabel}
        </span>
      </header>

      {/* Owner card */}
      {r?.owner?.name && (
        <div className="rounded border border-border bg-bg-elevated/40 p-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Vlasnik
          </div>
          <div className="mt-0.5 text-sm font-medium text-text">
            👤 {r.owner.name}
            {r.owner.title && (
              <span className="ml-1 text-text-dim font-normal">
                · {r.owner.title}
              </span>
            )}
          </div>
          {r.owner.bio && (
            <p className="mt-1 text-[11px] text-text-dim leading-snug">
              {r.owner.bio}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
            {r.owner.years_experience != null && (
              <span>📅 {r.owner.years_experience}+ god</span>
            )}
            {r.owner.languages && r.owner.languages.length > 0 && (
              <span>🌐 {r.owner.languages.join(", ")}</span>
            )}
            {r.owner.education && r.owner.education.length > 0 && (
              <span>🎓 {r.owner.education.join(", ")}</span>
            )}
          </div>
        </div>
      )}

      {/* Channels */}
      {r?.channels && (
        <div className="flex flex-wrap gap-1.5">
          {r.channels.website && (
            <ChannelLink
              href={r.channels.website}
              icon={<Globe size={10} />}
              label="web"
            />
          )}
          {r.channels.linkedin_personal && (
            <ChannelLink
              href={r.channels.linkedin_personal}
              icon={<Briefcase size={10} />}
              label="LinkedIn"
            />
          )}
          {r.channels.instagram_personal && (
            <ChannelLink
              href={r.channels.instagram_personal}
              icon={<Camera size={10} />}
              label="Instagram"
            />
          )}
          {r.channels.email && (
            <ChannelLink
              href={`mailto:${r.channels.email}`}
              icon={<Mail size={10} />}
              label={r.channels.email}
            />
          )}
          {r.channels.phone && (
            <ChannelLink
              href={`tel:${r.channels.phone}`}
              icon={<Phone size={10} />}
              label={r.channels.phone}
            />
          )}
        </div>
      )}

      {/* Recommended contact */}
      {r?.recommended_contact?.name && (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
          <div className="font-mono uppercase tracking-wider text-amber-300 text-[9px]">
            Preporučeni kontakt
          </div>
          <div className="mt-0.5 text-text">
            <strong>{r.recommended_contact.name}</strong>
            {r.recommended_contact.channel && (
              <span className="ml-1 text-text-dim">
                · via {r.recommended_contact.channel}
              </span>
            )}
          </div>
          {r.recommended_contact.reasoning && (
            <div className="mt-0.5 text-text-dim italic">
              {r.recommended_contact.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Best angle */}
      {r?.best_angle?.summary && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-emerald-300">
            Best angle
          </div>
          <p className="mt-0.5 text-[11px] text-text">{r.best_angle.summary}</p>
          {r.best_angle.opening_hook && (
            <p className="mt-1 italic text-[11px] text-emerald-200">
              💬 &ldquo;{r.best_angle.opening_hook}&rdquo;
            </p>
          )}
          {r.best_angle.avoid && r.best_angle.avoid.length > 0 && (
            <p className="mt-1 text-[10px] text-rose-300">
              ⚠ Avoid: {r.best_angle.avoid.join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* Channel drafts — collapsible chips */}
      {Object.keys(drafts).length > 0 && (
        <div className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
            Channel drafts
          </div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(drafts) as ChannelKey[]).map((k) => {
              const v = drafts[k];
              if (!v || typeof v !== "string" || !v.trim()) return null;
              const active = open === k;
              return (
                <button
                  key={k}
                  onClick={() => setOpen(active ? null : k)}
                  className={
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase transition-colors " +
                    (active
                      ? "border-amber-500 bg-amber-500/15 text-amber-200"
                      : "border-border bg-bg-card text-text-muted hover:border-amber-500/50 hover:text-amber-300")
                  }
                >
                  <ChannelIcon k={k} />
                  {k}
                  <ChevronDown
                    size={10}
                    className={active ? "rotate-180 transition-transform" : "transition-transform"}
                  />
                </button>
              );
            })}
          </div>
          {open && drafts[open] && (
            <div className="mt-2 rounded border border-amber-500/30 bg-bg-elevated/60 p-2 text-[11px] leading-relaxed text-text whitespace-pre-wrap">
              {drafts[open]}
            </div>
          )}
        </div>
      )}

      {/* Team list (collapsed if exists) */}
      {r?.team && r.team.length > 0 && (
        <details className="rounded border border-border bg-bg-elevated/40 p-2">
          <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wider text-text-muted">
            ▾ Tim ({r.team.length})
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-[11px]">
            {r.team.slice(0, 8).map((t, i) => (
              <li key={i} className="text-text">
                <strong>{t.name ?? "—"}</strong>
                {t.role && <span className="text-text-dim"> · {t.role}</span>}
                {t.linkedin && (
                  <a
                    href={t.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-cyan-300 hover:underline"
                  >
                    LI
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Publicity (collapsed) */}
      {r?.publicity && r.publicity.length > 0 && (
        <details className="rounded border border-border bg-bg-elevated/40 p-2">
          <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wider text-text-muted">
            ▾ Publicity ({r.publicity.length})
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-[11px]">
            {r.publicity.map((p, i) => (
              <li key={i}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:underline"
                >
                  {p.title}
                </a>
                {p.date && <span className="ml-1 text-text-muted">· {p.date}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function ChannelLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1 rounded border border-border bg-bg-elevated/60 px-1.5 py-0.5 text-[10px] text-text-dim hover:border-cyan-500/50 hover:text-cyan-300"
    >
      {icon}
      <span className="max-w-[160px] truncate">{label}</span>
    </a>
  );
}

function ChannelIcon({ k }: { k: ChannelKey }) {
  switch (k) {
    case "linkedin":
      return <Briefcase size={9} />;
    case "instagram":
      return <Camera size={9} />;
    case "email":
      return <Mail size={9} />;
    case "phone_script":
      return <Phone size={9} />;
    case "whatsapp":
      return <MessageSquare size={9} />;
    default:
      return <Search size={9} />;
  }
}
