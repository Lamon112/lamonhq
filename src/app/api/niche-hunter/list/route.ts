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
    const [drops, runs] = await Promise.all([
      sb
        .from("niche_drops")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("niche_hunter_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      drops: drops.data ?? [],
      runs: runs.data ?? [],
      error: drops.error?.message ?? runs.error?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json({
      drops: [],
      runs: [],
      error: e instanceof Error ? e.message : "load failed",
    });
  }
}
