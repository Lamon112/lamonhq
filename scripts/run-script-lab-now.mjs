/**
 * Generate weekly video scripts locally — mirrors Baywash structure.
 *
 * Pulls latest niche drops from Supabase niche_drops (via REST + anon
 * key), Leonardov methodology + Baywash structure as Claude system
 * context, generates 5-7 ready-to-shoot scripts.
 *
 * Two account flavors:
 *   - @lamon.leonardo (HR · Plima B2B)
 *   - @sidequestshr (EN · SideHustle US audience for view monetization)
 *
 * Output: outputs/scripts-YYYY-MM-DD.md (full Baywash-style detail per script)
 *
 * Run: node scripts/run-script-lab-now.mjs
 */

import fs from "node:fs";
import path from "node:path";

// Load .env.local
const env = fs.readFileSync(path.resolve("./.env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Pull latest approved/pending niche drops from Supabase to seed script gen
async function fetchLatestNiches() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/niche_drops?select=niche_name,why_viral_now,hook_lines,monetization_paths,niche_bending_explanation,saturation_score&order=created_at.desc&limit=5`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

const SCRIPT_SYSTEM = `Ti si Leonardov Chief Content Officer. Generiraš video skripte za sljedeći tjedan, mirroring strukturu koju je Leo zadnji put koristio za Baywash skripte (best-practice format).

# AUDIENCE STRATEGIJA — KRUCIJALNO

Imaš DVA paralelna kanala:

**A) @lamon.leonardo (HR · Plima B2B brand)**
- Audience: HR vlasnici premium dental/estetic klinika
- Jezik: HRVATSKI
- CTA: "Pošalji DEMO na DM" ili "bukiraj Zoom 15 min"
- Goal: discovery call → Plima paket close

**B) @sidequestshr (US · SideHustle B2C)**
- Audience: US/global side-hustlers (Balkanci snimaju za US monetizirano YT/TT)
- Jezik: ENGLISH (HR audience nema CPM, US ima $5-15)
- CTA: "Comment X to get the framework" + skool.com/sidehustlehr link
- Goal: viral views → Skool join (€50/mj)

Svaka skripta MORA biti targetirana na jedan od ovih kanala, ne miješati.

# BAYWASH STRUKTURA (mirror this depth)

Svaka skripta ima:
1. **title** — narrative hook ("Najgori auto u 12 godina detailinga")
2. **target_account** — "@lamon.leonardo" ili "@sidequestshr"
3. **target_language** — "hr" ili "en"
4. **target_audience** — "hr_b2b" ili "us_global"
5. **slot_label** — kada se objavljuje (npr. "PON 19:00 Edukativni Short")
6. **duration_estimate_sec** — 20-90s
7. **hook_formula** — taxonomy: "autoritet", "contrast", "numerical", "anti-status", "curiosity-gap", "stat-shock", "pattern-interrupt", "social-proof"
8. **script_goal** — "viral_reach" | "conversion" | "brand_pillar" | "low_barrier_entry" | "social_proof"
9. **mix_tag** — "drama" | "conversion" | "edu" | "pillar"
10. **hook_3sec** — exact prva rečenica (na ciljanom jeziku)
11. **narration_md** — VERBATIM full voiceover, sa stage directions u italici (\\*pauza, gleda u kameru\\*), pauze označene
12. **broll_timeline_md** — markdown lista per-second editor instructions:
    - **0-4s:** "..." → top broll = ...
    - **4-8s:** "..." → top broll = ...
13. **text_overlays_md** — markdown lista burned subs s timestampima
14. **caption_md** — finalni post caption (na ciljanom jeziku) + hashtags
15. **production_notes_md** — markdown bullets: zašto OVAJ format radi, što tweak-ati, alternative
16. **viral_prediction** — 0-10
17. **conversion_prediction** — 0-10
18. **rationale** — 1-2 rečenice na HR-u zašto baš ovaj format ovaj tjedan

# Leonardov methodology (10 Zlatnih Pravila)
1. Hook 3sek = stat shock ili pattern interrupt
2. Vertikalno 9:16 default
3. Burned-in subs obavezno
4. Storytelling > educational (Setup → Problem → Twist → Lekcija → CTA)
5. Loop-able final frame
6. CTA = comment trigger ne follow
7. Tema = problem koji target rješava DANAS
8. Cadence > savršenstvo
9. Cross-platform 24h window
10. View-through rate 75%+ cilj

# Output

STROGI JSON niz, bez markdown wrap-a, bez extra teksta. 5-7 skripti pokriva cijeli tjedan (PON-NED). Mix po kanalu: 3-4 za @sidequestshr (US viralni), 2-3 za @lamon.leonardo (HR B2B). Svaka skripta MORA imati SVA polja od 1-18.

NEMA placeholdera — svako polje ispunjeno konkretno. broll_timeline mora imati per-second timestamps. narration mora biti spreman za Max/Leo da pročita pred kameru.`;

const niches = await fetchLatestNiches();
console.log(`[script-lab] Pulled ${niches.length} niches as seed context`);

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const userMsg = `Generiraj 5-7 video skripti za sljedeći tjedan (PON-NED).

