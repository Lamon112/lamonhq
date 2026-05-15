/**
 * GET /api/quiz/lead/[id]
 *
 * Returns the freshly persisted quiz lead so the result page can poll
 * while Claude is still generating (initial submit can take ~30s).
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("quiz_leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
