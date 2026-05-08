"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, Send, X as XIcon, Mail, Copy, Check } from "lucide-react";
import {
  generateColdDrafts,
  approveAndSendDraft,
  editPendingDraft,
  dismissPendingDraft,
  getPendingColdDrafts,
  type PendingColdDraft,
} from "@/app/actions/outreach";
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
                      <span className="rounded border border-border bg-bg/60 px-1.5 py-0.5 text-[10px] text-text-muted">
                        {PLATFORM_LABELS[platform] ?? platform}
                      </span>
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
                  <label className="block text-[10px] uppercase tracking-wider text-text-muted">
                    Poruka
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [d.id]: e.target.value }))
                    }
                    rows={Math.min(12, Math.max(5, text.split("\n").length + 1))}
                    className="mt-1 w-full rounded border border-border bg-bg/60 px-3 py-2 text-xs text-text font-mono focus:border-gold/40 focus:outline-none"
                  />
                </div>

                {d.reasoning && (
                  <p className="mt-2 text-[11px] italic text-text-dim">
                    💡 Hook: {d.reasoning}
                  </p>
                )}

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
