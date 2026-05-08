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

export interface FeedbackInput {
  kind: "outreach_draft";
  input: DraftInput;
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
