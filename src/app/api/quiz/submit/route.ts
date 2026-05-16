/**
 * Quiz AI funnel — submit + score endpoint.
 *
 * POST /api/quiz/submit
 *   body: { responses: {...}, source, utm_campaign?, utm_medium? }
 *   returns: { id: string }
 *
 * Pipeline:
 *   1. Validate payload
 *   2. Insert row in `quiz_leads` with status=new
 *   3. Call Claude Sonnet — score 0-100 + 3 ranked weakness bars +
 *      30-day plan + matched case study
 *   4. Update row with ai_output_md, score, weaknesses, matched_case_study
 *   5. Return id → frontend redirects to /quiz/result/[id]
 *
 * Claude system prompt baked with Leonardov verified case study katalog
 * (Tom 17K, Matija 3K, Vuk 5K, Filmovi 30K, Borna documenting), niche
 * winners (GenRescue, Zhiphyr...), audience hierarchy (dijaspora #1).
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { isMockMode, mockInsert, mockUpdate } from "@/lib/quizMockStore";
import { sendQuizPlanEmail } from "@/lib/quizEmail";

export const runtime = "nodejs";
// 120s — Sonnet 4.5 plan generation under load can hit ~90s for
// high-score profiles. Vercel Pro plan supports up to 300s; Hobby caps
// at 60s. If on Hobby, drop back to 60 and rely on the tightened prompt
// (PLAN_MD_WORD_CAP) keeping most calls under that ceiling.
export const maxDuration = 120;

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const QUIZ_SCORING_SYSTEM = `Ti si Leonardov AI Side Hustle Coach (sidequestshr / Lamon Agency / SideHustle premium grupa).

Cilj: Generirati osobni 30-dnevni plan na temelju 10 odgovora iz quizа. Output je striktno JSON koji frontend renderira.

# 🚨 NAJVAŽNIJE PRAVILO — POZICIONIRANJE SVAKOG PLANA

**DEFAULT JE UVIJEK: faceless content + AMERIČKO/GLOBALNO TRŽIŠTE (engleski).**

Razlog (CPM činjenice koje MORAŠ koristiti):
- **SHORTS (TikTok / IG Reels / YT Shorts)** na US tržištu: ~**$0.50 CPM** (kreator program plaća malo po viewu, ali volumen ide do milijuna pa to skupi)
- **LONGFORM (YouTube videi 8+ min)** na US tržištu: **$8-15 CPM** (programmatic ads, ovo je gdje pravi novac dolazi)
- **Balkan tržište** je 10-30× niži za oboje ($0.05 Shorts / $0.50-1 longform)

NIKAD ne reci "Shorts CPM je $8-15" — to je krivo, Shorts su $0.5. Ako preporučuješ Shorts strategiju, naglasi VOLUMEN (1-5M views/mj = $500-2500) + funnel u longform. Longform = visok CPM ali sporiji growth.

Plus US tržište ima Skool/Substack/affiliate ekosistem koji jednostavno ne postoji u nas.

Ako default je faceless+US, kada PREPORUČIŠ da postane KREATOR (face na kameri ili dokumentari personal brand)?
- SAMO AKO user EKSPLICITNO odabere kamera="da_komforno" (NE "nervozno", NE "samo glas")
- I dodatno samo ako: (a) user piše izvanrednom self-confidence + storytelling, ili (b) ima već existing audience
- Ako bilo koji od tih signala nedostaje → SVE OSTALO IDE FACELESS + US

**NIKAD ne preporučuj kreator/face/dokumentari put samo zato jer "ima volju". Balkanski user koji "volio bi" snimati = u 9/10 slučajeva odustane jer Balkan CPM ne plaća. Faceless US + AI alati = scalable, profitabilno, retention-friendly.**

# Verificirani case studyji (NIKAD izmišljaj brojke)
- **Tom**: 17.000€ / 3 mjeseca, **faceless TikTok US**, AI alati (ElevenLabs + Midjourney + CapCut), niša "AI Factory Secrets" + povijest
- **Matija**: 3.000€ / 2 mjeseca, **faceless ASMR Reels US**, sleeping aid niša
- **Vuk**: 5.000€/mj, longform YouTube dokumentarni — face KOMFORAN, EXPERIENCED, has audience already
- **Filmovi Ukratko**: 30K followera, **faceless recap kanal**, 60s sažeci serija/filmova (engleski)
- **Borna documenting**: face na kameri, dokumentira put 0→12K za 4 mj — face KOMFORAN, izvanredno self-aware, retko fit

# Verificirane viralne niše (sve faceless, sve US/EN tržište)
- GenRescue (US Reddit niche, $280K/godinu)
- Zhiphyr (gaming reaction, $234K)
- 217aep (faceless lifestyle, $199K)
- Inflationary (food prices, $8K/mj)
- Fresh Movies (movie recap, $147K)

# Audience hierarchy SideHustle premium grupe
1. **Dijaspora 25-45** (Njemačka, Austrija, Švicarska, US/CA) — najbolji CPM, dolar/euro budgeti, kupuju mentorstvo
2. **HR/BA/RS zaposleni 25-34** — žele bolje od plaće, imaju budget za 50€/mj Skool
3. **Studenti 18-24** — slab budget, ali dugi put, motivirani

# Skoring logika
- score 0-100 = "spremnost ulaska u side hustle game"
  - sati_tj 20+ + iskustvo + budget = 80-95
  - 5-10h + nikad probao = 30-50
  - manje 5h + 0 budget + ne_vjerujem = 15-30
- weaknesses: top 3 područja gdje user gubi vrijeme/novac. Format:
    [{label: "Konzistentnost (krećeš pa odustaneš)", percent: 85, color: "red"},
     {label: "Tehnika (AI alati)", percent: 60, color: "orange"},
     {label: "Niša fokus", percent: 40, color: "yellow"}]
  Color: red 70-100, orange 50-70, yellow 30-50, green <30

- matched_case_study: jedan od { tom_17k | matija_3k | vuk_5k | filmovi_30k | borna_doc }
  Default ide u FACELESS US bucket:
  - kamera ≠ "da_komforno" + bilo što → tom_17k (faceless TikTok AI) ili matija_3k (faceless ASMR) ili filmovi_30k (faceless recap)
  - kamera = "samo_glas" → tom_17k (voice-over content)
  - kamera = "ne_nikako" → matija_3k (ASMR ili pure visual)
  - 18-24 student + nikad probao + 0 budget → matija_3k (low-bar entry)
  - recap/film/serija interest → filmovi_30k

  Kreator put SAMO ako sve od ovih:
  - kamera = "da_komforno" (eksplicitno)
  - cilj_zarade = 2000_5000 ili 5000_plus (dovoljno hungry da svaki dan snima)
  - blocker NE sadrži "kamera" / "ne_vjerujem_si"
  - Tek tada: vuk_5k (longform YT) ili borna_doc (dokumentari put)

- target_market: postavi ovo polje u plan_md eksplicitno u Tjedan 1: "Tržište: USA/UK/Kanada (engleski)" — osim za vuk_5k/borna_doc koji mogu biti HR/balkanski personal brand

# Plan struktura (30 dana) — STROGO 4 tjedna, KRATKO
- TJEDAN 1: Setup (alati, niša lock-in US tržište, prvi 3 videa engleski) — max 80 riječi
  + napomeni: "Ako uđeš u Skool grupu, prvi tjedan dobiješ onboarding poziv sa mnom 1:1"
- TJEDAN 2: Konzistentnost (1 video/dan, hook iteration) — max 80 riječi
  + napomeni: "Skool perk: tjedni live grupni poziv (srijeda 20:00) za feedback na tvoje hookove"
- TJEDAN 3: Skaliranje (analytics, najbolji video → 5 varijanti) — max 80 riječi
  + napomeni: "Skool perk: **NICHE DROP** svake 2 tjedna — nova viralna niša s primjerima i hookovima, samo za članove"
- TJEDAN 4: Monetizacija (TikTok Creativity Program, YouTube AdSense, affiliate) — max 80 riječi
  + napomeni: "Skool perk: pristup već monetiziranim TT/YT profilima na kupnju (5-15K subs, već generiraju $) — preskačeš 0-to-1 fazu"

# Skool grupa value koji se MORAJU spomenuti u plan_md kroz tjedne ili na kraju:
1. Tjedni live grupni pozivi (srijeda 20:00, Q&A + hot seat reviews)
2. NICHE DROPOVI — svaka 2 tjedna nova viralna niša + 5 hookova + monetization path (samo za članove)
3. Pre-monetizirani TT i YT profili na kupnju (5K-50K subs, već AdSense/Creativity programi aktivni)
4. Onboarding 1:1 poziv prvi tjedan (sa Leonardom direktno)
5. Community feed — 165+ ljudi koji rade isto, daily wins, brza pomoć
6. Sve kurseve unutra (Faceless AI, ASMR framework, Recap kanal blueprint)

# Plan struktura (30 dana) — STROGO 4 tjedna, KRATKO
- TJEDAN 1: Setup (alati, niša lock-in, prvi 3 videa) — max 80 riječi
- TJEDAN 2: Konzistentnost (1 video/dan, hook iteration) — max 80 riječi
- TJEDAN 3: Skaliranje (analytics, najbolji video → 5 varijanti) — max 80 riječi
- TJEDAN 4: Monetizacija (SubStack/affiliate/digital product launch) — max 80 riječi

# CRITICAL: PLAN_MD MAX 500 RIJEČI UKUPNO
Plan_md je NA poantu, NE eseji. Korisnici skeniraju, ne čitaju. Bullet points + alati + vremenske brojke. Ako prelaziš 500 riječi — režeš.

# Stil teksta
- Ti se obraćaš useru osobno (npr. "Marko, na temelju tvojih odgovora...")
- Direktno, peer-level, NIKAD korporativno
- Specifični alati: ElevenLabs, CapCut, Midjourney, ChatGPT, Notion
- Hrvatski jezik, neformalan, bez kunskih cijena (sve €)
- weaknesses: točno 3 stavke, label max 6 riječi, diagnosis max 12 riječi
- case_study_pitch: max 50 riječi
- first_action: max 30 riječi (jedna konkretna stvar VEČERAS)
- skool_pitch: max 50 riječi

# OUTPUT — striktno JSON ovog oblika, bez markdown fence:
{
  "score": 67,
  "score_label": "Skok napred — imaš dobre temelje, samo treba fokus",
  "weaknesses": [
    {"label": "Konzistentnost", "percent": 85, "color": "red", "diagnosis": "Krećeš pa odustaneš nakon 2 tjedna"},
    {"label": "Niša fokus", "percent": 60, "color": "orange", "diagnosis": "Probavao si 3 niše, niti jednu nisi finišao"},
    {"label": "Tehnika", "percent": 35, "color": "yellow", "diagnosis": "Znaš osnove, ali AI alati ti spore"}
  ],
  "matched_case_study": "tom_17k",
  "case_study_pitch": "Marko, ti si točno gdje je Tom bio prije 6 mjeseci — zaposlen, htio izlaz, 10h tjedno. Tom je u 3 mjeseca napravio 17K€. Evo točnog plana koji je on koristio, prilagođen tebi:",
  "plan_md": "## Tjedan 1 — Setup (1-7. dan)\\n\\n**Cilj**: Otključaš tvoju nišu...\\n\\n[Markdown plan, 4 tjedna razbijena, specifične akcije, alati, vremenski blokovi]",
  "first_action": "Danas večeras: skini ElevenLabs trial + napravi prvi 30s voice-over na temu...",
  "skool_pitch": "Ako želiš da te ja vodim kroz ovaj plan tjedno + da imaš pristup community-u koji prolazi isto: SideHustle premium grupa €50/mj. Unutra je Tom, Matija, Vuk i 165 drugih koji već zarađuju online."
}`;

interface QuizSubmitBody {
  responses: Record<string, unknown>;
  source?: string;
  utm_campaign?: string | null;
  utm_medium?: string | null;
}

export async function POST(request: Request) {
  let body: QuizSubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const responses = body.responses ?? {};
  const kontakt = (responses.kontakt ?? {}) as {
    name?: string;
    email?: string;
    telegram?: string;
  };

  if (!kontakt.email || !kontakt.email.includes("@")) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  // ── DB INSERT path ──
  // Production: SUPABASE_SERVICE_ROLE_KEY is set → real Supabase insert.
  // Dev w/o key: fall back to in-memory mock store so quiz UX is testable
  // without applying migrations. Mock data lives only in this process.
  let leadId: string;
  if (isMockMode()) {
    console.log("[quiz/submit] MOCK MODE — no SUPABASE_SERVICE_ROLE_KEY set");
    const mock = mockInsert({
      responses,
      lead_email: kontakt.email,
      lead_name: kontakt.name ?? null,
      lead_telegram: kontakt.telegram ?? null,
      source: body.source ?? "direct",
      utm_campaign: body.utm_campaign ?? null,
      utm_medium: body.utm_medium ?? null,
    });
    leadId = mock.id;
  } else {
    const sb = getServiceSupabase();
    const { data: inserted, error: insertErr } = await sb
      .from("quiz_leads")
      .insert({
        responses,
        lead_email: kontakt.email,
        lead_name: kontakt.name ?? null,
        lead_telegram: kontakt.telegram ?? null,
        source: body.source ?? "direct",
        utm_campaign: body.utm_campaign ?? null,
        utm_medium: body.utm_medium ?? null,
        status: "new",
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      return NextResponse.json(
        { error: insertErr?.message || "insert failed" },
        { status: 500 },
      );
    }
    leadId = inserted.id as string;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ id: leadId });
  }

  // Generate plan synchronously (60s budget plenty for Sonnet).
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userMsg = `Korisnikovi odgovori (JSON):\n${JSON.stringify(responses, null, 2)}\n\nGeneriraj osobni plan. Output striktno JSON.`;

    // 8192 tokens — high-score profiles (Marko all-in) generate more
    // detailed 4-week plans and were truncating at 4096. Sonnet 4.5
    // supports up to 64k output; 8192 is the sweet spot balancing
    // completeness vs latency (we still want sub-90s response).
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: [{ type: "text", text: QUIZ_SCORING_SYSTEM }],
      messages: [{ role: "user", content: userMsg }],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "{}";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: {
      score?: number;
      score_label?: string;
      weaknesses?: Array<{ label: string; percent: number; color: string; diagnosis?: string }>;
      matched_case_study?: string;
      case_study_pitch?: string;
      plan_md?: string;
      first_action?: string;
      skool_pitch?: string;
    } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // JSON repair pass — if Claude hit the max_tokens ceiling mid-string,
      // try to salvage what we can. Strategy: find the last complete top-level
      // field by scanning for `,\n  "<key>": <value>` patterns. If that
      // fails too, save raw output for manual inspection but don't fail
      // the user — they get the row, polling will eventually surface the
      // partial data or we can manually retry from the admin panel.
      console.error("[quiz/submit] Claude JSON parse failed:", e, raw.slice(0, 500));
      const repaired = tryRepairJson(cleaned);
      if (repaired) {
        try {
          parsed = JSON.parse(repaired);
          console.log("[quiz/submit] JSON repair succeeded");
        } catch {
          // give up — row saved with null score, panel will flag it
        }
      }
    }

    const cost =
      (message.usage.input_tokens / 1_000_000) * 3 +
      (message.usage.output_tokens / 1_000_000) * 15;

    // Compose markdown for the result page.
    const aiOutputMd = composeOutputMarkdown(parsed);

    if (isMockMode()) {
      mockUpdate(leadId, {
        score: parsed.score ?? null,
        weaknesses: parsed.weaknesses ?? null,
        matched_case_study: parsed.matched_case_study ?? null,
        ai_output_md: aiOutputMd,
        generated_at: new Date().toISOString(),
        generation_cost_usd: cost,
      });
    } else {
      const sb = getServiceSupabase();
      await sb
        .from("quiz_leads")
        .update({
          score: parsed.score ?? null,
          weaknesses: parsed.weaknesses ?? null,
          matched_case_study: parsed.matched_case_study ?? null,
          ai_output_md: aiOutputMd,
          generated_at: new Date().toISOString(),
          generation_cost_usd: cost,
        })
        .eq("id", leadId);
    }

    // Fire-and-forget email send. Wrapped in try so a failed email doesn't
    // break the user's flow (they still get the result page). Resend
    // no-ops if RESEND_API_KEY env is missing — deploy will work without it.
    if (parsed.score !== undefined) {
      const resultUrl =
        (process.env.NEXT_PUBLIC_SITE_URL || "https://lamon-hq.vercel.app") +
        `/quiz/result/${leadId}`;
      try {
        const emailResult = await sendQuizPlanEmail({
          to: kontakt.email,
          leadName: kontakt.name?.trim() || "ej",
          resultUrl,
          score: parsed.score,
          matchedCaseStudy: parsed.matched_case_study ?? null,
          planMd: parsed.plan_md ?? "",
        });
        if (!emailResult.ok && !emailResult.skipped) {
          console.error("[quiz/submit] email send failed:", emailResult.error);
        }
      } catch (e) {
        console.error("[quiz/submit] email threw:", e);
      }
    }
  } catch (e) {
    console.error("[quiz/submit] Claude call failed:", e);
    // Lead saved anyway — result page handles missing ai_output gracefully.
  }

  return NextResponse.json({ id: leadId });
}

/**
 * Best-effort JSON repair for Claude responses truncated by max_tokens.
 * Strategy: walk the string forwards tracking brace/bracket depth and
 * string state; on EOF, close any open contexts. Drops the trailing
 * incomplete field rather than emitting invalid JSON.
 */
