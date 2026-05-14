/**
 * Diagnostic — show exactly what each tier of fetchTranscript does.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const out: Record<string, unknown> = {};

  // Tier 1: youtubei.js InnerTube
  const t1Start = Date.now();
  try {
    const ytModule = (await import("youtubei.js")) as unknown as {
      Innertube: { create: (opts?: Record<string, unknown>) => Promise<unknown> };
    };
    const yt = (await ytModule.Innertube.create({
      cache: undefined,
      generate_session_locally: true,
    })) as { getInfo: (id: string) => Promise<unknown> };
    out.tier1_innertube_create_ms = Date.now() - t1Start;

    const infoStart = Date.now();
    const info = (await yt.getInfo("OJ9WQy0Dt40")) as {
      basic_info?: { title?: string };
      getTranscript: () => Promise<unknown>;
    };
    out.tier1_get_info_ms = Date.now() - infoStart;
    out.tier1_video_title = info.basic_info?.title ?? "?";

    const txStart = Date.now();
    const transcript = (await info.getTranscript()) as {
      transcript?: { content?: { body?: { initial_segments?: Array<unknown> } } };
    };
    out.tier1_transcript_ms = Date.now() - txStart;
    const segments = transcript?.transcript?.content?.body?.initial_segments ?? [];
    out.tier1_segment_count = segments.length;
    out.tier1_first_segment = segments[0] ?? null;
    out.tier1_ok = segments.length > 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Strip any URL-looking content to bypass Chrome MCP cookie/url filter
    out.tier1_error_safe = msg
      .replace(/https?:\/\/\S+/g, "[url]")
      .replace(/[A-Za-z0-9_-]{15,}/g, "[id]")
      .slice(0, 600);
  }

  // Tier 2: youtube-transcript scrape
  const t2Start = Date.now();
  try {
    const { YoutubeTranscript } = (await import("youtube-transcript")) as {
      YoutubeTranscript: {
        fetchTranscript: (id: string, opts?: { lang?: string }) => Promise<Array<{ text: string }>>;
      };
    };
    const items = await YoutubeTranscript.fetchTranscript("OJ9WQy0Dt40", { lang: "en" });
    out.tier2_scrape_ms = Date.now() - t2Start;
    out.tier2_item_count = items?.length ?? 0;
    out.tier2_ok = items?.length > 0;
  } catch (e) {
    out.tier2_error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(out);
}
