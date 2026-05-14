/**
 * Niche Hunter — bi-weekly viral niche drop generator.
 *
 * Runs every 14 days at 02:00 Zagreb (00:00 UTC summer / 01:00 UTC winter).
 * Pipeline (Phase 2 minimal):
 *   1. For each YouTube guru in the curated list, resolve channel +
 *      fetch latest 5 uploads (≈18 YouTube quota units / cycle, free).
 *   2. Pass titles + descriptions + view counts (NO transcripts in Phase 2 —
 *      transcripts are gnarly on Vercel serverless; YT API metadata is
 *      enough to spot patterns) to Claude Sonnet for niche extraction.
 *   3. Insert one niche_drops row per identified emerging niche, status
 *      = 'pending_review' so Leonardo approves before Skool publish.
 *
 * Phase 3 (later): add youtube-transcript fetch via dedicated Lambda or
 * Render worker; pass full transcripts to Claude Opus for deeper niche
 * mining (current titles+descriptions covers ~70% of emerging signals).
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "../client";
import {
  resolveChannel,
  fetchRecentVideos,
  type YouTubeVideo,
} from "@/lib/youtube";
import { pushTelegramNotification } from "@/app/actions/telegram";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/*
 * Curated YouTube guru watchlist — mirrors the static list rendered in
 * NicheHunterPanel.tsx. Kept in sync manually for now (low churn, ~6
 * channels). When Leonardo wants to add a guru he edits both files +
 * the cron picks it up next run.
 */
const YOUTUBE_GURUS = [
  { id: "UC1MCxPRYsKGd30E3xHMHWwA", name: "Carl Faceless" },
  { id: "UCH7DG6XLOmhqZ5P0XUIU24g", name: "Razvan Paraschiv" },
  { id: "UCp6SQfLshj-4NaykhtAF0sA", name: "Steffen Miro Extended" },
  { id: "@timdanilovhi", name: "Tim Danilov Biz" },
];

interface ExtractedNiche {
  niche_name: string;
  niche_slug: string;
  why_viral_now: string;
  first_mover_signal: string | null;
  saturation_score: number;
  source_video_ids: string[];
  hook_lines: string[];
  monetization_paths: string[];
  draft_skool_post: string;
}

/*
 * Claude prompt for niche extraction. We feed it titles + descriptions +
 * view counts from all gurus' recent uploads, ask it to identify niches
 * mentioned by 2+ gurus or showing high view-count momentum from a
 * single guru.
 */
const NICHE_PROMPT_SYSTEM = `Ti si analitičar viralnih YouTube niša za SideHustle™ Skool grupu.
Cilj: pronaći EMERGING niše koje su spomenuli više guru-a u zadnjim videima ili koje pokazuju visok view-count momentum (signal first-mover advantage).

VRATI ISKLJUČIVO JSON niz objekata, bez markdown fence-a:
[{
  "niche_name": "kratki opisni naziv niche-a (HR)",
  "niche_slug": "url-safe-engleski-slug",
  "why_viral_now": "1-2 rečenice zašto BAŠ sad (timing, trend signal)",
  "first_mover_signal": "specifičan dokaz first-mover prilike ili null",
  "saturation_score": 0-10 (0 = potpuno otvoreno, 10 = zasićeno),
  "source_video_ids": ["videoId1", "videoId2"] (koji videi su nas naveli na ovo),
  "hook_lines": ["5 video idea hook-ova na HR"],
  "monetization_paths": ["yt_shorts" | "tt_creativity" | "affiliate" | "course"],
  "draft_skool_post": "300-400 riječi gotov post za Skool — naslov, why-now, hook ideje, monetizacija, sljedeći korak"
}]

Pravila:
- Vrati 1-3 niše max po runu (kvaliteta > kvantiteta)
- Saturation_score 8+ = preskoči (zasićeno)
- Ako nema dobrih signala, vrati prazan niz []
- Hook-ovi moraju biti CRO/HR jezik za Balkan audience`;

