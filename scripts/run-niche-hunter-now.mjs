/**
 * Run Niche Hunter v2 locally — bypass Inngest cron, execute the full
 * pipeline directly (resolve channels → fetch videos → pull transcripts →
 * Claude extracts niches → print results).
 *
 * Output: PRINT to stdout (no DB write — until migration 0020 + 0023 are
 * applied in production, the inserts would fail). When migration is
 * applied, switch SAVE_TO_DB to true.
 *
 * Run:
 *   ANTHROPIC_API_KEY=... YOUTUBE_API_KEY=... node scripts/run-niche-hunter-now.mjs
 *   (auto-loaded from .env.local)
 */

import fs from "node:fs";
import path from "node:path";

// Load .env.local manually since this is a bare node script
const env = fs.readFileSync(path.resolve("./.env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SAVE_TO_DB = process.env.SAVE_TO_DB === "1";

// ── Reuse the same logic as nicheHunterCron but inline ──

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

const YOUTUBE_GURUS = [
  { id: "UC1MCxPRYsKGd30E3xHMHWwA", name: "Carl Faceless" },
  { id: "UCH7DG6XLOmhqZ5P0XUIU24g", name: "Razvan Paraschiv" },
  { id: "UCp6SQfLshj-4NaykhtAF0sA", name: "Steffen Miro Extended" },
  { id: "@timdanilovhi", name: "Tim Danilov Biz" },
];

const NICHE_SYSTEM = `Ti si analitičar viralnih YouTube niša za Leonardovu SideHustle™ Balkan Skool grupu.

# KRUCIJALNO — Audience model

Leonardov studenti su Balkanci (HR/SR/BS) koji snimaju videe za AMERIČKU publiku NA ENGLESKOM. HR market = nikakva monetizacija. US market = $5-15 CPM. Cijela strategija = produciraj za US iz Balkana.

Output jezici:
- niche_name + why_viral_now + niche_bending_explanation + draft_skool_post → HRVATSKI (za Leonardo + Skool members)
- hook_lines → ENGLESKI (za stvarne videe targetirajuće US audience)

# Niche bending framework

Uzmeš dokazano-viralnu parent vertikalu i savijaš nekim drugim kutom = novi sub-niche koji još nije saturated.

Kriteriji:
1. Parent vertikala viralna na YT/TT
2. Twist nije saturated (manje od 5 kanala)
3. Audience overlap dovoljan
4. Monetizacija clear (YT Shorts $$, TT Creativity, affiliate, course)
5. 7 videa/tj bez burnout-a

# Output — STROGI JSON niz (bez markdown wrap-a), 1-3 niše:

[{
  "niche_name": "kratki HR opis",
  "niche_slug": "url-safe-en-slug",
  "why_viral_now": "HR · 1-2 rečenice timing signal",
  "first_mover_signal": "HR · konkretan dokaz ili null",
  "saturation_score": 0-10,
  "source_video_ids": ["videoId1"],
  "hook_lines": ["5 ENGLISH hooks (US audience), pattern-interrupt"],
  "monetization_paths": ["yt_shorts","tt_creativity","affiliate","course"],
  "draft_skool_post": "HR · 300-400 riječi za Leonardov Skool community",
  "niche_bending_explanation": "HR · parent + twist + zašto radi za US audience"
}]

Pravila: saturation 8+ preskoči. Empty [] ako nema signala. **hook_lines OBAVEZNO ENGLESKI** (US audience), ostalo HR.`;

async function ytFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

async function resolveChannel(identifier) {
  const key = process.env.YOUTUBE_API_KEY;
  const url = new URL(`${YT_API_BASE}/channels`);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  if (identifier.startsWith("UC") && identifier.length > 20) {
    url.searchParams.set("id", identifier);
  } else if (identifier.startsWith("@")) {
    url.searchParams.set("forHandle", identifier);
  } else {
    url.searchParams.set("forUsername", identifier);
  }
  url.searchParams.set("key", key);
  const data = await ytFetch(url);
  const item = data?.items?.[0];
  if (!item) return null;
  return {
    channelId: item.id,
    channelTitle: item.snippet?.title,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? "",
    subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : null,
  };
}

async function fetchRecentVideos(channel, max = 5) {
  if (!channel.uploadsPlaylistId) return [];
  const key = process.env.YOUTUBE_API_KEY;
  const listUrl = new URL(`${YT_API_BASE}/playlistItems`);
  listUrl.searchParams.set("part", "snippet,contentDetails");
  listUrl.searchParams.set("playlistId", channel.uploadsPlaylistId);
  listUrl.searchParams.set("maxResults", String(max));
  listUrl.searchParams.set("key", key);
  const listData = await ytFetch(listUrl);
  const items = listData?.items ?? [];
  const ids = items.map((i) => i.contentDetails?.videoId ?? i.snippet?.resourceId?.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const statsUrl = new URL(`${YT_API_BASE}/videos`);
  statsUrl.searchParams.set("part", "statistics,contentDetails");
  statsUrl.searchParams.set("id", ids.join(","));
  statsUrl.searchParams.set("key", key);
  const statsData = await ytFetch(statsUrl);
  const statsMap = new Map();
  for (const v of statsData?.items ?? []) {
    statsMap.set(v.id, {
      viewCount: v.statistics?.viewCount ? parseInt(v.statistics.viewCount, 10) : null,
      likeCount: v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : null,
      commentCount: v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : null,
      duration: v.contentDetails?.duration ?? null,
    });
  }

  return items.map((it) => {
    const vid = it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId;
    const s = statsMap.get(vid);
    return {
      videoId: vid,
      title: it.snippet?.title ?? "",
      description: it.snippet?.description ?? "",
      publishedAt: it.snippet?.publishedAt ?? "",
      channelTitle: it.snippet?.channelTitle ?? channel.channelTitle,
      viewCount: s?.viewCount ?? null,
      likeCount: s?.likeCount ?? null,
      commentCount: s?.commentCount ?? null,
      url: `https://www.youtube.com/watch?v=${vid}`,
    };
  });
}

// ── Transcript fetcher (youtube-transcript) ──
const { YoutubeTranscript } = await import("youtube-transcript");

async function fetchTranscript(videoId) {
  const langs = ["en", "hr", "sr", "bs", "de", "ru", "ro"];
  for (const lang of langs) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (items && items.length > 0) {
        const text = items.map((i) => i.text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim()).filter(Boolean).join(" ");
        return { videoId, text, language: lang };
      }
    } catch {
      continue;
    }
  }
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      return { videoId, text: items.map((i) => i.text.trim()).join(" "), language: "auto" };
    }
  } catch {}
  return null;
}

