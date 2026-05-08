"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { OUTREACH_TEMPLATES } from "@/lib/templates";

export interface DraftInput {
  leadName: string;
  platform: "linkedin" | "instagram" | "tiktok" | "email" | "other";
  niche?: string;
  hook?: string;
  previousMessage?: string;
}

export interface DraftResult {
  ok: boolean;
  draft?: string;
  error?: string;
}

export interface DraftVariantsResult {
  ok: boolean;
  variants?: Array<{ angle: string; draft: string }>;
  error?: string;
}

const PROMPT_VERSION = "v2";

const SYSTEM_PROMPT_V2 = `Ti si Leonardo Lamon, founder Lamon Agency. Pišeš PERSONALIZIRANE outreach poruke za potencijalne klijente.

# KRITICALNA pravila (apsolutni must)

1. **Hook MORA biti specifičan** — koristi konkretan detalj koji ti je user dao (lead profil, post, novi tretman, brand element). Ne počinji s generičnim "Pozdrav, vidio sam profil…". Ako nedostaje konkretan detalj, predloži pretpostavku tipa "{{specifični_post}}" placeholder.

2. **NIKAD ne spominji "AI receptionist", "Rast paket", "AI booking" ili specifične proizvode u prvom paragrafu**. Pravilo: prvo PITANJE (njihov pain), drugo OUTCOME (broj, postotak, vrijeme), TEK ZADNJE rečenice mogu aludirati na rješenje. Lead s pain → tek nakon što je hook + curiosity gap dignut, smiješ spomenuti što ti radiš.

3. **CTA MORA biti konkretan** s 2-3 vremenska slota:
   - DOBRO: "Možemo li u srijedu 11:30 ili četvrtak 16:00? Imam 15 min."
   - LOŠE: "15 min ovaj tjedan?" / "kad ti odgovara?" / "javi mi se"

4. **Otvori s pitanjem, hookom ili curiosity gapom** — ne sa statementom. Cilj prve rečenice je da PROVOKACIJSKI pita ili kaže nešto što tjera na "wait, što?".

5. **Maksimum 5 redaka teksta** (ne brojati prazne linije + signature). Brže = veća stopa odgovora.

6. **Hrvatski jezik** osim ako lead očito non-HR. Tone: peer-to-peer, premium, zero buzzwords (ne "synergy", "leverage", "scale").

# Struktura (svaki red u svojoj liniji s praznim linijama):

- **Red 1 — Hook**: konkretni detalj iz konteksta. Imenuj njihovu specifičnost.
- **Red 2 — Curiosity / Pain question**: "Kako trenutno...?" / "Tko odgovara na...?" — pita za njihov svijet, ne za tvoj
- **Red 3 — Soft outcome (ne feature!)**: konkretan broj/postotak ili kratka case story. Ne reci "AI receptionist" — reci "klinika X je smanjila missed bookings za 38% u 30 dana".
- **Red 4 — CTA**: 2-3 vremenska slota (sutra/prekosutra ili specifični dani).
- **Potpis**: — Leonardo, Lamon Agency

# Lamon Agency offering (referenca, NE spominjati izravno u prvom paragrafu):
- B2B Klinike: Rast paket — 1.997€ setup + 1.497€/mj. Outcome: 24/7 booking, missed leads ~0, WhatsApp template-ovi za stomato/estetska/fizio/ortopedija
- B2C Coacheve s pričom: Growth Operator — content engine + outreach + AI skills (€1500/mj)

# Format izlaza:
- Samo poruka, bez markdown headera, bez objašnjenja, bez "Evo prijedloga:" ili "Draft:".`;

function buildExamples(platform: string): string {
  const matching = OUTREACH_TEMPLATES.filter(
    (t) => t.platform === platform || t.platform === "any",
  ).slice(0, 3);
  return matching
    .map((t, i) => `--- Primjer ${i + 1} (${t.tone}) ---\n${t.body}`)
    .join("\n\n");
}

async function fetchGoodExamples(
  userId: string,
  limit = 3,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feedback")
    .select("output_text")
    .eq("user_id", userId)
    .eq("kind", "outreach_draft")
    .eq("rating", "good")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.output_text as string);
}

