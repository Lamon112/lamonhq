"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Sparkles,
  Calendar as CalendarIcon,
  ExternalLink,
  Phone,
  Globe,
  Briefcase,
  Map as MapIcon,
} from "lucide-react";
import { generateBriefQuestions } from "@/app/actions/brief";
import {
  StatTile,
  Badge,
  PrimaryButton,
  GhostButton,
} from "@/components/ui/common";
import { formatRelative } from "@/lib/format";
import type { LeadRow } from "@/lib/queries";

interface BriefPanelProps {
  initialList: LeadRow[];
}

interface ParsedNotes {
  reasoning?: string;
  premiumSignals?: string;
  financialIntel?: string;
  hasCompetitor?: string;
  socialScore?: string;
  socialSignals?: string;
  owners?: string;
  webUrl?: string;
  email?: string;
  phone?: string;
  mapsUrl?: string;
  orgLinkedin?: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };
}

function parseNotes(notes: string | null): ParsedNotes {
  if (!notes) return { socialLinks: {} };
  const out: ParsedNotes = { socialLinks: {} };

  const grab = (regex: RegExp): string | undefined => {
    const m = notes.match(regex);
    return m ? m[1].trim() : undefined;
  };

  out.reasoning = grab(/^🤖 ([^\n]+)/m);
  out.premiumSignals = grab(/^✨ Premium signals:\s*([^\n]+)/m);
  out.financialIntel = grab(/^📈 Financial intel:\s*([^\n]+)/m);
  out.hasCompetitor = grab(/^🚫 VEĆ IMA RJEŠENJE:\s*([^\n]+)/m);
  out.socialScore = grab(/^📱 Social score:\s*([^\n]+)/m);
  out.socialSignals = grab(/^📊 Social signals:\s*([^\n]+)/m);

  const ownerBlock = notes.match(/👥 AI vlasnici:\s*\n([\s\S]*?)(?=\n\n|\n[A-Z📱📊📈🚫✨🤖]|$)/);
  if (ownerBlock) out.owners = ownerBlock[1].trim();

  out.webUrl = grab(/^Website:\s*(\S+)/m) ?? grab(/^Web:\s*(\S+)/m);
  out.email = grab(/Email:\s*(\S+@\S+)/);
  out.phone = grab(/^Phone:\s*([+\d\s-]+)/m);
  out.mapsUrl = grab(/^Maps:\s*(\S+)/m);
  out.orgLinkedin = grab(/^Org LinkedIn:\s*(\S+)/m);

  // Social links from one-line "📱 Social score: 3/4 · instagram: ... · facebook: ..."
  if (out.socialScore) {
    const ig = out.socialScore.match(/instagram:\s*(\S+)/i);
    const fb = out.socialScore.match(/facebook:\s*(\S+)/i);
    const li = out.socialScore.match(/linkedin:\s*(\S+)/i);
    const tt = out.socialScore.match(/tiktok:\s*(\S+)/i);
    const yt = out.socialScore.match(/youtube:\s*(\S+)/i);
    if (ig) out.socialLinks.instagram = ig[1];
    if (fb) out.socialLinks.facebook = fb[1];
    if (li) out.socialLinks.linkedin = li[1];
    if (tt) out.socialLinks.tiktok = tt[1];
    if (yt) out.socialLinks.youtube = yt[1];
  }

  return out;
}

function companywallUrlFromIntel(intel: string | undefined): string | null {
  if (!intel) return null;
  const m = intel.match(/(https:\/\/www\.companywall\.hr\/\S+)/);
  return m ? m[1] : null;
}