# Najnoviji niche drops iz Niche Hunter-a (cross-pollinate u skripte za @sidequestshr ako relevant)
${niches.length > 0 ? niches.map(n => `## ${n.niche_name} (sat ${n.saturation_score}/10)
${n.why_viral_now}
Niche bending: ${n.niche_bending_explanation ?? "(n/a)"}
Hook ideje: ${(n.hook_lines ?? []).slice(0, 3).join(" / ")}`).join("\n\n") : "(nema niche drop-ova)"}

# Plima B2B context za @lamon.leonardo skripte
- Premium klinike (≥15 leadova/mj) bottleneck = filter, ne volumen
- Leonardo angle: AI gatekeeper Riva pred receptionkom
- Case studies: Visodent (planiran), Stomalux (planiran)
- CTA discovery call (15min, no pricing in video)

# SideHustle B2C context za @sidequestshr skripte
- US audience, monetiziran YT Shorts ($5-15 CPM)
- Hook 3sek u stat shock ili pattern interrupt na ENGLESKOM
- CTA komentar trigger + Skool link
- 165 paying members u Skoolu, neki rade $15K+/mj
- Top performers: Tom (€17K u 3mj), Matija (€3K/mj u 2mj)

Vrati JSON niz s 5-7 skripti koje pokrivaju cijeli tjedan, mix balansiran po cilju (viral / conversion / brand_pillar). Svaka skripta MORA imati SVA polja iz system prompt-a 1-18, bez placeholdera.`;

console.log("[script-lab] Calling Claude Sonnet 4.5...");

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 16000,
  system: [{ type: "text", text: SCRIPT_SYSTEM }],
  messages: [{ role: "user", content: userMsg }],
});

const block = message.content.find((b) => b.type === "text");
const raw = block && block.type === "text" ? block.text.trim() : "[]";
const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

let scripts = [];
try {
  scripts = JSON.parse(cleaned);
} catch (e) {
  console.error("[script-lab] JSON parse failed. Raw output:");
  console.error(raw.slice(0, 1000));
  process.exit(1);
}

const cost = (message.usage.input_tokens / 1_000_000) * 3 + (message.usage.output_tokens / 1_000_000) * 15;

console.log(`\n[script-lab] Generated ${scripts.length} scripts. Cost: $${cost.toFixed(3)}`);
console.log("=".repeat(70));

// Write to MD file in Baywash style
const today = new Date().toISOString().slice(0, 10);
const outPath = path.resolve(`./outputs/scripts-${today}.md`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

let md = `# Script Lab — ${today}\n\n`;
md += `> ${scripts.length} skripti generirano · Cost $${cost.toFixed(3)} · Mirror Baywash structure (top-broll/bottom-talent 50/50, narration s stage directions, per-second editor timeline)\n\n`;

// Pregled tablica
md += `## 📋 Pregled\n\n`;
md += `| # | Slot | Account | Lang | Cilj | Hook formula | Dužina | Mix |\n`;
md += `|---|---|---|---|---|---|---|---|\n`;
scripts.forEach((s, i) => {
  md += `| ${i + 1} | ${s.slot_label ?? "?"} | ${s.target_account ?? "?"} | ${s.target_language ?? "?"} | ${s.script_goal ?? "?"} | ${s.hook_formula ?? "?"} | ${s.duration_estimate_sec ?? "?"}s | ${s.mix_tag ?? "?"} |\n`;
});
md += `\n---\n\n`;

// Per-script detail
scripts.forEach((s, i) => {
  md += `## 🎬 SKRIPTA ${i + 1} — "${s.title ?? "?"}"\n\n`;
  md += `**Account:** ${s.target_account} | **Language:** ${s.target_language} | **Audience:** ${s.target_audience}\n`;
  md += `**Slot:** ${s.slot_label} | **Duration:** ${s.duration_estimate_sec}s | **Mix:** ${s.mix_tag}\n`;
  md += `**Hook formula:** ${s.hook_formula} | **Goal:** ${s.script_goal}\n`;
  md += `**Viral prediction:** ${s.viral_prediction}/10 · **Conversion:** ${s.conversion_prediction}/10\n\n`;
  md += `**Hook 3-sec:**\n> ${s.hook_3sec}\n\n`;
  md += `### Narration\n${s.narration_md ?? "(missing)"}\n\n`;
  md += `### Top-broll timeline\n${s.broll_timeline_md ?? "(missing)"}\n\n`;
  md += `### Text overlays\n${s.text_overlays_md ?? "(missing)"}\n\n`;
  md += `### Caption\n${s.caption_md ?? "(missing)"}\n\n`;
  md += `### Production notes\n${s.production_notes_md ?? "(missing)"}\n\n`;
  md += `**Rationale:** ${s.rationale}\n\n---\n\n`;
});

fs.writeFileSync(outPath, md, "utf8");
console.log(`\n[script-lab] Output written to ${outPath}`);
console.log(`\n[script-lab] First 2 scripts preview:\n`);
scripts.slice(0, 2).forEach((s, i) => {
  console.log(`#${i + 1} [${s.target_account}] ${s.title}`);
  console.log(`  Hook: ${s.hook_3sec?.slice(0, 100)}`);
  console.log(`  Viral: ${s.viral_prediction}/10 · Conv: ${s.conversion_prediction}/10\n`);
});