function buildUserMessage(
  input: DraftInput,
  templates: string,
  goodExamples: string[],
  angleHint?: string,
): string {
  const goodSection =
    goodExamples.length > 0
      ? `\n# Tvoji prijašnji 'good-rated' draftovi (najbolji signal — kopiraj tone i strukturu):\n\n${goodExamples
          .map((t, i) => `--- Tvoj good draft ${i + 1} ---\n${t}`)
          .join("\n\n")}\n\n# Platform templates kao backup tone reference:\n${templates}\n`
      : `# Platform templates kao tone reference (uhvati strukturu, ne kopiraj sadržaj):\n\n${templates}\n`;

  return `**Lead:** ${input.leadName}
**Platforma:** ${input.platform}
${input.niche ? `**Niche:** ${input.niche}` : ""}
${input.hook ? `**Hook / kontekst (što sam vidio kod njih):** ${input.hook}` : ""}
${input.previousMessage ? `**Prijašnja poruka (ovo je follow-up):**\n${input.previousMessage}` : ""}
${angleHint ? `\n**Specifični angle za ovaj draft:** ${angleHint}\n` : ""}
${goodSection}

Sad napiši poruku za ${input.leadName} prema svim pravilima.`;
}

export async function draftOutreach(
  input: DraftInput,
): Promise<DraftResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  if (!input.leadName.trim()) {
    return { ok: false, error: "Lead name je obavezan" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const goodExamples = userId ? await fetchGoodExamples(userId) : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const examples = buildExamples(input.platform);
    const userMessage = buildUserMessage(input, examples, goodExamples);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_V2,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const draft =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!draft) return { ok: false, error: "AI nije vratio tekst" };
    return { ok: true, draft };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Anthropic error: ${e.message}`
          : "Nepoznata Anthropic greška",
    };
  }
}

const VARIANT_ANGLES = [
  {
    label: "🤔 Curiosity",
    hint:
      "Otvori s neočekivanim pitanjem ili contrarian opservacijom. Cilj: zadrži ih do druge rečenice tako da se zapitaju 'wait, kako to?'",
  },
  {
    label: "📊 Social proof",
    hint:
      "Otvori s referencom na sličnu kliniku ili coach koji je već riješio njihov problem. Brojka + kratka story.",
  },
  {
    label: "⚡ Direct",
    hint:
      "Otvori direktno s konkretnim pain pointom njihove industrije. Bez fluffa. Pitanje + outcome + CTA u 4 reda.",
  },
];

export async function draftOutreachVariants(
  input: DraftInput,
): Promise<DraftVariantsResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  if (!input.leadName.trim()) {
    return { ok: false, error: "Lead name je obavezan" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const goodExamples = userId ? await fetchGoodExamples(userId) : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const examples = buildExamples(input.platform);

    const calls = VARIANT_ANGLES.map(async (v) => {
      const userMessage = buildUserMessage(input, examples, goodExamples, v.hint);
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        temperature: 0.85,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT_V2,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      });
      const block = message.content.find((b) => b.type === "text");
      const draft = block && block.type === "text" ? block.text.trim() : "";
      return { angle: v.label, draft };
    });

    const variants = await Promise.all(calls);
    const filtered = variants.filter((v) => v.draft.length > 0);
    if (filtered.length === 0)
      return { ok: false, error: "AI nije vratio nijednu varijantu" };
    return { ok: true, variants: filtered };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `Anthropic error: ${e.message}` : "Nepoznata greška",
    };
  }
}

// =====================================================================
// AI Weekly Report v2 (narrative writer)
// =====================================================================

export interface GenerateReportInput {
  clientId: string;
  weekStart: string; // YYYY-MM-DD
  customNotes?: string; // optional: things Leonardo wants highlighted
}

export interface GenerateReportResult {
  ok: boolean;
  report?: string;
  error?: string;
}

const REPORT_PROMPT_V2 = `Ti si Leonardo Lamon, founder Lamon Agency. Pišeš tjedni izvještaj za klijenta.

# Voice (apsolutno bitno)
- **Direktan, peer-to-peer**, kao da pišeš e-mail prijatelju koji ti je platio za rezultat
- 1. lice množine ("mi smo napravili", ne "Lamon Agency je proveo")
- Brojke uvijek konkretne (X%, +Y, -Z) — nikad "značajno povećanje"
- **Bez fluffa**: ne "u ovome tjednu smo aktivno radili na..." — odmah na akciju + rezultat
- Hrvatski, premium, bez buzzword-a (ne "scale", "leverage", "synergize")

# Struktura (svaki dio nova alineja)

1. **Pozdrav + framing** (1 rečenica) — tone-set za tjedan
2. **🎯 Ključne brojke** — bullet, 3-5 najvažnijih
3. **🔧 Što smo napravili** — bullet, 3-4 specifične akcije s rezultatom (akcija → rezultat, ne samo akcija)
4. **📋 Sljedeći tjedan** — bullet, 2-3 koraka s vremenskim okvirom
5. (opcionalno) **⚠ Risk** ili **💡 Prilika** ili **❓ Trebam tvoj input** — samo ako stvarno ima što
6. Potpis: "Pozz, Leonardo · Lamon Agency"

# Pravila

- **Maks ~250 riječi** ukupno
- Ako ti fali konkretan podatak, **koristi placeholder \`{{POPUNI_RUČNO}}\`** umjesto izmišljanja
- **Risk flag** uključi samo ako client.churn_risk je low/medium/high — nikad pretpostavi
- Ako je tjedan bio slab (malo aktivnosti), budi iskren — "ovaj tjedan je bio fokus na pripremu, sljedeći donosi rezultate" — ne lagaj brojkama
- **Personaliziraj** — koristi ime klijenta i specifičnost niche (klinika vs coach)

# Output: SAMO tekst reporta, bez markdown headera tipa "# Report", bez objašnjenja, bez "Evo izvještaja:". Direktno tekst.`;

interface ReportContext {
  client: {
    name: string;
    type: string;
    status: string;
    monthly_revenue: number;
    churn_risk: string | null;
    next_action: string | null;
    last_touchpoint_at: string | null;
    notes: string | null;
  };
  weekStart: string;
  weekEnd: string;
  contentPosts: Array<{
    platform: string;
    title: string | null;
    views: number;
    likes: number;
    comments: number;
  }>;
  totalViews: number;
  totalLikes: number;
  outreachCountThisWeek: number;
  tasksDoneThisWeek: Array<{ title: string; completed_at: string | null }>;
  tasksUpcoming: Array<{ title: string; due_date: string | null }>;
}

async function fetchReportContext(
  clientId: string,
  weekStart: string,
): Promise<ReportContext | null> {
  const supabase = await createClient();
  const ws = new Date(weekStart);
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  const weStr = we.toISOString().slice(0, 10);
  const wsIso = ws.toISOString();
  const weIso = new Date(we.getFullYear(), we.getMonth(), we.getDate() + 1).toISOString();

  const [clientRes, postsRes, outreachRes, tasksDoneRes, tasksUpRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase
        .from("content_posts")
        .select("platform, title, views, likes, comments")
        .gte("posted_at", wsIso)
        .lt("posted_at", weIso)
        .order("views", { ascending: false }),
      supabase
        .from("outreach")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", wsIso)
        .lt("sent_at", weIso),
      supabase
        .from("tasks")
        .select("title, completed_at")
        .eq("client_id", clientId)
        .eq("status", "done")
        .gte("completed_at", wsIso)
        .lt("completed_at", weIso),
      supabase
        .from("tasks")
        .select("title, due_date")
        .eq("client_id", clientId)
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5),
    ]);

  if (!clientRes.data) return null;

  const posts = (postsRes.data ?? []) as Array<{
    platform: string;
    title: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
  }>;
  const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0);

  return {
    client: {
      name: clientRes.data.name,
      type: clientRes.data.type,
      status: clientRes.data.status,
      monthly_revenue: Number(clientRes.data.monthly_revenue ?? 0),
      churn_risk: clientRes.data.churn_risk,
      next_action: clientRes.data.next_action,
      last_touchpoint_at: clientRes.data.last_touchpoint_at,
      notes: clientRes.data.notes,
    },
    weekStart,
    weekEnd: weStr,
    contentPosts: posts.map((p) => ({
      platform: p.platform,
      title: p.title,
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
    })),
    totalViews,
    totalLikes,
    outreachCountThisWeek: outreachRes.count ?? 0,
    tasksDoneThisWeek: (tasksDoneRes.data ?? []) as Array<{
      title: string;
      completed_at: string | null;
    }>,
    tasksUpcoming: (tasksUpRes.data ?? []) as Array<{
      title: string;
      due_date: string | null;
    }>,
  };
}