export function BriefPanel({ initialList }: BriefPanelProps) {
  const now = new Date();
  const [questionsByLead, setQuestionsByLead] = useState<Record<string, string>>(
    {},
  );
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const upcoming = useMemo(
    () =>
      initialList
        .filter((l) => l.discovery_at && new Date(l.discovery_at) >= now)
        .sort(
          (a, b) =>
            new Date(a.discovery_at!).getTime() -
            new Date(b.discovery_at!).getTime(),
        ),
    [initialList],
  );

  const topCandidates = useMemo(
    () =>
      initialList
        .filter(
          (l) => !l.discovery_at && (l.icp_score ?? 0) >= 15 && l.stage !== "closed_lost",
        )
        .slice(0, 5),
    [initialList],
  );

  function generateForLead(leadId: string) {
    setError(null);
    setPendingLeadId(leadId);
    startTransition(async () => {
      const res = await generateBriefQuestions(leadId);
      setPendingLeadId(null);
      if (!res.ok) {
        setError(res.error ?? "AI greška");
        return;
      }
      setQuestionsByLead((prev) => ({ ...prev, [leadId]: res.questions ?? "" }));
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Nadolazeći" value={String(upcoming.length)} />
        <StatTile label="Hot bez termina" value={String(topCandidates.length)} />
        <StatTile label="Total leadova" value={String(initialList.length)} />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
          <CalendarIcon size={14} /> Nadolazeći sastanci
        </h3>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg-card/40 p-6 text-center text-sm text-text-dim">
            Nema bookiranih sastanaka. Hot leadovi bez termina su dolje — kad ti
            netko bookira preko Calendly-ja, automatski će se pojaviti ovdje s
            cijelim brief-om.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((l) => (
              <BriefCard
                key={l.id}
                lead={l}
                questions={questionsByLead[l.id]}
                pending={pendingLeadId === l.id}
                onGenerate={() => generateForLead(l.id)}
              />
            ))}
          </div>
        )}
      </section>

      {topCandidates.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <Sparkles size={14} /> Hot bez termina (top 5) — pripremi se unaprijed
          </h3>
          <div className="space-y-3">
            {topCandidates.map((l) => (
              <BriefCard
                key={l.id}
                lead={l}
                questions={questionsByLead[l.id]}
                pending={pendingLeadId === l.id}
                onGenerate={() => generateForLead(l.id)}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BriefCard({
  lead,
  questions,
  pending,
  onGenerate,
  compact,
}: {
  lead: LeadRow;
  questions?: string;
  pending: boolean;
  onGenerate: () => void;
  compact?: boolean;
}) {
  const parsed = useMemo(() => parseNotes(lead.notes), [lead.notes]);
  const cwUrl = companywallUrlFromIntel(parsed.financialIntel);

  const score = lead.icp_score ?? 0;
  const scoreTone: "success" | "warning" | "neutral" =
    score >= 15 ? "success" : score >= 10 ? "warning" : "neutral";

  return (
    <div className="rounded-xl border border-border bg-bg-card/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-text">{lead.name}</h4>
            <Badge tone={scoreTone}>{score}/20 ICP</Badge>
            {lead.niche && (
              <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[10px] text-text-muted">
                {lead.niche}
              </span>
            )}
          </div>
          {lead.discovery_at && (
            <p className="mt-1 text-xs text-text-dim">
              📅{" "}
              {new Date(lead.discovery_at).toLocaleString("hr-HR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · {formatRelative(lead.discovery_at)}
            </p>
          )}
        </div>
      </div>

      {!compact && parsed.reasoning && (
        <p className="mt-2 text-[11px] italic text-text-dim">
          🤖 {parsed.reasoning}
        </p>
      )}

      {parsed.financialIntel && (
        <div className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-[11px] text-emerald-300">
          📈 {parsed.financialIntel.replace(/\s*·\s*https?:\/\/\S+/, "")}
        </div>
      )}

      {parsed.hasCompetitor && (
        <div className="mt-2 rounded border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] text-danger">
          🚫 VEĆ IMA RJEŠENJE: {parsed.hasCompetitor}
        </div>
      )}

      {!compact && parsed.premiumSignals && (
        <p className="mt-2 text-[11px] text-purple-300">
          ✨ {parsed.premiumSignals}
        </p>
      )}

      {!compact && parsed.owners && (
        <pre className="mt-2 whitespace-pre-wrap rounded border border-border bg-bg/60 p-2 text-[11px] text-text-dim">
          👥 {parsed.owners}
        </pre>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {parsed.webUrl && (
          <LinkPill href={parsed.webUrl} icon={<Globe size={11} />} label="Web" />
        )}
        {parsed.email && (
          <span className="rounded border border-border bg-bg/60 px-2 py-0.5 text-text-muted">
            ✉️ {parsed.email}
          </span>
        )}
        {parsed.phone && (
          <span className="rounded border border-border bg-bg/60 px-2 py-0.5 text-text-muted">
            <Phone size={10} className="inline" /> {parsed.phone}
          </span>
        )}
        {parsed.socialLinks.instagram && (
          <LinkPill
            href={parsed.socialLinks.instagram}
            label="📷 IG"
            tone="pink"
          />
        )}
        {parsed.socialLinks.linkedin && (
          <LinkPill
            href={parsed.socialLinks.linkedin}
            label="💼 LI"
            tone="blue"
          />
        )}
        {parsed.orgLinkedin && !parsed.socialLinks.linkedin && (
          <LinkPill
            href={parsed.orgLinkedin}
            icon={<Briefcase size={11} />}
            label="Org LI"
            tone="blue"
          />
        )}
        {parsed.mapsUrl && (
          <LinkPill
            href={parsed.mapsUrl}
            icon={<MapIcon size={11} />}
            label="Maps"
          />
        )}
        {cwUrl && (
          <LinkPill
            href={cwUrl}
            icon={<ExternalLink size={11} />}
            label="Companywall"
            tone="cyan"
          />
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {questions ? (
          <GhostButton onClick={onGenerate} disabled={pending}>
            {pending ? "Regeneriram…" : "🔄 Regeneriraj pitanja"}
          </GhostButton>
        ) : (
          <PrimaryButton onClick={onGenerate} disabled={pending}>
            {pending ? "AI piše pitanja…" : "✨ Generiraj brief pitanja"}
          </PrimaryButton>
        )}
      </div>

      {questions && (
        <pre className="mt-3 whitespace-pre-wrap rounded border border-gold/30 bg-gold/5 p-3 text-[12px] leading-relaxed text-text">
          {questions}
        </pre>
      )}
    </div>
  );
}

function LinkPill({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  tone?: "pink" | "blue" | "cyan";
}) {
  const color =
    tone === "pink"
      ? "text-pink-400 hover:text-pink-300 border-pink-500/30 bg-pink-500/5"
      : tone === "blue"
        ? "text-blue-400 hover:text-blue-300 border-blue-500/30 bg-blue-500/5"
        : tone === "cyan"
          ? "text-cyan-300 hover:text-cyan-200 border-cyan-500/30 bg-cyan-500/5"
          : "text-text-muted hover:text-text border-border bg-bg/60";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${color}`}
    >
      {icon} {label}
    </a>
  );
}
