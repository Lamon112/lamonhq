"use client";

import { useEffect, useState, useTransition } from "react";
import { AtSign, Sparkles, Send, CheckCircle } from "lucide-react";
import {
  generateLinkedInPost,
  approveLinkedInPost,
  type LinkedInPost,
} from "@/app/actions/linkedinPosts";

export function LinkedInLabPanel() {
  const [posts, setPosts] = useState<LinkedInPost[] | null>(null);
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [audience, setAudience] = useState("B2B premium klinike Hrvatska");
  const [isPending, startTransition] = useTransition();
  const [lastGen, setLastGen] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/linkedin-lab/list").then((r) => r.json());
    setPosts(r.posts ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleGenerate() {
    if (!topic.trim()) return;
    startTransition(async () => {
      const result = await generateLinkedInPost({ topic, angle, audience });
      if (result.ok) {
        setLastGen(`✓ ${result.count} varijanti · $${result.cost.toFixed(3)}`);
        setTopic("");
        setAngle("");
        refresh();
      } else {
        setLastGen(`✗ ${result.error}`);
      }
    });
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveLinkedInPost(id);
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 via-bg-card/60 to-bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-400/50 bg-cyan-500/15">
            <AtSign size={22} className="text-cyan-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text">LinkedIn Lab</h3>
            <p className="mt-1 text-sm text-text-muted">
              Generator 3 varijante po temi (hook / story / contrarian).
              Sonnet output u tvojem brand glasu (peer-level HR/EN mix, no
              submissive lang, konkretni brojevi, assumptive close).
            </p>
          </div>
        </div>
      </div>

      {/* Generator form */}
      <div className="rounded-lg border border-border bg-bg-card/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase text-text-muted">
          ✨ Nova objava
        </p>
        <div className="space-y-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema (npr. 'AI gatekeeper za premium klinike')"
            className="w-full rounded border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text"
          />
          <input
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="Angle (npr. 'Contrarian: ne trebaš više leadova, trebaš filter')"
            className="w-full rounded border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text"
          />
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Audience"
            className="w-full rounded border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text"
          />
          <button
            onClick={handleGenerate}
            disabled={isPending || !topic.trim()}
            className="w-full rounded border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {isPending ? "Generiram..." : "Generiraj 3 varijante"}
          </button>
          {lastGen && (
            <p className="text-[11px] text-text-muted">{lastGen}</p>
          )}
        </div>
      </div>

      {/* Posts list */}
      {posts === null ? (
        <div className="text-xs text-text-muted">Učitavam...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card/40 p-6 text-center text-xs text-text-muted">
          Još nijedna LinkedIn objava nije generirana.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-bg-card/40 p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-cyan-200">
                    {p.variant_kind}
                  </span>
                  <span className="text-text-dim">{p.topic}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Sparkles size={10} className="text-cyan-300" />
                  <span className="font-mono text-cyan-200">v{p.viral_prediction?.toFixed(1) ?? "?"}</span>
                  <span className="ml-1 font-mono text-emerald-200">c{p.conversion_prediction?.toFixed(1) ?? "?"}</span>
                </div>
              </div>
              <pre className="whitespace-pre-wrap rounded bg-bg-elevated/50 p-2 font-mono text-[11px] text-text">
                {p.body}
              </pre>
              {p.hashtags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.hashtags.map((h) => (
                    <span key={h} className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-200">
                      #{h}
                    </span>
                  ))}
                </div>
              )}
              {p.rationale && (
                <p className="mt-2 text-[11px] italic text-text-muted">
                  {p.rationale}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] uppercase text-text-dim">{p.status.replace("_", " ")}</span>
                {p.status === "pending_review" && (
                  <button
                    onClick={() => handleApprove(p.id)}
                    className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <CheckCircle size={10} />
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