async function fetchGoodReportExamples(
  userId: string,
  limit = 2,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feedback")
    .select("output_text")
    .eq("user_id", userId)
    .eq("kind", "weekly_report")
    .eq("rating", "good")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.output_text as string);
}

export async function generateWeeklyReport(
  input: GenerateReportInput,
): Promise<GenerateReportResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const ctx = await fetchReportContext(input.clientId, input.weekStart);
    if (!ctx) return { ok: false, error: "Klijent nije pronađen" };

    const goodExamples = userId ? await fetchGoodReportExamples(userId) : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const goodSection =
      goodExamples.length > 0
        ? `\n# Tvoji prijašnji 'good-rated' izvještaji (najbolji signal — kopiraj tone i strukturu):\n${goodExamples
            .map((t, i) => `--- Good report ${i + 1} ---\n${t}`)
            .join("\n\n")}\n`
        : "";

    const ctxJson = {
      klijent: {
        ime: ctx.client.name,
        tip: ctx.client.type,
        status: ctx.client.status,
        mrr_eur: ctx.client.monthly_revenue,
        churn_risk: ctx.client.churn_risk,
        next_action: ctx.client.next_action,
        last_touchpoint_at: ctx.client.last_touchpoint_at,
        notes_excerpt: ctx.client.notes?.slice(0, 500) ?? null,
      },
      tjedan: {
        start: ctx.weekStart,
        end: ctx.weekEnd,
      },
      content_posts_ovaj_tjedan: ctx.contentPosts.slice(0, 10),
      content_total: {
        posts: ctx.contentPosts.length,
        total_views: ctx.totalViews,
        total_likes: ctx.totalLikes,
      },
      outreach_count: ctx.outreachCountThisWeek,
      tasks_done_for_client: ctx.tasksDoneThisWeek,
      tasks_upcoming_for_client: ctx.tasksUpcoming,
    };

    const userMessage = `${goodSection}

# Stvarni podaci za izvještaj (JSON):

\`\`\`json
${JSON.stringify(ctxJson, null, 2)}
\`\`\`

${input.customNotes ? `# Bitno: stvari koje Leonardo želi istaknuti:\n${input.customNotes}\n` : ""}