// ── Main run ──
console.log("[niche-hunter] Starting v2 local run...");
const allVideos = [];
for (const g of YOUTUBE_GURUS) {
  process.stdout.write(`[fetch] ${g.name}... `);
  try {
    const ch = await resolveChannel(g.id);
    if (!ch) {
      console.log("FAIL (no channel)");
      continue;
    }
    const videos = await fetchRecentVideos(ch, 5);
    allVideos.push(...videos);
    console.log(`${videos.length} videa (${ch.subscriberCount?.toLocaleString() ?? "?"} subs)`);
  } catch (e) {
    console.log(`FAIL: ${e.message}`);
  }
}

console.log(`\n[niche-hunter] ${allVideos.length} videos total. Fetching transcripts...`);

const transcripts = [];
for (const v of allVideos) {
  process.stdout.write(`  ${v.videoId} ${v.title.slice(0, 50)}... `);
  const tx = await fetchTranscript(v.videoId);
  transcripts.push(tx);
  console.log(tx ? `OK (${tx.language}, ${tx.text.length} chars)` : "no transcript");
}

const txCount = transcripts.filter((t) => t).length;
console.log(`\n[niche-hunter] ${txCount}/${allVideos.length} transcripts pulled.`);

// ── Claude analysis ──
console.log("[niche-hunter] Calling Claude Sonnet for niche extraction...");

