/**
 * Clinic Caller cron — runs every 15 min during business hours.
 *
 * Picks the next queued lead whose call_window matches now() and whose
 * scheduled_for has elapsed, places a Vapi call, and waits for the
 * webhook to record the outcome.
 *
 * Throttle: max 5 concurrent active calls (Vapi rate + Leonardo's "be
 * polite, don't blast" preference). Throttle is enforced by counting
 * status='calling' rows before we kick a new one.
 */

import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { placeCall } from "@/lib/vapi";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const MAX_CONCURRENT = 5;

export const clinicCallerCron = inngest.createFunction(
  {
    id: "clinic-caller-cron",
    name: "Clinic Caller — outbound call dispatcher",
    retries: 1,
    triggers: [{ cron: "*/15 * * * *" }], // every 15 min
  },
  async ({ step }) => {
    const supabase = getServiceSupabase();

    if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
      return { ok: true, skipped: "vapi env not configured" };
    }

    // 1. Check concurrent in-flight calls
    const activeCount = await step.run("count-active", async () => {
      const { count } = await supabase
        .from("clinic_call_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "calling");
      return count ?? 0;
    });

    if (activeCount >= MAX_CONCURRENT) {
      return { ok: true, throttled: true, activeCount };
    }

    const slots = MAX_CONCURRENT - activeCount;
    const nowTime = new Date().toTimeString().slice(0, 8);

    // 2. Pick next eligible queued items
    const eligible = await step.run("pick-eligible", async () => {
      const { data } = await supabase
        .from("clinic_call_queue")
        .select("*")
        .eq("status", "queued")
        .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
        .lte("call_window_start", nowTime)
        .gte("call_window_end", nowTime)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(slots);
      return data ?? [];
    });

    if (eligible.length === 0) {
      return { ok: true, eligible: 0 };
    }

    let placed = 0;
    let errors: string[] = [];

    for (const queueRow of eligible) {
      try {
        // Mark calling first (optimistic — webhook will confirm)
        await supabase
          .from("clinic_call_queue")
          .update({
            status: "calling",
            attempts_made: (queueRow.attempts_made ?? 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", queueRow.id);

        const call = await placeCall({
          assistantId:
            queueRow.vapi_assistant_id ?? process.env.VAPI_ASSISTANT_ID!,
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID!,
          customer: {
            number: queueRow.phone_e164,
            name: queueRow.decision_maker_name ?? queueRow.clinic_name,
          },
          assistantOverrides: {
            variableValues: {
              clinicName: queueRow.clinic_name,
              decisionMakerName: queueRow.decision_maker_name ?? "",
              language: queueRow.language ?? "hr",
            },
          },
          metadata: { queue_id: queueRow.id, lead_id: queueRow.lead_id ?? "" },
        });

        await supabase.from("clinic_call_attempts").insert({
          queue_id: queueRow.id,
          attempt_number: (queueRow.attempts_made ?? 0) + 1,
          vapi_call_id: call.id,
        });

        placed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${queueRow.clinic_name}: ${msg}`);
        // Roll back status so it gets retried
        await supabase
          .from("clinic_call_queue")
          .update({ status: "queued" })
          .eq("id", queueRow.id);
      }
    }

    return { ok: true, placed, eligible: eligible.length, errors: errors.length };
  },
);