Sad napiši tjedni izvještaj za **${ctx.client.name}** prema svim pravilima. Koristi {{POPUNI_RUČNO}} za detalje koji nisu u JSON-u (npr. specifične rezultate koje samo Leonardo zna).`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: [
        {
          type: "text",
          text: REPORT_PROMPT_V2,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content.find((b) => b.type === "text");
    const report =
      block && block.type === "text" ? block.text.trim() : "";
    if (!report) return { ok: false, error: "AI nije vratio tekst" };
    return { ok: true, report };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Anthropic error: ${e.message}`
          : "Nepoznata greška",
    };
  }
}

// =====================================================================
// AI Lead Scorer
// =====================================================================

export interface ScoreLeadInput {
  profileText: string;
  hint?: string; // optional: "TikTok bio + 3 last posts" etc.
}

export interface LeadScoreBreakdown {
  lice_branda: number;
  edge: number;
  premium: number;
  dokaz: number;
  brzina_odluke: number;
}

export interface LeadScoreResult {
  ok: boolean;
  error?: string;
  raw?: string;
  result?: {
    icp_breakdown: LeadScoreBreakdown;
    icp_total: number;
    confidence: "low" | "medium" | "high";
    suggested_name: string;
    suggested_niche:
      | "stomatologija"
      | "estetska"
      | "fizio"
      | "ortopedija"
      | "coach"
      | "other";
    suggested_source:
      | "linkedin"
      | "instagram"
      | "tiktok"
      | "referral"
      | "other";
    reasoning: {
      lice_branda: string;
      edge: string;
      premium: string;
      dokaz: string;
      brzina_odluke: string;
    };
    summary: string;
  };
}

