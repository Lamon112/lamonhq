import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, fetchUserEmail } from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://lamon-hq.vercel.app";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const target = new URL("/integrations", APP_URL);

  if (error) {
    target.searchParams.set("gmail_error", error);
    return NextResponse.redirect(target);
  }

  if (!code) {
    target.searchParams.set("gmail_error", "missing_code");
    return NextResponse.redirect(target);
  }

  // Verify state cookie (CSRF)
  const stateCookie = request.cookies.get("gmail_oauth_state")?.value;
  if (!stateCookie || stateCookie !== state) {
    target.searchParams.set("gmail_error", "state_mismatch");
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    target.searchParams.set("gmail_error", "not_logged_in");
    return NextResponse.redirect(target);
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    target.searchParams.set("gmail_error", "missing_env");
    return NextResponse.redirect(target);
  }

  const redirectUri = `${APP_URL}/api/integrations/gmail/callback`;
  const exchanged = await exchangeCode({
    code,
    clientId,
    clientSecret,
    redirectUri,
  });
  if (!exchanged.ok || !exchanged.tokens) {
    target.searchParams.set(
      "gmail_error",
      exchanged.error ?? "token_exchange_failed",
    );
    return NextResponse.redirect(target);
  }

  // Fetch the email address that owns the access token
  const ui = await fetchUserEmail(exchanged.tokens.access_token);
  if (ui.error || !ui.email) {
    target.searchParams.set("gmail_error", ui.error ?? "userinfo_failed");
    return NextResponse.redirect(target);
  }

  const config = {
    email: ui.email,
    access_token: exchanged.tokens.access_token,
    refresh_token: exchanged.tokens.refresh_token,
    expiry_date: exchanged.tokens.expiry_date,
    scope: exchanged.tokens.scope,
    setup_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from("integrations")
    .upsert(
      {
        user_id: userData.user.id,
        provider: "gmail",
        config,
      },
      { onConflict: "user_id,provider" },
    );

  if (upsertErr) {
    target.searchParams.set("gmail_error", upsertErr.message);
    return NextResponse.redirect(target);
  }

  target.searchParams.set("gmail", "connected");
  const res = NextResponse.redirect(target);
  res.cookies.set("gmail_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}
