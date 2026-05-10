"use server";

/**
 * Onboarding step-marking server actions.
 *
 * Steward Client HQ pipeline shows a 6-step onboarding checklist per
 * lead in the "onboarding" stage. Each step toggle hits one of these
 * actions, which write the ISO timestamp into leads.onboarding_status
 * jsonb (or clear it back to null on un-toggle).
 *
 * RLS: owner-only via the user-scoped Supabase client. Service role is
 * NOT used here — Leonardo is the only authenticated user, so the
 * owner check via auth.uid() handles authorization naturally.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VALID_STEPS = [
  "intake_sent_at",
  "intake_returned_at",
  "ai_configured_at",
  "shadow_test_at",
  "live_cutover_at",
  "first_review_at",
] as const;

export type OnboardingStep = (typeof VALID_STEPS)[number];

interface OkResult {
  ok: true;
  status: Record<string, string | null>;
}
interface ErrResult {
  ok: false;
  error: string;
}
type Result = OkResult | ErrResult;

/**
 * Toggle a single onboarding step. `done=true` writes the current ISO
 * timestamp; `done=false` clears it back to null so Leonardo can undo
 * a misclick without leaving stale data.
 */
export async function markOnboardingStep(
  leadId: string,
  step: string,
  done: boolean,
): Promise<Result> {
  if (!VALID_STEPS.includes(step as OnboardingStep)) {
    return { ok: false, error: `Unknown onboarding step: ${step}` };
  }
  const supabase = await createClient();

  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("onboarding_status")
    .eq("id", leadId)
    .single();
  if (fetchErr || !lead) {
    return { ok: false, error: fetchErr?.message ?? "lead not found" };
  }

  const current =
    (lead.onboarding_status as Record<string, string | null> | null) ?? {};
  const newStatus = {
    ...current,
    [step]: done ? new Date().toISOString() : null,
  };

  const { error: updateErr } = await supabase
    .from("leads")
    .update({ onboarding_status: newStatus })
    .eq("id", leadId);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/");
  return { ok: true, status: newStatus };
}

/**
 * Initialize onboarding for a freshly-closed lead. Sets stage to
 * closed_won (idempotent) AND seeds onboarding_status with intake_sent_at
 * = now so the lead appears at step 1/6 in the Client HQ pipeline.
 *
 * Used by the "Pokreni onboarding" button on closed_won leads that
 * still have a null onboarding_status.
 */
export async function startOnboarding(leadId: string): Promise<Result> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const seed = { intake_sent_at: nowIso };

  const { error } = await supabase
    .from("leads")
    .update({ onboarding_status: seed, stage: "closed_won" })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true, status: seed };
}