export const nicheHunterCron = inngest.createFunction(
  {
    id: "niche-hunter-bi-weekly",
    name: "Niche Hunter — bi-weekly viral drop generator",
    retries: 1,
    triggers: [
      // Every 14 days at 02:00 Zagreb. Inngest cron is UTC-based; 00:00
      // UTC ≈ 02:00 CEST (summer). Acceptable drift in winter (01:00 UTC).
      // We pin to specific days-of-month (1, 15) so runs land predictably.
      { cron: "0 0 1,15 * *" },
    ],
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();
    const cycleId = `nh-${new Date().toISOString().slice(0, 10)}`;

    // Step 0: open run row
    await step.run("open-run", async () => {
      await supabase.from("niche_hunter_runs").upsert(
        {
          cycle_id: cycleId,
          started_at: new Date().toISOString(),
          status: "running",
        },
        { onConflict: "cycle_id" },
      );
    });

    // Step 1: fetch recent videos from each guru
    const fetchResult = await step.run("fetch-videos", async () => {
      const allVideos: YouTubeVideo[] = [];
      const errors: string[] = [];
      for (const guru of YOUTUBE_GURUS) {
        try {
          const channel = await resolveChannel(guru.id);
          if (!channel) {
            errors.push(`${guru.name}: channel resolve failed`);
            continue;
          }
          const videos = await fetchRecentVideos(channel, 5);
          allVideos.push(...videos);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${guru.name}: ${msg}`);
        }
      }
      return { videos: allVideos, errors };
    });

    if (fetchResult.videos.length === 0) {
      await step.run("close-empty", async () => {
        await supabase
          .from("niche_hunter_runs")
          .update({
            finished_at: new Date().toISOString(),
            videos_fetched: 0,
            niches_extracted: 0,
            status: "failed",
            errors: fetchResult.errors,
          })
          .eq("cycle_id", cycleId);
      });
      return { ok: false, reason: "no videos fetched", errors: fetchResult.errors };
    }

    // Step 2: Claude extracts niches
    const extracted = await step.run("extract-niches", async () => {
      if (!process.env.ANTHROPIC_API_KEY) return { niches: [], cost: 0 };
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Build compact context — videoId, channel, title, description (300
      // chars), views — to keep token count low.
      const videoLines = fetchResult.videos
        .map(
          (v) =>
            `[${v.videoId}] ${v.channelTitle} | ${v.viewCount?.toLocaleString() ?? "?"} views | ${v.title} :: ${(v.description ?? "").slice(0, 300).replace(/\n+/g, " ")}`,
        )
        .join("\n");

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: [{ type: "text", text: NICHE_PROMPT_SYSTEM }],
        messages: [
          {
            role: "user",
            content: `Zadnji ${fetchResult.videos.length} videa od ${YOUTUBE_GURUS.length} guru-a:\n\n${videoLines}\n\nIzvuci 1-3 emerging niše. Vrati JSON niz.`,
          },
        ],
      });

      const block = message.content.find((b) => b.type === "text");
      const raw = block && block.type === "text" ? block.text.trim() : "[]";
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      let niches: ExtractedNiche[] = [];
      try {
        niches = JSON.parse(cleaned) as ExtractedNiche[];
      } catch {
        niches = [];
      }

      // Approx cost: Sonnet 4 = $3/MTok input, $15/MTok output
      const cost =
        (message.usage.input_tokens / 1_000_000) * 3 +
        (message.usage.output_tokens / 1_000_000) * 15;
      return { niches, cost };
    });

    // Step 3: insert niche_drops rows
    const inserted = await step.run("insert-niches", async () => {
      let count = 0;
      for (const n of extracted.niches) {
        const sources = (n.source_video_ids ?? [])
          .map((vid) => {
            const v = fetchResult.videos.find((x) => x.videoId === vid);
            return v
              ? {
                  name: v.channelTitle,
                  video_id: vid,
                  url: v.url,
                  views: v.viewCount,
                }
              : null;
          })
          .filter(Boolean);

        const { error } = await supabase.from("niche_drops").insert({
          cycle_id: cycleId,
          niche_name: n.niche_name,
          niche_slug: n.niche_slug,
          why_viral_now: n.why_viral_now,
          first_mover_signal: n.first_mover_signal,
          saturation_score: n.saturation_score,
          source_gurus: sources,
          source_video_count: sources.length,
          hook_lines: n.hook_lines ?? [],
          monetization_paths: n.monetization_paths ?? [],
          draft_skool_post: n.draft_skool_post,
          generation_cost_usd: extracted.cost / Math.max(1, extracted.niches.length),
          status: "pending_review",
        });
        if (!error) count++;
      }
      return count;
    });

    // Step 4: close run + push notification
    await step.run("close-run", async () => {
      await supabase
        .from("niche_hunter_runs")
        .update({
          finished_at: new Date().toISOString(),
          gurus_scanned: YOUTUBE_GURUS.length,
          videos_fetched: fetchResult.videos.length,
          transcripts_pulled: 0, // Phase 3
          niches_extracted: inserted,
          total_cost_usd: extracted.cost,
          errors: fetchResult.errors,
          status: inserted > 0 ? "success" : "partial",
        })
        .eq("cycle_id", cycleId);
    });

    if (inserted > 0) {
      void pushTelegramNotification(
        "followups",
        `🎯 Niche Hunter ready: ${inserted} ${inserted === 1 ? "niche" : "niche"} čekaju review u Skool Ops → Niche Hunter (cycle ${cycleId}). Cost: $${extracted.cost.toFixed(3)}.\n\n— Jarvis`,
      );
    }

    return {
      ok: true,
      cycleId,
      videosFetched: fetchResult.videos.length,
      nichesExtracted: inserted,
      costUsd: extracted.cost,
      errors: fetchResult.errors.length,
    };
  },
);