const LEAD_SCORER_PROMPT = `Ti si Lamon Agency lead scorer. Analiziraj profil potencijalnog klijenta i daj mu ICP score po 5 kriterija (svaki 0-4, ukupno 0-20).

# Lamon ICP cilj
High-leverage, premium klijent koji brzo donosi odluke. Ne želimo discount klijente, ne želimo committee odluke.

# 5 kriterija s rubrikom

**1. Lice branda (0-4)** — ima li klinika/coach jasno lice?
- 0: anonimno, nema founder / lica
- 1: vlasnik postoji ali nema osobni brand
- 2: vlasnik je donekle vidljiv (par postova)
- 3: jasan founder s osobnim brandom
- 4: founder je referenca u industriji (govornik, autor, citiran)

**2. Edge (0-4)** — razlikuju se od konkurencije?
- 0: generic, isto kao 100 drugih
- 1: minor differentiator
- 2: jasan USP ali ne unikat
- 3: solid niche + jasna pozicija
- 4: kategorija od jednog — niko drugi to ne radi tako

**3. Premium (0-4)** — premium pozicioniranje + cijena?
- 0: discount / mass market
- 1: budget-friendly
- 2: mid-market
- 3: premium tier (cijene iznad prosjeka tržišta)
- 4: ultra-premium / luxury (top 5% tržišta)

**4. Dokaz (0-4)** — testimonials, rezultati, case studies?
- 0: ništa vidljivo
- 1: 1-2 generic testimonial
- 2: nekoliko testimonials / before-after
- 3: kvalitetne case stories s brojevima
- 4: poznati brendovi/celebrities/influenceri među klijentima

**5. Brzina odluke (0-4)** — koliko brzo odluče?
- 0: committee, >3 mj sporo
- 1: 1-2 mj decision cycle
- 2: standard B2B (4-6 tj)
- 3: 1-2 osobe + brzo (1-3 tj)
- 4: founder direktno, isti dan/tjedan

# Pravila
- Budi konzervativan — ako informacija fali, score bi trebao biti niži, ne pretpostavljaj
- Confidence: 'high' samo ako profile text bogat (LinkedIn About + posts ili web stranica + testimonials), 'medium' za solid bio, 'low' za samo username/handle
- Reasoning: 1 rečenica po kriteriju, MORA referencirati specifičan signal iz teksta (citiraj fragment ako možeš)
- summary: 1-2 rečenice, "ovo je [hot/warm/cold] lead jer..."

# Output: STRICT JSON, bez markdown fence-a, bez objašnjenja, samo:
{
  "icp_breakdown": {"lice_branda": 0-4, "edge": 0-4, "premium": 0-4, "dokaz": 0-4, "brzina_odluke": 0-4},
  "icp_total": 0-20,
  "confidence": "low|medium|high",
  "suggested_name": "string",
  "suggested_niche": "stomatologija|estetska|fizio|ortopedija|coach|other",
  "suggested_source": "linkedin|instagram|tiktok|referral|other",
  "reasoning": {"lice_branda": "...", "edge": "...", "premium": "...", "dokaz": "...", "brzina_odluke": "..."},
  "summary": "..."
}`;

function tryParseScoreJson(text: string): LeadScoreResult["result"] | null {
  // Strip code fences if any
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    // Quick shape check
    if (
      !parsed.icp_breakdown ||
      typeof parsed.icp_breakdown.lice_branda !== "number"
    ) {
      return null;
    }
    return parsed as LeadScoreResult["result"];
  } catch {
    return null;
  }
}

export async function scoreLead(
  input: ScoreLeadInput,
): Promise<LeadScoreResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  const profile = input.profileText.trim();
  if (profile.length < 30) {
    return {
      ok: false,
      error: "Profile text je prekratak — paste-aj makar bio + 1-2 posta",
    };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Few-shot from good rated lead scores (future-proofing)
    const goodExamples = userId
      ? await fetchGoodLeadScoreExamples(userId)
      : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const exampleSection =
      goodExamples.length > 0
        ? `\n# Tvoji prijašnji 'good-rated' score-ovi (referenca):\n${goodExamples
            .map((e, i) => `--- Primjer ${i + 1} ---\n${e}`)
            .join("\n\n")}\n`
        : "";

    const userMessage = `${exampleSection}# Profile za scoring${input.hint ? ` (${input.hint})` : ""}:\n\n${profile}\n\nVrati JSON.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: [
        {
          type: "text",
          text: LEAD_SCORER_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    const result = tryParseScoreJson(raw);
    if (!result) {
      return {
        ok: false,
        error: "AI nije vratio validan JSON",
        raw,
      };
    }
    return { ok: true, result, raw };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? `Anthropic error: ${e.message}` : "Greška",
    };
  }
}

async function fetchGoodLeadScoreExamples(
  userId: string,
  limit = 2,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feedback")
    .select("input_payload, output_text")
    .eq("user_id", userId)
    .eq("kind", "lead_score")
    .eq("rating", "good")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const input = r.input_payload as { profileText?: string } | null;
    const profile = input?.profileText?.slice(0, 400) ?? "(no profile)";
    return `Profile: ${profile}\n\nGood JSON output:\n${r.output_text}`;
  });
}

export interface FeedbackInput {
  kind: "outreach_draft" | "lead_score" | "weekly_report";
  input: DraftInput | ScoreLeadInput | GenerateReportInput;
  output: string;
  rating: "good" | "bad";
  notes?: string;
}

export async function saveAiFeedback(
  fb: FeedbackInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { error } = await supabase.from("ai_feedback").insert({
    user_id: userData.user.id,
    kind: fb.kind,
    prompt_version: PROMPT_VERSION,
    input_payload: fb.input as unknown as Record<string, unknown>,
    output_text: fb.output,
    rating: fb.rating,
    feedback_notes: fb.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
