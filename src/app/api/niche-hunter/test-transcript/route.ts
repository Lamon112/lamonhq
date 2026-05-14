/**
 * Diagnostic — verify youtube-transcript actually works in Vercel serverless.
 * Returns transcript text length + language for one hardcoded video.
 */
import { NextResponse } from "next/server";
import { fetchTranscript } from "@/lib/youtubeTranscript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const start = Date.now();
  try {
    // Carl Faceless video — known to have English captions
    const tx = await fetchTranscript("OJ9WQy0Dt40");
    const elapsed = Date.now() - start;
    if (!tx) {
      return NextResponse.json({
        ok: false,
        elapsed_ms: elapsed,
        error: "fetchTranscript returned null",
      });
    }
    return NextResponse.json({
      ok: true,
      elapsed_ms: elapsed,
      videoId: tx.videoId,
      language: tx.language,
      word_count: tx.text.split(/\s+/).length,
      preview: tx.text.slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      elapsed_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.slice(0, 500) : null,
    });
  }
}
