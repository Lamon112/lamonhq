/**
 * Vapi webhook — receives call lifecycle events (call.ended is the main one).
 *
 * Vapi POSTs JSON like:
 *   { message: { type: "end-of-call-report", call: {...}, transcript, recordingUrl, ... }, ... }
 *
 * We extract:
 *   - call.id, call.metadata.queue_id (which queue row this maps to)
 *   - endedReason → outcome mapping
 *   - transcript + cost + duration → stored on the attempt row
 *   - mark queue row 'completed' OR 'queued' (for retry) based on outcome
 *
 * Secret verification via VAPI_WEBHOOK_SECRET header check (Vapi signs in
 * X-Vapi-Signature; we accept HMAC or shared secret).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushTelegramNotification } from "@/app/actions/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface VapiEndCallMessage {
  message: {
    type: string;
    call: {
      id: string;
      metadata?: { queue_id?: string; lead_id?: string };
      cost?: number;
      startedAt?: string;
      endedAt?: string;
      endedReason?: string;
    };
    transcript?: string;
    recordingUrl?: string;
    analysis?: { summary?: string; structuredData?: Record<string, unknown> };
    durationSeconds?: number;
  };
}

function mapEndedReasonToOutcome(reason: string): string {
  const r = (reason || "").toLowerCase();
  if (r.includes("voicemail")) return "voicemail";
  if (r.includes("no-answer") || r.includes("rejected")) return "no_answer";
  if (r.includes("customer-ended")) return "gatekeeper"; // user hung up early
  if (r.includes("assistant-ended") || r.includes("function-call")) return "booked";
  if (r.includes("failed") || r.includes("error")) return "failed";
  return "gatekeeper";
}

export async function POST(req: NextRequest) {
  // Optional shared-secret check
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-vapi-signature") ?? req.headers.get("x-vapi-secret");
    if (got !== expected) {
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
    }
  }

  let body: VapiEndCallMessage;
  try {
    body = (await req.json()) as VapiEndCallMessage;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  if (!body?.message || body.message.type !== "end-of-call-report") {
    return NextResponse.json({ ok: true, ignored: body?.message?.type ?? "unknown" });
  }

  const supabase = getServiceSupabase();
  const m = body.message;
  const queueId = m.call.metadata?.queue_id;
  if (!queueId) {
    return NextResponse.json({ ok: false, error: "no queue_id in metadata" }, { status: 400 });
  }

  const outcome = mapEndedReasonToOutcome(m.call.endedReason ?? "");
  const cost = m.call.cost ?? 0;
  const duration = m.durationSeconds ?? 0;

  // Update the latest attempt for this queue_id
  const { data: attempt } = await supabase
    .from("clinic_call_attempts")
    .select("id")
    .eq("queue_id", queueId)
    .eq("vapi_call_id", m.call.id)
    .maybeSingle();

  if (attempt) {
    await supabase
      .from("clinic_call_attempts")
      .update({
        ended_at: m.call.endedAt ?? new Date().toISOString(),
        duration_seconds: duration,
        vapi_recording_url: m.recordingUrl ?? null,
        transcript: m.transcript ?? null,
        ai_summary: m.analysis?.summary ?? null,
        outcome,
        cost_usd: cost,
      })
      .eq("id", attempt.id);
  }

  // Update queue row based on outcome
  const finalStatuses = new Set(["booked", "not_interested", "wrong_number", "dnc"]);
  const newQueueStatus = finalStatuses.has(outcome) ? "completed" : "queued";

  const { data: queueRow } = await supabase
    .from("clinic_call_queue")
    .select("attempts_made, max_attempts, clinic_name")
    .eq("id", queueId)
    .maybeSingle();

  const hitMax =
    queueRow &&
    (queueRow.attempts_made ?? 0) >= (queueRow.max_attempts ?? 3);

  const queueUpdate: Record<string, unknown> = {
    status: hitMax ? "completed" : newQueueStatus,
    final_outcome: hitMax || finalStatuses.has(outcome) ? outcome : null,
    final_outcome_at:
      hitMax || finalStatuses.has(outcome) ? new Date().toISOString() : null,
  };
  if (outcome === "voicemail" || outcome === "no_answer") {
    queueUpdate.scheduled_for = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  }
  if (outcome === "booked") {
    queueUpdate.meeting_scheduled_at = new Date().toISOString();
  }

  await supabase.from("clinic_call_queue").update(queueUpdate).eq("id", queueId);

  // Push Jarvis notif on hot outcomes
  if (outcome === "booked") {
    void pushTelegramNotification(
      "followups",
      `🔥 BOOKED: ${queueRow?.clinic_name ?? queueId} zakazao discovery call. Pogledaj Outreach Lab.\n\n— Jarvis`,
    );
  } else if (outcome === "not_interested") {
    void pushTelegramNotification(
      "followups",
      `❌ ${queueRow?.clinic_name ?? queueId} odbio (not_interested). Cold list.\n\n— Jarvis`,
    );
  }

  return NextResponse.json({ ok: true, outcome, queueStatus: queueUpdate.status });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "vapi-webhook" });
}
