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

  try {
    const [callersRes, queueRes, payoutsRes] = await Promise.all([
      sb
        .from("cold_callers")
        .select(
          "id, full_name, status, trial_started_at, trial_ends_at, go_no_go_decision",
        )
        .order("created_at", { ascending: false }),
      sb
        .from("clinic_call_queue")
        .select(
          "id, clinic_name, phone_e164, decision_maker_name, status, attempts_made, max_attempts, final_outcome, assigned_caller_id, cold_callers(full_name)",
        )
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("caller_payouts")
        .select(
          "caller_id, amount_eur, paid_at, reason, cold_callers(full_name)",
        ),
    ]);

    const queueFlat = (queueRes.data ?? []).map(
      (q: {
        id: string;
        clinic_name: string;
        phone_e164: string;
        decision_maker_name: string | null;
        status: string;
        attempts_made: number;
        max_attempts: number;
        final_outcome: string | null;
        assigned_caller_id: string | null;
        cold_callers?: { full_name?: string } | { full_name?: string }[];
      }) => {
        const cc = Array.isArray(q.cold_callers)
          ? q.cold_callers[0]
          : q.cold_callers;
        return {
          id: q.id,
          clinic_name: q.clinic_name,
          phone_e164: q.phone_e164,
          decision_maker_name: q.decision_maker_name,
          status: q.status,
          attempts_made: q.attempts_made,
          max_attempts: q.max_attempts,
          final_outcome: q.final_outcome,
          assigned_caller_id: q.assigned_caller_id,
          caller_name: cc?.full_name ?? null,
        };
      },
    );

    // Aggregate payouts per caller
    const summaryMap = new Map<
      string,
      { caller_id: string; caller_name: string; earned_total_eur: number; unpaid_eur: number; closes_count: number; quality_zooms_count: number }
    >();
    for (const p of payoutsRes.data ?? []) {
      const cc = Array.isArray(p.cold_callers)
        ? p.cold_callers[0]
        : p.cold_callers;
      const callerName = cc?.full_name ?? "?";
      const entry = summaryMap.get(p.caller_id) ?? {
        caller_id: p.caller_id,
        caller_name: callerName,
        earned_total_eur: 0,
        unpaid_eur: 0,
        closes_count: 0,
        quality_zooms_count: 0,
      };
      entry.earned_total_eur += p.amount_eur ?? 0;
      if (!p.paid_at) entry.unpaid_eur += p.amount_eur ?? 0;
      if (p.reason?.includes("close")) entry.closes_count++;
      if (p.reason?.includes("zoom")) entry.quality_zooms_count++;
      summaryMap.set(p.caller_id, entry);
    }

    return NextResponse.json({
      callers: callersRes.data ?? [],
      queue: queueFlat,
      payouts: Array.from(summaryMap.values()),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "load failed" });
  }
}
