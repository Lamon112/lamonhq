/**
 * Manual trigger for Niche Hunter cron — Inngest event "niche-hunter.run".
 * Hit this endpoint to fire a cycle outside the bi-weekly schedule.
 *
 * Auth: Bearer CRON_SECRET (same as Vercel cron auth).
 * Example: curl -X POST -H "Authorization: Bearer XYZ" https://lamon-hq.vercel.app/api/triggers/niche-hunter
 */

import { NextResponse, type NextRequest } from "next/server";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await inngest.send({ name: "niche-hunter.run", data: { manual: true } });
  return NextResponse.json({ ok: true, eventId: result.ids?.[0] ?? null });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "niche-hunter-trigger",
    usage: "POST with Authorization: Bearer CRON_SECRET",
  });
}
