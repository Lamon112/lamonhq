import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_OAUTH_CLIENT_ID nije postavljen u Vercel env vars" },
      { status: 500 },
    );
  }

  const redirectUri = `${APP_URL}/api/integrations/gmail/callback`;

  // Build state with embedded user_id (signed with secret-ish — Supabase auth cookie
  // is the actual auth check at callback, this is just CSRF / context binding).
  const state = crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback")
    .update(`${userData.user.id}:${Date.now()}`)
    .digest("hex")
    .slice(0, 24);

  const url = buildAuthUrl({ clientId, redirectUri, state });
  // Persist state on a short-lived cookie so callback can verify
  const res = NextResponse.redirect(url);
  res.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 600,
    path: "/",
  });
  return res;
}
