"use server";

import Anthropic from "@anthropic-ai/sdk";
import { OUTREACH_TEMPLATES } from "@/lib/templates";

export interface DraftInput {
  leadName: string;
  platform: "linkedin" | "instagram" | "tiktok" | "email" | "other";
  niche?: string;
  hook?: string; // what Leonardo noticed about them
  previousMessage?: string; // for follow-up
}

export interface DraftResult {
  ok: boolean;
  draft?: string;
  error?: string;
}

const SYSTEM_PROMPT = `Ti si Leonardo Lamon, founder Lamon Agency. Pišeš outreach poruke za potencijalne klijente.

**Tvoj brand voice:**
- Direktan, premium, bez fluffa
- Hrvatski jezik (osim ako lead očito non-HR)
- Konkretan CTA s vremenskim slotom (15 min ovaj tjedan)
- Nikad samo "samo provjeravam" — uvijek nova vrijednost
- Topao kad treba, peer-to-peer s coachevima
- Maksimum 4-5 redaka — ljudi ne čitaju long messages

**Lamon Agency ponuda:**
- B2B Klinike: Rast paket — 1.997€ setup + 1.497€/mj. AI receptionist + booking 24/7 + WhatsApp template-ovi za stomatologe, estetske, fizio, ortopedske klinike.
- B2C Coacheve: Growth Operator paket — content engine + outreach + AI skills za coacheve s pričom (€1500/mj).

**Pravila:**
1. Otvori s konkretnim hook-om (njihov post, story, USP, klinika ime — koristi {{specifični detalj}} ako user ne dade kontekst)
2. Jedan benefit (ne lista features)
3. Jedna konkretna CTA s vremenom
4. Potpis: — Leonardo, Lamon Agency
5. Bez emojija osim ako je TikTok DM
6. Ne kopiraj template doslovno — adaptiraj za specifični lead i kontekst

**Format izlaza:** Samo poruka, ništa drugo. Bez headera, bez objašnjenja, bez "Evo prijedloga:".`;

function buildExamples(platform: string): string {
  const matching = OUTREACH_TEMPLATES.filter(
    (t) => t.platform === platform || t.platform === "any",
  ).slice(0, 3);
  return matching
    .map((t, i) => `--- Primjer ${i + 1} (${t.tone}) ---\n${t.body}`)
    .join("\n\n");
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
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const examples = buildExamples(input.platform);

    const userMessage = `**Lead:** ${input.leadName}
**Platforma:** ${input.platform}
${input.niche ? `**Niche/industrija:** ${input.niche}` : ""}
${input.hook ? `**Što sam vidio kod njih (hook):** ${input.hook}` : ""}
${input.previousMessage ? `**Prijašnja poruka (ovo je follow-up):**\n${input.previousMessage}` : ""}

Napiši outreach poruku za ovog lead-a u mom voice-u. Evo ${examples ? "primjera mojih prošlih poruka za ovu platformu — uhvati tone i strukturu, ne kopiraj sadržaj" : "smjernica iznad"}:

${examples}

Sad napiši poruku za ${input.leadName}.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const draft =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!draft) {
      return { ok: false, error: "AI nije vratio tekst" };
    }

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
