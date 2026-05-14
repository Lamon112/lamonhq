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

  const [{ data: students }, { data: pending }] = await Promise.all([
    sb
      .from("coach_students")
      .select(
        "id, full_name, niche, primary_platform, monthly_goal_eur, status, months_paid, monthly_fee_eur, ai_roadmap_generated_at",
      )
      .order("start_date", { ascending: false }),
    sb
      .from("coach_checkins")
      .select(
        "id, student_id, week_number, ai_generated_at, leonardo_approved, coach_students(full_name)",
      )
      .eq("leonardo_approved", false)
      .not("ai_generated_at", "is", null)
      .order("ai_generated_at", { ascending: false }),
  ]);

  const pendingFlat = (pending ?? []).map(
    (p: {
      id: string;
      student_id: string;
      week_number: number;
      ai_generated_at: string | null;
      leonardo_approved: boolean;
      coach_students?: { full_name?: string } | { full_name?: string }[];
    }) => {
      const stRel = Array.isArray(p.coach_students)
        ? p.coach_students[0]
        : p.coach_students;
      return {
        id: p.id,
        student_id: p.student_id,
        student_name: stRel?.full_name ?? "?",
        week_number: p.week_number,
        ai_generated_at: p.ai_generated_at,
        leonardo_approved: p.leonardo_approved,
      };
    },
  );

  return NextResponse.json({
    students: students ?? [],
    pendingCheckins: pendingFlat,
  });
}
