"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Sparkles,
  Send,
  X as XIcon,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Scissors,
  RefreshCw,
} from "lucide-react";
import {
  generateColdDrafts,
  approveAndSendDraft,
  editPendingDraft,
  dismissPendingDraft,
  getPendingColdDrafts,
  regenerateDraftWithOwner,
  type PendingColdDraft,
} from "@/app/actions/outreach";
import { shortenForChannel } from "@/app/actions/ai";
import { PrimaryButton, GhostButton, Badge } from "@/components/ui/common";
import { formatRelative } from "@/lib/format";

const PLATFORM_LABELS: Record<string, string> = {
  email: "📧 Email",
  linkedin: "💼 LinkedIn",
  instagram: "📷 Instagram",
  tiktok: "🎵 TikTok",
  other: "Other",
};

export function ApprovalQueue() {
  const [drafts, setDrafts] = useState<PendingColdDraft[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const list = await getPendingColdDrafts();
    setDrafts(list);
  }

  function generate() {
    setError(null);
    setInfo(null);
    setPendingId("__bulk__");
    startTransition(async () => {
      const res = await generateColdDrafts();
      setPendingId(null);
      if (!res.ok) {
        setError(res.error ?? "Generiranje neuspješno");
        return;
      }
      setInfo(
        `🤖 ${res.generated} novi draft${res.generated === 1 ? "" : "a"} · preskočeno ${res.skipped} (već imaju draft ili poslano)`,
      );
      await refresh();
    });
  }

  function approve(d: PendingColdDraft) {
    setError(null);
    setPendingId(d.id);
    startTransition(async () => {
      const res = await approveAndSendDraft(
        d.id,
        edits[d.id],
        subjects[d.id],
      );
      setPendingId(null);
      if (!res.ok) {
        setError(res.error ?? "Send neuspješan");
        return;
      }
      setInfo(
        res.emailSent
          ? `✅ Email poslan kroz Gmail (${res.fromEmail})`
          : "✅ Označeno kao poslano — kopiraj tekst i pošalji ručno",
      );
      await refresh();
    });
  }

  function dismiss(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await dismissPendingDraft(id);
      setPendingId(null);
      if (!res.ok) {
        setError(res.error ?? "Greška");
        return;
      }
      setInfo("Draft odbačen");
      await refresh();
    });
  }

  function saveEdit(id: string) {
    const text = edits[id];
    if (!text) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await editPendingDraft(id, text);
      setPendingId(null);
      if (!res.ok) {
        setError(res.error ?? "Edit failed");
        return;
      }
      setInfo("Draft spremljen");
      await refresh();
    });
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setInfo("📋 Kopirano u clipboard");
    } catch {
      setError("Clipboard nedostupan");
    }
  }

  function shorten(d: PendingColdDraft, channel: "linkedin" | "instagram") {
    setError(null);
    setPendingId(d.id);
    startTransition(async () => {
      const ctx = d.context_payload ?? {};
      const leadName = ctx.leadName ?? "Lead";
      const original = edits[d.id] ?? d.draft_text;
      const res = await shortenForChannel(original, channel, leadName);
      setPendingId(null);
      if (!res.ok || !res.draft) {
        setError(res.error ?? "Shorten failed");
        return;
      }
      setEdits((s) => ({ ...s, [d.id]: res.draft! }));
      setInfo(
        `✂️ Skraćeno za ${channel === "linkedin" ? "LinkedIn" : "Instagram"} (${res.charCount} znakova). Provjeri tekst pa Save edit.`,
      );
    });
  }

  function regenWithOwner(d: PendingColdDraft) {
    setError(null);
    setPendingId(d.id);
    startTransition(async () => {
      const res = await regenerateDraftWithOwner(d.id);
      setPendingId(null);
      if (!res.ok) {
        setError(res.error ?? "Regen greška");
        return;
      }
      setInfo("🔄 Draft regeneriran s owner kontekstom");
      // Drop any local edit since the underlying draft just changed
      setEdits((s) => {
        const next = { ...s };
        delete next[d.id];
        return next;
      });
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-dim">
          AI generira drafts za Hot leadove (≥15 ICP). Approve šalje preko
          Gmail-a (ako lead ima email) ili samo označi kao poslano (LI/IG —
          ti šalješ ručno).
        </p>
        <PrimaryButton
          onClick={generate}
          disabled={pendingId === "__bulk__"}
        >
          {pendingId === "__bulk__" ? (
            "Generiram…"
          ) : (
            <>
              <Sparkles size={14} /> Generiraj za Hot leadove
            </>
          )}
        </PrimaryButton>
      </div>

      {info && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {info}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-card/40 p-6 text-center text-sm text-text-dim">
          Nema pending draftova. Klikni "Generiraj za Hot leadove" ako imaš
          ≥15 ICP leadove bez nedavne aktivnosti.
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => {
            const ctx = d.context_payload ?? {};
            const platform = ctx.platform ?? "linkedin";
            const isEmail = platform === "email" && !!ctx.email;
            const text = edits[d.id] ?? d.draft_text;
            const score = typeof ctx.score === "number" ? ctx.score : null;

            return (
              <div
                key={d.id}
                className="rounded-xl border border-border bg-bg-card/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-text">
                        {ctx.leadName ?? "Lead"}
                      </h4>
                      {score !== null && (
                        <Badge
                          tone={score >= 18 ? "success" : "warning"}
                        >
                          {score}/20 ICP
                        </Badge>
                      )}
                      <PlatformPill
                        platform={platform}
                        channels={
                          (ctx as { channels?: Record<string, string> }).channels
                        }
                        channelHealth={
                          (ctx as { channelHealth?: ChannelHealthLite })
                            .channelHealth
                        }
                        email={ctx.email ?? null}
                        message={text}
                        onCopy={copyToClipboard}
                      />
                      {isEmail && (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                          ⚡ auto-send ready
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-text-dim">
                      Generirano {formatRelative(d.generated_at)}
                      {ctx.email ? ` · ${ctx.email}` : ""}
                    </p>
                  </div>
                </div>

                {isEmail && (
                  <div className="mt-3">
                    <label className="block text-[10px] uppercase tracking-wider text-text-muted">
                      Subject
                    </label>
                    <input
                      type="text"
                      defaultValue={`Lamon Agency · ${ctx.leadName ?? "Lead"}`}
                      onChange={(e) =>
                        setSubjects((s) => ({ ...s, [d.id]: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-border bg-bg/60 px-2 py-1.5 text-xs text-text focus:border-gold/40 focus:outline-none"
                    />
                  </div>
                )}

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <label className="block text-[10px] uppercase tracking-wider text-text-muted">
                      Poruka
                    </label>
                    <CharCounter text={text} platform={platform} />
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [d.id]: e.target.value }))
                    }
                    rows={Math.min(12, Math.max(5, text.split("\n").length + 1))}
                    className="mt-1 w-full rounded border border-border bg-bg/60 px-3 py-2 text-xs text-text font-mono focus:border-gold/40 focus:outline-none"
                  />
                  {(platform === "linkedin" || platform === "instagram") && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {platform === "linkedin" && (
                        <button
                          onClick={() => shorten(d, "linkedin")}
                          disabled={pendingId === d.id}
                          className="flex items-center gap-1 rounded border border-border bg-bg/60 px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                        >
                          <Scissors size={10} />
                          {pendingId === d.id ? "Skraćujem…" : "Skrati za LI (700ch)"}
                        </button>
                      )}
                      {platform === "instagram" && (
                        <button
                          onClick={() => shorten(d, "instagram")}
                          disabled={pendingId === d.id}
                          className="flex items-center gap-1 rounded border border-border bg-bg/60 px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                        >
                          <Scissors size={10} />
                          {pendingId === d.id ? "Skraćujem…" : "Skrati za IG (950ch)"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {d.reasoning && (
                  <p className="mt-2 text-[11px] italic text-text-dim">
                    💡 Hook: {d.reasoning}
                  </p>
                )}

                {ctx.owner && (
                  <OwnerSection
                    owner={ctx.owner}
                    message={text}
                    onCopy={copyToClipboard}
                  />
                )}

                <ChannelRow
                  channels={
                    (
                      ctx as {
                        orgChannels?: Record<string, string>;
                        channels?: Record<string, string>;
                      }
                    ).orgChannels ??
                    (ctx as { channels?: Record<string, string> }).channels
                  }
                  channelHealth={
                    (ctx as { channelHealth?: ChannelHealthLite })
                      .channelHealth
                  }
                  email={ctx.email ?? null}
                  message={text}
                  onCopy={copyToClipboard}
                  label={ctx.owner ? "🏥 Ordinacija (fallback):" : "Pošalji preko:"}
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PrimaryButton
                    onClick={() => approve(d)}
                    disabled={pendingId === d.id}
                  >
                    {pendingId === d.id ? (
                      "Šaljem…"
                    ) : isEmail ? (
                      <>
                        <Mail size={13} /> Approve & Send Email
                      </>
                    ) : (
                      <>
                        <Check size={13} /> Approve & Mark Sent
                      </>
                    )}
                  </PrimaryButton>
                  {!isEmail && (
                    <GhostButton
                      onClick={() => copyToClipboard(text)}
                      disabled={pendingId === d.id}
                    >
                      <Copy size={13} /> Copy text
                    </GhostButton>
                  )}
                  <GhostButton
                    onClick={() => regenWithOwner(d)}
                    disabled={pendingId === d.id}
                  >
                    <RefreshCw size={12} />
                    {pendingId === d.id ? "Regeneram…" : "Regen s vlasnikom"}
                  </GhostButton>
                  {edits[d.id] !== undefined &&
                    edits[d.id] !== d.draft_text && (
                      <GhostButton
                        onClick={() => saveEdit(d.id)}
                        disabled={pendingId === d.id}
                      >
                        <Send size={13} /> Save edit
                      </GhostButton>
                    )}
                  <GhostButton
                    onClick={() => dismiss(d.id)}
                    disabled={pendingId === d.id}
                  >
                    <XIcon size={13} /> Odbaci
                  </GhostButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CHANNEL_HARD_LIMITS: Record<string, number> = {
  linkedin: 750,
  instagram: 1000,
};

interface HealthEntry {
  status: "alive" | "recently_active" | "dormant" | "dead" | "blocked" | "unknown";
  followers?: number;
  postCount?: number;
  reason?: string;
}
type ChannelHealthLite = Partial<Record<string, HealthEntry>>;

function healthEmoji(s: HealthEntry["status"]): string {
  switch (s) {
    case "alive":
    case "recently_active":
      return "✅";
    case "dormant":
      return "⚠️";
    case "dead":
      return "❌";
    case "blocked":
      return "🚫";
    default:
      return "❓";
  }
}

function isDead(h?: HealthEntry): boolean {
  return h?.status === "dead";
}

function CharCounter({ text, platform }: { text: string; platform: string }) {
  const limit = CHANNEL_HARD_LIMITS[platform];
  const len = text.length;
  if (!limit) {
    return (
      <span className="text-[10px] text-text-dim">{len} znakova</span>
    );
  }
  const over = len > limit;
  const near = !over && len > limit * 0.85;
  return (
    <span
      className={
        "text-[10px] " +
        (over
          ? "text-danger font-semibold"
          : near
            ? "text-warning"
            : "text-text-dim")
      }
      title={`${platform} hard limit: ${limit}`}
    >
      {len} / {limit}
      {over && " · IMA PREKO!"}
    </span>
  );
}

interface OwnerSectionProps {
  owner: {
    name: string;
    title: string | null;
    email: string | null;
    linkedin_url: string | null;
    channels?: { email?: string; linkedin?: string; instagram?: string };
    channelHealth?: {
      linkedin?: { status: string; followers?: number; reason?: string };
      instagram?: { status: string; followers?: number; reason?: string };
    };
  };
  message: string;
  onCopy: (t: string) => void;
}

function OwnerSection({ owner, message, onCopy }: OwnerSectionProps) {
  const items: Array<{
    key: string;
    label: string;
    href: string;
    title: string;
    health?: { status: string; followers?: number; reason?: string };
  }> = [];
  const email = owner.channels?.email ?? owner.email;
  if (email)
    items.push({
      key: "email",
      label: "📧 Email",
      href: `mailto:${email}`,
      title: email,
    });
  const li = owner.channels?.linkedin ?? owner.linkedin_url;
  if (li)
    items.push({
      key: "li",
      label: "💼 LinkedIn",
      href: li,
      title: li,
      health: owner.channelHealth?.linkedin,
    });
  if (owner.channels?.instagram)
    items.push({
      key: "ig",
      label: "📷 Instagram",
      href: owner.channels.instagram,
      title: owner.channels.instagram,
      health: owner.channelHealth?.instagram,
    });

  if (items.length === 0) return null;

  return (
    <div className="mt-3 rounded border border-purple-500/30 bg-purple-500/5 p-2">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-wider text-purple-300">
          👤 Vlasnik (preferiraj)
        </span>
        <span className="text-xs font-medium text-text">{owner.name}</span>
        {owner.title && (
          <span className="text-[10px] text-text-dim">{owner.title}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((c) => {
          const dead = c.health?.status === "dead";
          const dormant = c.health?.status === "dormant";
          const colorClass = dead
            ? "border-danger/40 bg-danger/5 text-danger/70 hover:border-danger"
            : dormant
              ? "border-warning/40 bg-warning/5 text-warning hover:border-warning"
              : "border-purple-500/40 bg-purple-500/10 text-purple-200 hover:border-purple-500";
          const tooltip = c.health
            ? `${c.health.status}${c.health.followers != null ? ` · ${c.health.followers} followers` : ""}${c.health.reason ? ` · ${c.health.reason}` : ""} · ${c.title}`
            : c.title;
          return (
            <a
              key={c.key}
              href={c.href}
              target={c.key === "email" ? undefined : "_blank"}
              rel={c.key === "email" ? undefined : "noreferrer"}
              title={tooltip}
              onClick={() => {
                if (c.key !== "email") void onCopy(message);
              }}
              className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors ${colorClass}`}
            >
              {c.health
                ? c.health.status === "dead"
                  ? "❌ "
                  : c.health.status === "dormant"
                    ? "⚠️ "
                    : "✅ "
                : ""}
              {c.label}
              {c.health?.followers != null && (
                <span className="ml-1 text-[10px] opacity-70">
                  {c.health.followers}
                </span>
              )}
              <ExternalLink size={10} />
            </a>
          );
        })}
      </div>
    </div>
  );
}

interface PlatformPillProps {
  platform: string;
  channels?: Record<string, string>;
  channelHealth?: ChannelHealthLite;
  email: string | null;
  message: string;
  onCopy: (t: string) => void;
}

function PlatformPill({
  platform,
  channels,
  channelHealth,
  email,
  message,
  onCopy,
}: PlatformPillProps) {
  const lookup: Record<string, string | undefined> = {
    email: channels?.email ?? email ?? undefined,
    linkedin: channels?.linkedin,
    instagram: channels?.instagram,
    facebook: channels?.facebook,
    tiktok: channels?.tiktok,
  };
  const target = lookup[platform];
  const label = PLATFORM_LABELS[platform] ?? platform;
  const health = channelHealth?.[platform];
  const dead = isDead(health);
  const baseClass =
    "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors";

  if (!target) {
    return (
      <span
        className={`${baseClass} border-border bg-bg/60 text-text-muted`}
      >
        {label}
      </span>
    );
  }

  // Dead profile → still link, but red + warning
  if (dead) {
    return (
      <a
        href={platform === "email" ? `mailto:${target}` : target}
        target={platform === "email" ? undefined : "_blank"}
        rel={platform === "email" ? undefined : "noreferrer"}
        title={`MRTAV: ${health?.reason ?? "neaktivan profil"} — koristi drugi kanal`}
        onClick={() => {
          if (platform !== "email") void onCopy(message);
        }}
        className={`${baseClass} border-danger/40 bg-danger/10 text-danger hover:border-danger`}
      >
        ❌ {label}
        <ExternalLink size={10} />
      </a>
    );
  }

  return (
    <a
      href={platform === "email" ? `mailto:${target}` : target}
      target={platform === "email" ? undefined : "_blank"}
      rel={platform === "email" ? undefined : "noreferrer"}
      title={
        health
          ? `${health.status}${health.followers != null ? ` · ${health.followers} followers` : ""}${health.reason ? ` · ${health.reason}` : ""}`
          : `Otvori ${label}`
      }
      onClick={() => {
        if (platform !== "email") void onCopy(message);
      }}
      className={`${baseClass} border-gold/40 bg-gold/10 text-gold hover:border-gold hover:bg-gold/20`}
    >
      {health ? `${healthEmoji(health.status)} ` : ""}
      {label}
      <ExternalLink size={10} />
    </a>
  );
}

interface ChannelRowProps {
  channels?: Record<string, string>;
  channelHealth?: ChannelHealthLite;
  email: string | null;
  message: string;
  onCopy: (t: string) => void;
  label?: string;
}

function ChannelRow({
  channels,
  channelHealth,
  email,
  message,
  onCopy,
  label = "Pošalji preko:",
}: ChannelRowProps) {
  const list: Array<{
    key: string;
    healthKey: string | null;
    label: string;
    href: string;
    title: string;
  }> = [];
  const finalEmail = channels?.email ?? email;
  if (finalEmail)
    list.push({
      key: "email",
      healthKey: null,
      label: "📧 Email",
      href: `mailto:${finalEmail}`,
      title: finalEmail,
    });
  if (channels?.instagram)
    list.push({
      key: "ig",
      healthKey: "instagram",
      label: "📷 Instagram",
      href: channels.instagram,
      title: channels.instagram,
    });
  if (channels?.linkedin)
    list.push({
      key: "li",
      healthKey: "linkedin",
      label: "💼 LinkedIn",
      href: channels.linkedin,
      title: channels.linkedin,
    });
  if (channels?.facebook)
    list.push({
      key: "fb",
      healthKey: "facebook",
      label: "👥 Facebook",
      href: channels.facebook,
      title: channels.facebook,
    });
  if (channels?.tiktok)
    list.push({
      key: "tt",
      healthKey: "tiktok",
      label: "🎵 TikTok",
      href: channels.tiktok,
      title: channels.tiktok,
    });
  if (channels?.website)
    list.push({
      key: "web",
      healthKey: "website",
      label: "🌐 Web",
      href: channels.website,
      title: channels.website,
    });

  if (list.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {list.map((c) => {
        const h = c.healthKey ? channelHealth?.[c.healthKey] : undefined;
        const dead = isDead(h);
        const dormant = h?.status === "dormant";
        const tooltip = h
          ? `${h.status}${h.followers != null ? ` · ${h.followers} followers` : ""}${h.reason ? ` · ${h.reason}` : ""} · ${c.title}`
          : c.title;
        const colorClass = dead
          ? "border-danger/40 bg-danger/5 text-danger/70 hover:border-danger"
          : dormant
            ? "border-warning/40 bg-warning/5 text-warning hover:border-warning"
            : "border-border bg-bg/60 text-text-muted hover:border-gold/40 hover:text-gold";
        return (
          <a
            key={c.key}
            href={c.href}
            target={c.key === "email" ? undefined : "_blank"}
            rel={c.key === "email" ? undefined : "noreferrer"}
            title={tooltip}
            onClick={() => {
              if (c.key !== "email") void onCopy(message);
            }}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors ${colorClass}`}
          >
            {h && healthEmoji(h.status) + " "}
            {c.label}
            <ExternalLink size={10} />
          </a>
        );
      })}
    </div>
  );
}