const ctxLines = allVideos
  .map((v, i) => {
    const tx = transcripts[i];
    const snip = tx?.text ? (tx.text.length > 3000 ? tx.text.slice(0, 3000) + " ... [truncated]" : tx.text) : "(no transcript)";
    return `## [${v.videoId}] ${v.channelTitle}
Title: ${v.title}
Views: ${v.viewCount?.toLocaleString() ?? "?"}
Description: ${(v.description ?? "").slice(0, 400)}
Transcript (${tx?.language ?? "n/a"}):
${snip}`;
  })
  .join("\n\n---\n\n");

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const userMsg = `Pročitaj transkripte od ${allVideos.length} videa s ${YOUTUBE_GURUS.length} guru kanala (${txCount} transkripata uspješno dohvaćeno).

# Video data:

${ctxLines}

---

Vrati JSON niz (nema fence-a) s 1-3 niše. Svaka MORA imati niche_bending_explanation polje.`;

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 8192,
  system: [{ type: "text", text: NICHE_SYSTEM }],
  messages: [{ role: "user", content: userMsg }],
});

const block = message.content.find((b) => b.type === "text");
const raw = block && block.type === "text" ? block.text.trim() : "[]";
const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

let niches = [];
try {
  niches = JSON.parse(cleaned);
} catch (e) {
  console.error("[niche-hunter] JSON parse failed. Raw output:");
  console.error(raw);
  process.exit(1);
}

const cost = (message.usage.input_tokens / 1_000_000) * 3 + (message.usage.output_tokens / 1_000_000) * 15;

console.log(`\n[niche-hunter] Extracted ${niches.length} niše. Cost: $${cost.toFixed(3)}`);
console.log("=".repeat(70));

for (const [i, n] of niches.entries()) {
  console.log(`\n## ${i + 1}. ${n.niche_name}  (saturation ${n.saturation_score}/10)`);
  console.log(`\n**Why viral now:** ${n.why_viral_now}`);
  if (n.first_mover_signal) console.log(`\n**First-mover signal:** ${n.first_mover_signal}`);
  console.log(`\n**Niche bending:** ${n.niche_bending_explanation ?? "(not provided)"}`);
  console.log(`\n**Hook ideas:**`);
  for (const h of n.hook_lines ?? []) console.log(`  - ${h}`);
  console.log(`\n**Monetization:** ${(n.monetization_paths ?? []).join(", ")}`);
  console.log(`\n**Skool post draft:**`);
  console.log(n.draft_skool_post);
  console.log("\n" + "-".repeat(70));
}

// Save to a markdown file for easy reading
const outPath = path.resolve(`./outputs/niche-drop-${new Date().toISOString().slice(0, 10)}.md`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const md = niches
  .map(
    (n, i) =>
      `# ${i + 1}. ${n.niche_name}\n\n**Saturation:** ${n.saturation_score}/10\n\n**Why viral now:** ${n.why_viral_now}\n\n**First-mover signal:** ${n.first_mover_signal ?? "(none)"}\n\n**Niche bending explanation:** ${n.niche_bending_explanation ?? "(not provided)"}\n\n## Hook ideas\n${(n.hook_lines ?? []).map((h) => `- ${h}`).join("\n")}\n\n**Monetization:** ${(n.monetization_paths ?? []).join(", ")}\n\n## Skool post draft\n\n${n.draft_skool_post}\n`,
  )
  .join("\n\n---\n\n");
fs.writeFileSync(outPath, md, "utf8");
console.log(`\n[niche-hunter] MD output written to ${outPath}`);

console.log("\n[niche-hunter] Done.");
process.exit(0);
