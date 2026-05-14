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
  const { data, error } = await sb
    .from("video_scripts")
    .select(
      "id, cycle_id, target_platform, target_account, slot_label, title, hook_3sec, body_structure, full_script, cta, duration_estimate_sec, hashtags, viral_prediction, conversion_prediction, rationale, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ scripts: [], error: error.message });
  return NextResponse.json({ scripts: data ?? [] });
}
