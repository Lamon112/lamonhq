"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `Ti si Leonardo Lamon, founder Lamon Agency. Pripremaš se za Discovery poziv s vlasnikom stomatološke ordinacije ili premium B2C coachem.

Cilj poziva: razumjeti njihovu trenutnu situaciju, identificirati pain-pointove, demonstrirati kako naš AI receptionist (Rast paket: 1.997€ setup + 1.497€/mj) rješava te pain-pointove i zaključiti follow-up korake.

Iz danih lead notes (ICP score, premium signals, financial intel, social presence, AI reasoning), generiraj **5-7 konkretnih pitanja** koja Leonardo treba postaviti tijekom poziva. Pitanja moraju biti:

1. **Specifična** — referenciraj brojke ili signale iz lead notes (npr. "Vidim da ste u 2024 rasli 60% YoY..."), ne generične
2. **Otvorena** — počinju s "Kako", "Tko", "Kada", "Što", "Zašto" — nikad da/ne pitanja
3. **Pain-discovery prije pitch-a** — prva 3 pitanja istražuju njihov svijet, posljednja 2 mostavaju prema našem rješenju
4. **U Leonardov tone** — direktan, peer-to-peer, hrvatski, bez sales buzzwords ("synergy", "leverage")

Format:
\`\`\`
1. [Pitanje]
   Zašto: [1-rečenična bilješka — što se nadamo otkriti]

2. [Pitanje]
   Zašto: [...]

(itd.)
\`\`\`

Vrati SAMO numeriranu listu pitanja u tom formatu. Bez markdown headera, bez "Evo prijedloga:". Vrati direktno listu.`;

export interface BriefQuestionsResult {
  ok: boolean;
  questions?: string;
  error?: string;
}

export async function generateBriefQuestions(
  leadId: string,
): Promise<BriefQuestionsResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, name, notes, icp_score, icp_breakdown, stage, discovery_at, source, niche, estimated_value",
    )
    .eq("id", leadId)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !lead) {
    return { ok: false, error: error?.message ?? "Lead nije pronađen" };
  }

  const userMessage = `# Lead profil

**Naziv:** ${lead.name}
**ICP score:** ${lead.icp_score ?? 0}/20
${lead.niche ? `**Niche:** ${lead.niche}` : ""}
${lead.source ? `**Source:** ${lead.source}` : ""}
${lead.discovery_at ? `**Discovery termin:** ${new Date(lead.discovery_at as string).toLocaleString("hr-HR")}` : ""}

**ICP breakdown:**
${
  lead.icp_breakdown
    ? Object.entries(lead.icp_breakdown as Record<string, number>)
        .map(([k, v]) => `- ${k}: ${v}/4`)
        .join("\n")
    : "(nema breakdowna)"
}

# Lead notes (AI reasoning, premium signals, financial intel, social, vlasnici)

${lead.notes ?? "(prazno)"}

---

Sad generiraj 5-7 specifičnih pitanja koja ću pitati ovog vlasnika tijekom Discovery poziva. Reference konkretne brojke iz notes-a kad god je moguće.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
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
    const questions =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!questions) {
      return { ok: false, error: "AI nije vratio pitanja" };
    }

    return { ok: true, questions };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI greška",
    };
  }
}
