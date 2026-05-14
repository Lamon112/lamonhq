/**
 * Diagnostic — exercise fetchTranscript end-to-end + show which tier won.
 */
import { NextResponse } from "next/server";
import { fetchTranscript } from "@/lib/youtubeTranscript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const start = Date.now();
  try {
    const t = await fetchTranscript("OJ9WQy0Dt40");
    if (!t) {
      return NextResponse.json({
        ok: false,
        elapsed_ms: Date.now() - start,
        error: "all tiers returned null",
      });
    }
    return NextResponse.json({
      ok: true,
      elapsed_ms: Date.now() - start,
      videoId: t.videoId,
      language: t.language,
      word_count: t.word_count,
      preview_first_300: t.text.slice(0, 300),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false,
      elapsed_ms: Date.now() - start,
      error_safe: msg
        .replace(/https?:\/\/\S+/g, "[url]")
        .replace(/[A-Za-z0-9_-]{15,}/g, "[id]")
        .slice(0, 600),
    });
  }
}
