import { NextResponse, type NextRequest } from "next/server";
import { generateBriefingsForAllUsers } from "@/app/actions/briefing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily morning briefing cron — Vercel cron hits this at 06:00 UTC
 * (= 07:00 / 08:00 Europe/Zagreb depending on DST).
 *
 * Vercel adds the Authorization: Bearer <CRON_SECRET> header automatically
 * when you set CRON_SECRET in Vercel env vars.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateBriefingsForAllUsers();
  return NextResponse.json(result);
}