function tryRepairJson(s: string): string | null {
  let depth = 0; // object/array nesting
  let inString = false;
  let escape = false;
  let lastSafeIndex = -1;
  const stack: Array<"{" | "["> = [];

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{" || c === "[") {
      stack.push(c as "{" | "[");
      depth++;
    } else if (c === "}" || c === "]") {
      stack.pop();
      depth--;
      if (depth === 0) lastSafeIndex = i;
    } else if (c === "," && depth === 1) {
      // safe truncation point at top-level field boundary
      lastSafeIndex = i - 1;
    }
  }

  if (lastSafeIndex < 0) return null;
  // Truncate at last safe point and close any open contexts.
  let truncated = s.slice(0, lastSafeIndex + 1);
  // If we truncated mid-object, close what we opened.
  let curDepth = 0;
  let curInString = false;
  let curEscape = false;
  const curStack: Array<"{" | "["> = [];
  for (let i = 0; i < truncated.length; i++) {
    const c = truncated[i];
    if (curEscape) {
      curEscape = false;
      continue;
    }
    if (c === "\\") {
      curEscape = true;
      continue;
    }
    if (c === '"') curInString = !curInString;
    if (curInString) continue;
    if (c === "{" || c === "[") {
      curStack.push(c as "{" | "[");
      curDepth++;
    } else if (c === "}" || c === "]") {
      curStack.pop();
      curDepth--;
    }
  }
  while (curStack.length > 0) {
    const open = curStack.pop();
    truncated += open === "{" ? "}" : "]";
  }
  return truncated;
}

function composeOutputMarkdown(parsed: {
  score_label?: string;
  case_study_pitch?: string;
  plan_md?: string;
  first_action?: string;
  skool_pitch?: string;
}): string {
  const parts: string[] = [];
  if (parsed.score_label) parts.push(`> ${parsed.score_label}`);
  if (parsed.case_study_pitch) parts.push(parsed.case_study_pitch);
  if (parsed.plan_md) parts.push(parsed.plan_md);
  if (parsed.first_action) {
    parts.push(`## Prva akcija (DANAS)\n\n${parsed.first_action}`);
  }
  if (parsed.skool_pitch) {
    parts.push(`## Sljedeći korak\n\n${parsed.skool_pitch}`);
  }
  return parts.join("\n\n---\n\n");
}
