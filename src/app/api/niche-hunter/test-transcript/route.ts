/**
 * End-to-end transcript probe — uses the real fetchTranscript() which
 * tries Supadata → relay → Innertube → scrape in order.
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
        supadata_key_present: !!process.env.SUPADATA_API_KEY,
        error: "all tiers returned null",
      });
    }
    return NextResponse.json({
      ok: true,
      elapsed_ms: Date.now() - start,
      videoId: t.videoId,
      language: t.language,
      word_count: t.word_count,
      preview_first_400: t.text.slice(0, 400),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      elapsed_ms: Date.now() - start,
      error_safe: (e instanceof Error ? e.message : String(e))
        .replace(/https?:\/\/\S+/g, "[url]")
        .slice(0, 600),
    });
  }
}
