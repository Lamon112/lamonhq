/**
 * Authenticated trigger for Niche Hunter — called from the panel
 * "Run NOW" button. No Bearer needed; the user is already logged in
 * via Supabase auth (RoomModal only renders for authenticated users).
 *
 * Sends an Inngest event "niche-hunter.run" which fires the cron
 * function (registered with both schedule + event triggers).
 */

import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await inngest.send({
      name: "niche-hunter.run",
      data: { manual: true, userId: user.id },
    });
    return NextResponse.json({ ok: true, eventId: result.ids?.[0] ?? null });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "trigger failed",
    });
  }
}
