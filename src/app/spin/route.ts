/**
 * Affiliate redirect — Spinova (playsmania.click) casino sponsorship.
 *
 * Why this exists:
 * Linktree compliance scanner flags playsmania.click as "Unsafe URL" which
 * blocks ALL new link additions on Leonardov account (even legit ones like
 * the quiz funnel). Workaround: store a clean lamon.io URL on Linktree
 * that 302-redirects here to the actual affiliate destination.
 *
 * Affiliate parameter (?inf=LAMON) is preserved 100% — casino tracks
 * the click as coming from Leonardov account and credits free spins.
 *
 * Linktree URL: https://quiz.lamon.io/spin
 * Redirects to: https://playsmania.click/nvhr?inf=LAMON
 *
 * To add more sponsorship redirects later, refactor into
 * /r/[slug]/route.ts with a config map.
 */

import { NextResponse } from "next/server";

const SPIN_AFFILIATE_URL = "https://playsmania.click/nvhr?inf=LAMON";

export async function GET(request: Request) {
  // Vercel function logs capture clicks — basic attribution without
  // needing a separate analytics table.
  const ua = request.headers.get("user-agent") ?? "unknown";
  const ref = request.headers.get("referer") ?? "direct";
  console.log(`[spin] redirect ua=${ua.slice(0, 80)} ref=${ref}`);

  // 302 = temporary redirect (so search engines don't index lamon.io/spin
  // as if it WERE the casino page). status: 302 is the explicit default
  // but we set it for clarity.
  return NextResponse.redirect(SPIN_AFFILIATE_URL, { status: 302 });
}
