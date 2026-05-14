/**
 * Niche Hunter v2 — bi-weekly viral niche drop generator with full
 * transcript ingestion + niche bending analysis.
 *
 * Per Leonardov 2026-05-14 directive:
 *   "Niche Hunter znaci zelim da pregeldas sve kanale i sve videe koje
 *    su napravili, skini njihovu transkriptu svakog videa da isto tako
 *    mozes razumijeti sta znaci niche bending, i da mozes pomocu svih
 *    njihovih informacija traziti niche-eve, isto tako gledati slicne
 *    kanale i upijati info. Danas trebamo prvi niche Hunter odraditi."
 *
 * Pipeline:
 *   1. Resolve channels for curated guru list (Carl Faceless, Razvan,
 *      Steffen Miro, Tim Danilov + future expansion)
 *   2. For each guru, fetch latest 5 videos via YT Data API v3
 *   3. For each video, pull verbatim transcript (youtube-transcript)
 *      with multi-language fallback
 *   4. Pass ALL transcripts + video metadata to Claude Sonnet as one
 *      analysis batch with niche-bending framework baked into prompt
 *   5. Extract 1-3 emerging niches per cycle:
 *      - niche_name + slug
 *      - why_viral_now (timing signal)
 *      - first_mover_signal (specific evidence)
 *      - saturation_score (0-10)
 *      - hook_lines (5 video idea hooks in HR)
 *      - monetization_paths (yt_shorts | tt_creativity | affiliate | course)
 *      - draft_skool_post (300-400 word Skool community post)
 *      - source_video_ids (which videos contributed)
 *   6. Insert into niche_drops + Jarvis alert
 *
 * Cron: every 14 days at 02:00 Zagreb (1,15 of month at 00:00 UTC).
 * Can be triggered manually via Inngest "Run now" or POST /api/triggers/niche-hunter
 *
 * Cost: Sonnet 4 ~$0.30-0.80 per run (transcripts add ~50K input tokens).
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "../client";
import { resolveChannel, fetchRecentVideos, type YouTubeVideo } from "@/lib/youtube";
import { fetchTranscriptsBatch, type VideoTranscript } from "@/lib/youtubeTranscript";
import { pushTelegramNotification } from "@/app/actions/telegram";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/*
 * Curated YouTube guru watchlist — kept in sync with NicheHunterPanel.tsx.
 * These are DEEP-DIVER YouTube biznis creators (channel-flipping, faceless
 * automation, niche-bending tutorials) — overlap s Balkan / EU side-hustle
 * audience.
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
  niche_bending_explanation?: string;
}

const NICHE_PROMPT_SYSTEM = `Ti si analitičar viralnih YouTube niša za Leonardovu SideHustle™ Balkan Skool grupu (B2C side-hustle education).

Cilj: pronaći 1-3 EMERGING niše baziranih na analizi transkripata trenutnih top YouTube biznis guru-a.

# Niche bending framework (znaš ga jer si pročitao transkripte)

Niche bending = strategija da uzmeš već-zasićenu vertikalu (npr. "history shorts") i savijaš je nekim drugim kutom (npr. "Roman history × stoic philosophy × modern career advice") da napraviš novi sub-niche koji je još otvoren ali ima provjeren format.

Kriteriji za jaku niche bend:
1. Bazna vertikala (parent niche) je dokazano viralna na YT/TT (provjereni format)
2. Specifični twist nije saturated (manje od 5 kanala već radi to)
3. Audience overlap iz parent niche je dovoljno velik da postoji baza gledatelja
4. Monetizacija je clear (YT Shorts revenue, TT Creativity Program, affiliate, course)
5. Možeš snimiti 7 videa tjedno bez burnout-a (long-tail topics)

# Što tražim u transkriptima (signal za niche bend)

- Guru spominje konkretne brojeve (npr. "kanal radi €5K/mj sa 50 videa")
- Guru pokazuje strategiju savijanja niše (parent + twist)
- Više guru-a spominje istu emerging temu u 14d window-u → confidence signal
- Konkretne case-study brojke kanala koji eksperimentira
- AI tools koji omogućavaju nove niche-ve (HeyGen, RunwayML, ElevenLabs, etc.)

# Output

Vrati STROGI JSON niz (nema markdown wrap-a, nema dodatnog teksta), 1-3 niše:

[{
  "niche_name": "kratki HR opis (npr. 'AI Roman History Shorts')",
  "niche_slug": "ai-roman-history-shorts",
  "why_viral_now": "1-2 rečenice s timing signalom (zašto BAŠ sad — algorithm, AI tools, kulturni moment)",
  "first_mover_signal": "konkretan signal (npr. 'samo 2 kanala već rade to, oba ispod 50K subs') ili null",
  "saturation_score": 0-10 (0=otvoreno, 10=zasićeno; preskoči 8+),
  "source_video_ids": ["videoId1", "videoId2"] (koji su te transkripti naveli na ovo),
  "hook_lines": [
    "5 video idea hook-ova na HR, pattern-interrupt stil",
    "primjer: 'Caesar je imao 27 godina kad je platio dug koji ti danas dugiš banci'"
  ],
  "monetization_paths": ["yt_shorts", "tt_creativity", "affiliate", "course"],
  "draft_skool_post": "300-400 riječi gotov post za Skool community na HR — naslov, why-now, 5 hook ideja, monetizacija, sljedeći korak (snimaj 7 videa, post tjedan, mjeri retention)",
  "niche_bending_explanation": "objasni KAKO si savio niše — koja je parent vertikala + koji je twist + zašto kombinacija radi"
}]

Pravila:
- 1-3 niše max (kvaliteta > kvantitet)
- Saturation_score 8+ = NE vraćaj (preskoči)
- Ako iz transkripata nema dobrih signala → vrati prazan niz []
- Hook-ovi MORAJU biti CRO/HR jezik za Balkan audience, ne EN prevedeno
- niche_bending_explanation je obavezan da Leonardo nauči pattern`;

export const nicheHunterCron = inngest.createFunction(
  {
    id: "niche-hunter-bi-weekly",
    name: "Niche Hunter — bi-weekly viral drop (transcripts + niche bending)",
    retries: 1,
    triggers: [
      { cron: "0 0 1,15 * *" }, // 1st + 15th of each month at 00:00 UTC
      { event: "niche-hunter.run" }, // manual trigger via inngest.send()
    ],
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();
    const cycleId = `nh-${new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "")}`;

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

    // Step 1: resolve channels + fetch videos
    const allVideos = await step.run("fetch-videos", async () => {
      const out: YouTubeVideo[] = [];
      for (const guru of YOUTUBE_GURUS) {
        try {
          const ch = await resolveChannel(guru.id);
          if (!ch) continue;
          const videos = await fetchRecentVideos(ch, 5);
          out.push(...videos);
        } catch (e) {
          console.warn(`[niche-hunter] ${guru.name}:`, e instanceof Error ? e.message : e);
        }
      }
      return out;
    });

    if (allVideos.length === 0) {
      await supabase
        .from("niche_hunter_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: "failed",
          errors: ["no videos fetched from any guru"],
        })
        .eq("cycle_id", cycleId);
      return { ok: false, reason: "no videos fetched" };
    }

    // Step 2: fetch transcripts (with concurrency limit)
    const transcripts = await step.run("fetch-transcripts", async () => {
      const ids = allVideos.map((v) => v.videoId);
      const tx = await fetchTranscriptsBatch(ids, {
        concurrency: 3,
        perVideoTimeoutMs: 25_000,
      });
      return tx;
    });

    const enrichedVideos = allVideos.map((v, i) => ({
      ...v,
      transcript: transcripts[i],
    }));

    const transcriptCount = enrichedVideos.filter((v) => v.transcript).length;

    // Step 3: Claude analyzes transcripts + extracts niches
    const extracted = await step.run("claude-extract", async () => {
      if (!process.env.ANTHROPIC_API_KEY) return { niches: [], cost: 0 };
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Build batched analysis context — truncate each transcript to keep
      // total context manageable (~50K tokens budget for input).
      const ctxLines = enrichedVideos
        .map((v) => {
          const tx = v.transcript;
          const txSnippet = tx?.text
            ? tx.text.length > 3000
              ? tx.text.slice(0, 3000) + " ... [truncated]"
              : tx.text
            : "(no transcript available)";
          return `## [${v.videoId}] ${v.channelTitle}
Title: ${v.title}
Views: ${v.viewCount?.toLocaleString() ?? "?"} | Duration: ${v.durationSeconds ?? "?"}s
Description: ${(v.description ?? "").slice(0, 400)}
Transcript (${tx?.language ?? "n/a"}):
${txSnippet}`;
        })
        .join("\n\n---\n\n");

      const userMsg = `Pročitaj transkripte od ${enrichedVideos.length} videa s ${YOUTUBE_GURUS.length} guru kanala (${transcriptCount} transkripata uspješno dohvaćeno).

Tvoj zadatak: analiziraj o ČEMU oni pričaju, koje strategije podučavaju, koje konkretne case-studie spominju. Onda primijeni niche bending framework iz system prompt-a i identificiraj 1-3 emerging niše koje Leonardo može targetirati za @sidequestshr / @sidehustlebalkan.

# Video data:

${ctxLines}

---

Vrati JSON niz (nema fence-a) s 1-3 niše. Svaka MORA imati niche_bending_explanation polje da Leonardo nauči pattern.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: [{ type: "text", text: NICHE_PROMPT_SYSTEM }],
        messages: [{ role: "user", content: userMsg }],
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
      } catch (e) {
        console.warn("[niche-hunter] JSON parse failed:", e);
      }

      const cost =
        (message.usage.input_tokens / 1_000_000) * 3 +
        (message.usage.output_tokens / 1_000_000) * 15;
      return { niches, cost };
    });

    // Step 4: insert niche_drops
    const inserted = await step.run("insert-niches", async () => {
      let count = 0;
      const perCost = extracted.cost / Math.max(1, extracted.niches.length);
      for (const n of extracted.niches) {
        const sources = (n.source_video_ids ?? [])
          .map((vid) => {
            const v = enrichedVideos.find((x) => x.videoId === vid);
            return v
              ? {
                  name: v.channelTitle,
                  video_id: vid,
                  url: v.url,
                  views: v.viewCount,
                  has_transcript: !!v.transcript,
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
          draft_skool_post:
            (n.niche_bending_explanation
              ? `**Niche bending razlog:** ${n.niche_bending_explanation}\n\n---\n\n`
              : "") + n.draft_skool_post,
          generation_cost_usd: perCost,
          status: "pending_review",
        });
        if (!error) count++;
      }
      return count;
    });

    // Step 5: close run + push notification
    await step.run("close-run", async () => {
      await supabase
        .from("niche_hunter_runs")
        .update({
          finished_at: new Date().toISOString(),
          gurus_scanned: YOUTUBE_GURUS.length,
          videos_fetched: allVideos.length,
          transcripts_pulled: transcriptCount,
          niches_extracted: inserted,
          total_cost_usd: extracted.cost,
          status: inserted > 0 ? "success" : "partial",
        })
        .eq("cycle_id", cycleId);
    });

    if (inserted > 0) {
      void pushTelegramNotification(
        "followups",
        `🧭 Niche Hunter: ${inserted} ${inserted === 1 ? "niche" : "niche"} čeka review (cycle ${cycleId}).\n\n📊 ${transcriptCount}/${allVideos.length} transkripata uspješno dohvaćeno.\n💰 Cost: $${extracted.cost.toFixed(3)}\n\nOtvori Vault → Hunter ili Headquarters → Niche Hunter.\n\n— Jarvis`,
      );
    }

    return {
      ok: true,
      cycleId,
      gurusScanned: YOUTUBE_GURUS.length,
      videosFetched: allVideos.length,
      transcriptsPulled: transcriptCount,
      nichesExtracted: inserted,
      costUsd: extracted.cost,
    };
  },
);
