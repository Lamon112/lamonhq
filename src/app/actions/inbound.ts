"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";
import { pushTelegramNotification } from "./telegram";

export type InboundCategory =
  | "interested"
  | "objection"
  | "scheduling"
  | "question"
  | "not_now"
  | "unsubscribe"
  | "out_of_office"
  | "unclear";

export type InboundChannel =
  | "linkedin"
  | "email"
  | "instagram"
  | "tiktok"
  | "manual";

export interface ReplyDraft {
  angle: string;
  text: string;
}

export interface InboundMessage {
  id: string;
  lead_id: string | null;
  channel: InboundChannel;
  sender_name: string | null;
  raw_text: string;
  category: InboundCategory | null;
  summary: string | null;
  suggested_stage: string | null;
  reply_drafts: ReplyDraft[];
  reasoning: string | null;
  status: "new" | "replied" | "dismissed" | "archived";
  received_at: string;
}

const TRIAGE_SYSTEM_PROMPT = `Ti si AI Inbox Triage za Leonardo Lamon (Lamon Agency: Rast paket B2B klinike 1.997€ setup + 1.497€/mj, Growth Operator B2C coaches 1.500€/mj).

Prima ti incoming poruku od potencijalnog klijenta. Tvoj zadatak: KLASIFICIRAJ + GENERIRAJ 2 reply drafte.

# Kategorije (odaberi JEDNU):
- **interested** — žele saznati više, traže call, otvoreni za demo. Pozitivan signal.
- **objection** — imaju zamjerku (cijena, fit, vremenski, tehnički). Treba handled.
- **scheduling** — predlažu termin / pitaju kad si slobodan. Treba potvrda.
- **question** — pitaju nešto specifično o ponudi/procesu. Treba direktan odgovor.
- **not_now** — "možda kasnije", "trenutno fokusiran na drugo". Soft no.
- **unsubscribe** — eksplicitno ne / ne kontaktiraj me. Hard no.
- **out_of_office** — auto-reply, ode na godišnji.
- **unclear** — ne mogu utvrditi (kratko, off-topic, generic).

# Reply strategija po kategoriji:
- interested → potvrdi entuzijazam, predloži 2 specifična slota za call (15 min)
- objection → priznaj zabrinutost, redirect na value/case, mini commitment
- scheduling → potvrdi slot ako fit, drugi predlog ako ne, link na Calendly
- question → direktan odgovor (briefly), pa soft CTA
- not_now → empatija, predloži check-in datum (npr. za mjesec), no pressure
- unsubscribe → "Razumijem, hvala što si javio", remove. NE pokušaj rescue.
- out_of_office → ne odgovaraj, queue za later
- unclear → kratko pitanje koje pojašnjava namjeru

# Pravila za drafte:
1. **2 varijante** s različitim angle-om (npr. "concise confirm" vs "value reinforcement").
2. **Maksimum 4 retka** po draftu.
3. **Hrvatski jezik**, peer-to-peer, premium tone.
4. **NIKAD ne pokušavaj rescue na unsubscribe**.
5. **Potpis:** — Leonardo
6. **CTA MORA eksplicitno predložiti zakazivanje poziva** — pravilna fraza je "Ako ti ima smisla, ajmo zakazati 15-minutni poziv…" ili "Možemo zakazati 15 min u srijedu 11:30 ili četvrtak 16:00?". NIKAD samo "15 min ovaj tjedan?" ili implicitno "javi se".
7. **NE koristi kolokvijalne metafore** kao "curi", "leak", "puca". Umjesto toga koristi cleaner profesionalni jezik:
   - "gdje propuštate prilike" / "gdje se gube prilike"
   - "skriveni gubici" / "gdje točno gubite booking-e"
   - "gdje vam izmiču pacijenti / klijenti"
   Tone: peer-to-peer s vlasnikom biznisa, ne casual.

# Suggested stage:
Predloži kako pomaknuti lead u CRM (jedan od: discovery, pricing, financing, booking, closed_won, closed_lost) ili null ako nema promjene. Npr. interested + spomenula cijenu = "pricing"; predložila termin = "booking".

# Format izlaza — STRIKT JSON:
{
  "category": "interested",
  "summary": "Kratka jedna rečenica što je rekao/la",
  "suggested_stage": "pricing",
  "reply_drafts": [
    {"angle": "concise confirm", "text": "..."},
    {"angle": "value reinforcement", "text": "..."}
  ],
  "reasoning": "1 rečenica zašto si izabrao ovu kategoriju i ove angle-ove"
}

NE dodaj markdown, NE objašnjenja, samo JSON.`;

interface ParsedTriage {
  category: InboundCategory;
  summary: string;
  suggested_stage: string | null;
  reply_drafts: ReplyDraft[];
  reasoning: string;
}

function parseTriage(raw: string): ParsedTriage | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ParsedTriage;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as ParsedTriage;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface TriageInput {
  rawText: string;
  channel: InboundChannel;
  senderName?: string;
  leadId?: string;
}

