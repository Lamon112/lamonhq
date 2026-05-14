import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [{ data: queue }, { data: attempts }] = await Promise.all([
    sb
      .from("clinic_call_queue")
      .select(
        "id, clinic_name, phone_e164, decision_maker_name, status, attempts_made, max_attempts, last_attempt_at, final_outcome",
      )
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("clinic_call_attempts")
      .select(
        "id, queue_id, outcome, duration_seconds, cost_usd, vapi_recording_url, ai_summary, started_at, clinic_call_queue(clinic_name)",
      )
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const attemptsFlat = (attempts ?? []).map(
    (a: {
      id: string;
      queue_id: string;
      outcome: string | null;
      duration_seconds: number | null;
      cost_usd: number;
      vapi_recording_url: string | null;
      ai_summary: string | null;
      started_at: string;
      clinic_call_queue?: { clinic_name?: string } | { clinic_name?: string }[];
    }) => {
      const q = Array.isArray(a.clinic_call_queue)
        ? a.clinic_call_queue[0]
        : a.clinic_call_queue;
      return {
        id: a.id,
        queue_id: a.queue_id,
        clinic_name: q?.clinic_name ?? "?",
        outcome: a.outcome,
        duration_seconds: a.duration_seconds,
        cost_usd: a.cost_usd,
        vapi_recording_url: a.vapi_recording_url,
        ai_summary: a.ai_summary,
        started_at: a.started_at,
      };
    },
  );

  return NextResponse.json({ queue: queue ?? [], recentAttempts: attemptsFlat });
}
