/**
 * Per-tier transcript probe — runs each tier independently and reports
 * timing + first-200 chars of result OR scrubbed error.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function scrub(s: string): string {
  return s
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[A-Za-z0-9_-]{15,}/g, "[id]")
    .slice(0, 600);
}

export async function GET() {
  const out: Record<string, unknown> = {};

  // Tier 1: youtube-transcript-api relay
  const t1 = Date.now();
  try {
    // @ts-expect-error no types
    const mod = (await import("youtube-transcript-api")) as {
      default: new () => {
        ready: Promise<void>;
        getTranscript: (id: string) => Promise<unknown>;
      };
    };
    out.tier1_import_ms = Date.now() - t1;
    const Cl = mod.default;
    const initStart = Date.now();
    const c = new Cl();
    await c.ready;
    out.tier1_ready_ms = Date.now() - initStart;
    const fetchStart = Date.now();
    const r = await c.getTranscript("OJ9WQy0Dt40");
    out.tier1_fetch_ms = Date.now() - fetchStart;
    out.tier1_result_keys = r ? Object.keys(r as object) : null;
    out.tier1_result_preview = JSON.stringify(r).slice(0, 600);
  } catch (e) {
    out.tier1_error = scrub(e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json(out);
}
