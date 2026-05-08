import { NextResponse, type NextRequest } from "next/server";
import { generateFollowUpsForAllUsers } from "@/app/actions/followUps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await generateFollowUpsForAllUsers();
  return NextResponse.json(result);
}