export async function triageInbound(input: TriageInput): Promise<{
  ok: boolean;
  message?: InboundMessage;
  error?: string;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const text = input.rawText.trim();
  if (!text) return { ok: false, error: "Poruka je prazna" };

  // Build user message with lead context if available
  let leadContext = "";
  if (input.leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("name, niche, stage, icp_score, notes")
      .eq("id", input.leadId)
      .maybeSingle();
    if (lead) {
      leadContext = `\n# Lead context:\n**Ime:** ${lead.name}\n**Niche:** ${lead.niche ?? "?"}\n**Trenutni stage:** ${lead.stage}\n**ICP:** ${lead.icp_score ?? "?"}/20\n**Notes:** ${lead.notes ?? "—"}\n`;
    }
  }

  const userMessage = `# Channel: ${input.channel}${input.senderName ? `\n# Pošiljatelj: ${input.senderName}` : ""}${leadContext}\n# Inbound poruka:\n"""\n${text}\n"""\n\nKlasificiraj + generiraj 2 reply drafta. STRIKT JSON.`;

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: TRIAGE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw =
      textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = parseTriage(raw);
    if (!parsed)
      return {
        ok: false,
        error: `AI nevalidan JSON: ${raw.slice(0, 200)}`,
      };

    const { data, error } = await supabase
      .from("inbound_messages")
      .insert({
        user_id: userData.user.id,
        lead_id: input.leadId ?? null,
        channel: input.channel,
        sender_name: input.senderName ?? null,
        raw_text: text,
        category: parsed.category,
        summary: parsed.summary,
        suggested_stage: parsed.suggested_stage,
        reply_drafts: parsed.reply_drafts,
        reasoning: parsed.reasoning,
        status: "new",
        received_at: new Date().toISOString(),
      })
      .select(
        "id, lead_id, channel, sender_name, raw_text, category, summary, suggested_stage, reply_drafts, reasoning, status, received_at",
      )
      .single();
    if (error) return { ok: false, error: error.message };

    // Push notification (only fires if user enabled inbound notifs)
    const senderLabel = input.senderName ?? "lead";
    const tgText = `📩 *Inbound triage* — _${parsed.category.toUpperCase()}_\n\n*Od:* ${senderLabel}\n*Sažetak:* ${parsed.summary}\n${parsed.suggested_stage ? `*Predlažem stage:* ${parsed.suggested_stage}\n` : ""}\n[Otvori HQ za reply](${process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app"})`;
    void pushTelegramNotification("inbound", tgText, userData.user.id);

    revalidatePath("/");
    return { ok: true, message: data as InboundMessage };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Triage greška",
    };
  }
}

export async function getPendingInbound(): Promise<InboundMessage[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data } = await supabase
    .from("inbound_messages")
    .select(
      "id, lead_id, channel, sender_name, raw_text, category, summary, suggested_stage, reply_drafts, reasoning, status, received_at",
    )
    .eq("status", "new")
    .order("received_at", { ascending: false })
    .limit(20);
  return (data as InboundMessage[]) ?? [];
}

export async function replyToInbound(
  inboundId: string,
  finalText: string,
  applyStage?: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };
  const userId = userData.user.id;

  const { data: msg } = await supabase
    .from("inbound_messages")
    .select(
      "id, lead_id, channel, sender_name, suggested_stage",
    )
    .eq("id", inboundId)
    .maybeSingle();
  if (!msg) return { ok: false, error: "Inbound nije pronađen" };

  const text = finalText.trim();
  if (!text) return { ok: false, error: "Reply je prazan" };

  const platform = (msg.channel === "manual" ? "linkedin" : msg.channel) as
    | "linkedin"
    | "instagram"
    | "tiktok"
    | "email"
    | "other";

  // Resolve lead name
  let leadName = msg.sender_name ?? "lead";
  if (msg.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("name")
      .eq("id", msg.lead_id)
      .maybeSingle();
    if (lead?.name) leadName = lead.name;
  }

  const { data: outreach, error: outErr } = await supabase
    .from("outreach")
    .insert({
      user_id: userId,
      lead_name: leadName,
      platform,
      message: text,
      status: "sent",
    })
    .select("id")
    .single();
  if (outErr) return { ok: false, error: outErr.message };

  if (msg.lead_id) {
    const patch: Record<string, unknown> = {
      last_touchpoint_at: new Date().toISOString(),
    };
    if (applyStage && msg.suggested_stage) {
      patch.stage = msg.suggested_stage;
    }
    await supabase.from("leads").update(patch).eq("id", msg.lead_id);
  }

  await supabase
    .from("inbound_messages")
    .update({
      status: "replied",
      acted_on_at: new Date().toISOString(),
    })
    .eq("id", inboundId);

  void logActivity(userId, {
    type: "outreach_sent",
    title: `Reply → ${leadName}`,
    summary: `${platform.toUpperCase()}: ${text.slice(0, 200)}`,
    hqRoom: "outreach",
    hqRowId: outreach.id,
    tags: [platform, "reply"],
  });

  revalidatePath("/");
  return { ok: true };
}

export async function dismissInbound(
  inboundId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbound_messages")
    .update({
      status: "dismissed",
      acted_on_at: new Date().toISOString(),
    })
    .eq("id", inboundId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function searchLeads(
  q: string,
): Promise<Array<{ id: string; name: string; stage: string | null }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const term = q.trim();
  if (!term) return [];
  const { data } = await supabase
    .from("leads")
    .select("id, name, stage")
    .ilike("name", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    stage: r.stage as string | null,
  }));
}
