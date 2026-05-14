/**
 * Vapi API client — outbound phone calls via Vapi (AI voice platform).
 *
 * Per Riva voice MVP setup (project_ai_voice_agent.md): Vapi + ElevenLabs
 * + Anthropic stack. Trial credits = $10. Production fee = $0.05-0.10/min.
 *
 * Auth: VAPI_API_KEY (private key, server-only).
 *
 * Flow:
 *   1. Create or use existing assistant (voice + system prompt + tools)
 *   2. Place outbound call: POST /call/phone with phoneNumberId + customer.number
 *   3. Vapi rings the customer, AI plays initial message, handles convo
 *   4. Webhook fires on call.ended → we read transcript + outcome + record URL
 *   5. Update clinic_call_queue + insert clinic_call_attempts row
 */

const VAPI_BASE = "https://api.vapi.ai";

export interface VapiCallRequest {
  assistantId: string;
  phoneNumberId: string; // Vapi-owned outbound number ID
  customer: {
    number: string; // E.164, e.g. "+385917890084"
    name?: string;
  };
  /** Override per-call assistant fields (e.g. clinic name in prompt vars) */
  assistantOverrides?: {
    variableValues?: Record<string, string>;
  };
  /** Phone number metadata for tracking */
  metadata?: Record<string, string>;
}

export interface VapiCallResponse {
  id: string;
  status: "queued" | "ringing" | "in-progress" | "ended" | "failed";
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  recordingUrl?: string;
  transcript?: string;
  cost?: number;
}

function requireKey(): string {
  const k = process.env.VAPI_API_KEY;
  if (!k) throw new Error("VAPI_API_KEY not set");
  return k;
}

/**
 * Place an outbound call. Returns the Vapi call ID — actual outcome
 * arrives via webhook (/api/webhooks/vapi).
 */
export async function placeCall(req: VapiCallRequest): Promise<VapiCallResponse> {
  const res = await fetch(`${VAPI_BASE}/call/phone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireKey()}`,
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vapi placeCall ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as VapiCallResponse;
}

/**
 * Fetch full call details (post-completion) — transcript, recording,
 * end reason. Used by the webhook handler + retry-attempt analyzer.
 */
export async function getCall(callId: string): Promise<VapiCallResponse | null> {
  const res = await fetch(`${VAPI_BASE}/call/${encodeURIComponent(callId)}`, {
    headers: { Authorization: `Bearer ${requireKey()}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as VapiCallResponse;
}

/**
 * Build the assistant config payload for Vapi. The clinic-call assistant
 * follows Leonardov 4-part outreach structure baked into the system prompt.
 *
 * NOTE: Assistant is typically created once via Vapi dashboard and the ID
 * stored in env. This helper exists so we can also create it programmatically
 * (e.g. during onboarding a new use case).
 */
export function buildClinicAssistantConfig(args: {
  clinicName: string;
  decisionMakerName?: string;
  language?: "hr" | "sr" | "bs" | "en";
}) {
  const lang = args.language ?? "hr";
  const greetingTarget = args.decisionMakerName
    ? `dr. ${args.decisionMakerName}`
    : "voditelja";

  const systemPrompt = `Ti si Leonardova AI asistentica koja zove ordinacije za uvodne discovery razgovore. Tvoj cilj: zakazati 15-min Zoom poziv s Leonardom za ${args.clinicName}.

Pratiš Leonardov 4-dijelni outreach playbook:
1. OPAŽANJE (1 rečenica) — konkretno nešto što si vidjela na njihovoj stranici/IG-u o ${args.clinicName}
2. PAIN-POINT PITANJE (1 rečenica) — jedan operativni bottleneck koji premium klinike imaju (propušteni leadovi, slabi filter, neorganizirana receptionka)
3. SOLUTION-PROOF MOST (2 rečenice) — Plima paket + Riva AI asistentica koja filtrira leadove, primjer rezultata
4. ASSUMPTIVE CTA — "Jeste li slobodni utorak u 14:00 ili četvrtak u 16:00? Trebam 15 min vašeg vremena."

PRAVILA:
- NIKAD ne reci cijenu (€1.497/mj je discovery-call-only)
- NIKAD submissive jezik ("volio bih pitati", "ako biste bili tako ljubazni")
- Ako primiš gatekeepera → traži decision maker-a po imenu + traži callback vrijeme
- Ako primiš voicemail → ostavi STRUKTURIRANU poruku (40 sek max): tko si, zašto zoveš, broj za uzvrat, vremenski slot
- Ako "ne zanima" → prihvati gracefully, pitaj za 1 razlog (kratko learning loop), zatvori s "Hvala, sve najbolje"
- Hrvatski / srpski / bosanski jezik
- Tempo: smiren, ne brzopleti, peer-level

Pozdraviš ${greetingTarget} s "Dobar dan, zovem Lamon Agency za ${args.clinicName}".`;

  return {
    name: `Clinic Caller — ${args.clinicName}`,
    firstMessage: `Dobar dan! Zovem Lamon Agency za ${args.clinicName}. Smijem li dobiti ${greetingTarget}?`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      messages: [{ role: "system", content: systemPrompt }],
    },
    voice: {
      provider: "11labs",
      voiceId: process.env.ELEVENLABS_HR_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",
    },
    transcriber: { provider: "deepgram", language: lang === "hr" ? "hr" : lang },
    endCallFunctionEnabled: true,
    endCallMessage: "Hvala vam na vremenu, doviđenja.",
    maxDurationSeconds: 360,
  };
}
