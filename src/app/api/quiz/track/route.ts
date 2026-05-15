/**
 * POST /api/quiz/track
 *   body: { id: string, event: "skool_cta_click" | "dm_clicked" | ... }
 *
 * Lightweight conversion-intent tracker. Bumps quiz_leads.status to
 * 'skool_invited' when CTA clicked. Future: push to activity feed.
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

interface Body {
  id: string;
  event: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.id || !body.event) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Map known events to status pipeline positions.
  let nextStatus: string | null = null;
  if (body.event === "skool_cta_click") nextStatus = "skool_invited";

  if (nextStatus) {
    await sb
      .from("quiz_leads")
      .update({ status: nextStatus })
      .eq("id", body.id);
  }

  return NextResponse.json({ ok: true });
}
