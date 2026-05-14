/**
 * Script Generator — weekly cron that reads the top-performing videos
 * from video_intel + Niche Hunter latest drops + Leonardov methodology
 * (10 Zlatnih Pravila), and outputs 5-7 ready-to-shoot scripts for
 * the upcoming week.
 *
 * Leonardo's directive (2026-05-14):
 *   "napravi generator skripti za moje videe, istraži sva moja
 *    funkcioniraju vs ne, generiraj skripte za tjedan s najvećom
 *    viral + konverzijskom potencijalnošću, pronađi gdje sam 10x
 *    najviralniji s @lamon.leonardo i @sidequestshr"
 *
 * Pipeline:
 *   1. Fetch top-10x videos from video_intel (both accounts)
 *   2. Fetch pending niche drops (cross-pollinate niche-finder output)
 *   3. Claude Sonnet generates 5-7 scripts following the channel cadence
 *      (PON edukativni, UTO live, SRI case study, ČET testimonial,
 *      PET community shoutout) — uses real 10x examples as borrowing source
 *   4. Insert into video_scripts table, status='pending_review'
 *   5. Push Jarvis alert with link to Script Lab room
 *
 * Cost: Sonnet 4 ~$0.10-0.30 per run (one batched generation call).
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "../client";
import { pushTelegramNotification } from "@/app/actions/telegram";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface VideoIntelRow {
  id: string;
  platform: string;
  account_handle: string;
  url: string;
  title: string;
  description: string;
  view_count: number | null;
  viral_multiplier: number | null;
  is_top_10x: boolean;
  hook_pattern: string | null;
}

interface NicheDrop {
  niche_name: string;
  why_viral_now: string;
  hook_lines: string[];
  monetization_paths: string[];
}

interface GeneratedScript {
  target_platform: "youtube" | "tiktok" | "instagram" | "cross";
  target_account: string;
  slot_label: string;
  title: string;
  hook_3sec: string;
  body_structure: string;
  full_script: string;
  cta: string;
  duration_estimate_sec: number;
  hashtags: string[];
  on_screen_text: string[];
  viral_prediction: number;
  conversion_prediction: number;
  borrowed_from: string[]; // video_intel.id refs
  rationale: string;
}

const SCRIPT_SYSTEM_PROMPT = `Ti si Leonardov Chief Content Officer za @lamon.leonardo (B2B Plima brand) i @sidequestshr (B2C SideHustle™ Balkan brand).

Generiraš 5-7 video skripti za sljedeći tjedan, optimiziranih za viralnu retenciju + konverziju u Skool grupu (skool.com/sidehustlehr).

# Leonardov stil (10 Zlatnih Pravila kojih SE PRIDRŽAVAŠ)
1. Hook u prve 3 sek — stat shock ili pattern interrupt, NIKAD "Bok dobrodošli"
2. Vertikalno 9:16 (default)
3. Burned-in subtitles obavezno
4. Storytelling > educational (Setup → Problem → Twist → Lekcija → CTA)
5. Loop-able final frame
6. CTA = komentar trigger, NE follow
7. Tema = problem koji target rješava DANAS, ne evergreen
8. Cadence > savršenstvo
9. Cross-platform repurpose u 24h
10. View-through rate 75%+ cilj

# Tjedna cadence
- PON: Edukativni Short (hook "Napravio sam X za 10 min")
- UTO: Skool Live preview (30 min · pitch zadnjih 5 min)
- SRI: B2B Case Study (Baywash / clinic rad)
- ČET: Testimonial / Win (member screenshot + reel)
- PET: Community Shoutout (top diskusija tjedna)
- SUB/NED: Bonus / Viral repurpose

# Borrowing pravila
- Ako vidiš top-10x video u podacima, MORAŠ borrowati hook/format/struktur (NE temu)
- Reference borrowed_from sa video_intel.id
- viral_prediction i conversion_prediction: 0-10 (10 = sigurno viral, 0 = mrtvo)

# Output format — STRIKTNO JSON niz, bez markdown fence:
[{
  "target_platform": "youtube|tiktok|instagram|cross",
  "target_account": "@lamon.leonardo|@sidequestshr|both",
  "slot_label": "PON Edukativni Short",
  "title": "Hrvatski clickbait-y naslov",
  "hook_3sec": "Točna prva rečenica koja se izgovara",
  "body_structure": "Setup → Problem → Twist → Lekcija → CTA",
  "full_script": "Word-for-word voiceover (HR), 30-90 sek",
  "cta": "Komentar-trigger CTA",
  "duration_estimate_sec": 45,
  "hashtags": ["sidehustle","viralni"],
  "on_screen_text": ["Burned subtitle line 1","line 2"],
  "viral_prediction": 8.5,
  "conversion_prediction": 7.0,
  "borrowed_from": ["video_intel_id_uuid1"],
  "rationale": "Zašto OVAJ format OVAJ tjedan"
}]`;

export const scriptGenerator = inngest.createFunction(
  {
    id: "script-generator-weekly",
    name: "Script Generator — weekly Leonardo video drop",
    retries: 1,
    triggers: [
      // Every Sunday 22:00 UTC = Monday 00:00 Zagreb — ready when Leonardo opens HQ Monday morning
      { cron: "0 22 * * 0" },
    ],
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();
    const cycleId = `scripts-${new Date().toISOString().slice(0, 10)}`;

    // Step 1: pull top-10x performers + recent 30-day baseline
    const topVideos = await step.run("fetch-top-10x", async () => {
      const { data: top10x } = await supabase
        .from("video_intel")
        .select(
          "id, platform, account_handle, url, title, description, view_count, viral_multiplier, is_top_10x, hook_pattern",
        )
        .eq("is_top_10x", true)
        .order("viral_multiplier", { ascending: false })
        .limit(15);

      const { data: recent } = await supabase
        .from("video_intel")
        .select(
          "id, platform, account_handle, url, title, view_count, viral_multiplier",
        )
        .gte("published_at", new Date(Date.now() - 30 * 86400e3).toISOString())
        .order("viral_multiplier", { ascending: false })
        .limit(20);

      return { top10x: (top10x ?? []) as VideoIntelRow[], recent: recent ?? [] };
    });

    // Step 2: pull approved niche drops (cross-pollinate niche-hunter)
    const niches = await step.run("fetch-approved-niches", async () => {
      const { data } = await supabase
        .from("niche_drops")
        .select(
          "niche_name, why_viral_now, hook_lines, monetization_paths",
        )
        .in("status", ["approved", "published"])
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as NicheDrop[];
    });

    // Step 3: Claude generates scripts
    const generated = await step.run("claude-generate", async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return { scripts: [], cost: 0 };
      }
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const top10xLines = topVideos.top10x
        .map(
          (v) =>
            `[id ${v.id}] ${v.account_handle} | ${v.view_count?.toLocaleString()} views (${v.viral_multiplier}x) | ${v.title}`,
        )
        .join("\n");

      const recentLines = topVideos.recent
        .slice(0, 10)
        .map(
          (v) =>
            `${v.account_handle} | ${v.view_count?.toLocaleString()} (${v.viral_multiplier}x) | ${v.title}`,
        )
        .join("\n");

      const nicheLines = niches
        .map(
          (n) =>
            `${n.niche_name} — ${n.why_viral_now} (hooks: ${(n.hook_lines ?? []).slice(0, 3).join(" / ")})`,
        )
        .join("\n");

      const userMsg = `Generiraj 5-7 video skripti za sljedeći tjedan.

# TOP-10x performeri (borrowing source — NE kopiraj temu, kopiraj hook/format/struktur)
${top10xLines || "(nema podataka još)"}

# Zadnjih 30 dana baseline performance
${recentLines || "(nema podataka)"}

# Aktualni niche drops iz Niche Hunter-a
${nicheLines || "(nema approved niche drop-ova)"}

Vrati JSON niz s 5-7 skripti, jedna po danu u tjednu.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: [{ type: "text", text: SCRIPT_SYSTEM_PROMPT }],
        messages: [{ role: "user", content: userMsg }],
      });

      const block = message.content.find((b) => b.type === "text");
      const raw = block && block.type === "text" ? block.text.trim() : "[]";
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      let scripts: GeneratedScript[] = [];
      try {
        scripts = JSON.parse(cleaned) as GeneratedScript[];
      } catch (e) {
        console.warn("[scriptGenerator] JSON parse failed", e);
      }

      const cost =
        (message.usage.input_tokens / 1_000_000) * 3 +
        (message.usage.output_tokens / 1_000_000) * 15;

      return { scripts, cost };
    });

    // Step 4: insert all into video_scripts
    const inserted = await step.run("insert-scripts", async () => {
      let count = 0;
      const perScriptCost =
        generated.cost / Math.max(1, generated.scripts.length);
      for (const s of generated.scripts) {
        const { error } = await supabase.from("video_scripts").insert({
          cycle_id: cycleId,
          target_platform: s.target_platform,
          target_account: s.target_account,
          slot_label: s.slot_label,
          title: s.title,
          hook_3sec: s.hook_3sec,
          body_structure: s.body_structure,
          full_script: s.full_script,
          cta: s.cta,
          duration_estimate_sec: s.duration_estimate_sec,
          hashtags: s.hashtags ?? [],
          on_screen_text: s.on_screen_text ?? [],
          viral_prediction: s.viral_prediction,
          conversion_prediction: s.conversion_prediction,
          borrowed_from: s.borrowed_from ?? [],
          rationale: s.rationale,
          generation_cost_usd: perScriptCost,
          status: "pending_review",
        });
        if (!error) count++;
      }
      return count;
    });

    if (inserted > 0) {
      void pushTelegramNotification(
        "followups",
        `🎬 Script Generator: ${inserted} novih video skripti čeka review (cycle ${cycleId}). Otvori Headquarters → Script Lab. Cost: $${generated.cost.toFixed(3)}.\n\n— Jarvis`,
      );
    }

    return {
      ok: true,
      cycleId,
      top10xCount: topVideos.top10x.length,
      nichesUsed: niches.length,
      scriptsGenerated: inserted,
      costUsd: generated.cost,
    };
  },
);
