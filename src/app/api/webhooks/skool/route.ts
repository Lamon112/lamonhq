/**
 * Skool webhook — receives events from the external Playwright worker
 * (runs on Render/Railway, logs into Skool with Leonardov cookies,
 * polls DMs + community posts every 5-10 min).
 *
 * Worker POSTs:
 *   POST /api/webhooks/skool
 *   { type: "new_dm" | "new_post" | "new_comment",
 *     skool_user_id, handle, display_name, body, external_message_id, ... }
 *
 * We:
 *   1. Upsert skool_conversations
 *   2. Log skool_messages (inbound)
 *   3. Run dedupe + classify + route via the SAME pipeline as telegram
 *      (intent + extractor + template + audit + dedupe layers)
 *   4. Return the bot's reply text in the response so the worker can
 *      post it back to Skool
 *
 * Secret: x-skool-worker-secret header must match SKOOL_WORKER_SECRET.
 *
 * v1 = scaffolding (event ingestion only, no reply generation).
 * v1.1 will wire classifyIntent + routeTemplate (Skool-flavored versions).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface SkoolEvent {
  type: "new_dm" | "new_post" | "new_comment" | "heartbeat";
  skool_user_id?: string;
  handle?: string;
  display_name?: string;
  avatar_url?: string;
  external_message_id?: string;
  body?: string;
  source?: "dm" | "post" | "comment";
  posted_at?: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SKOOL_WORKER_SECRET;
  const got = req.headers.get("x-skool-worker-secret");
  if (secret && got !== secret) {
    return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });
  }

  let ev: SkoolEvent;
  try {
    ev = (await req.json()) as SkoolEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Heartbeat — worker is alive, just touch state
  if (ev.type === "heartbeat") {
    await supabase
      .from("skool_poller_state")
      .update({ worker_heartbeat: new Date().toISOString() })
      .eq("id", 1);
    return NextResponse.json({ ok: true, heartbeat: true });
  }

  if (!ev.skool_user_id || !ev.body || !ev.external_message_id) {
    return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
  }

  // Upsert conversation
  const { data: existing } = await supabase
    .from("skool_conversations")
    .select("*")
    .eq("skool_user_id", ev.skool_user_id)
    .maybeSingle();

  let conv = existing;
  if (!conv) {
    const { data: created } = await supabase
      .from("skool_conversations")
      .insert({
        skool_user_id: ev.skool_user_id,
        skool_handle: ev.handle ?? null,
        display_name: ev.display_name ?? null,
        avatar_url: ev.avatar_url ?? null,
        stage: "new",
      })
      .select()
      .single();
    conv = created;
  } else {
    await supabase
      .from("skool_conversations")
      .update({ last_message_at: ev.posted_at ?? new Date().toISOString() })
      .eq("id", conv.id);
  }

  if (!conv) return NextResponse.json({ ok: false, error: "conv upsert failed" }, { status: 500 });

  // Log inbound (idempotent)
  await supabase
    .from("skool_messages")
    .upsert(
      {
        conversation_id: conv.id,
        source: ev.source ?? "dm",
        external_message_id: ev.external_message_id,
        direction: "in",
        body: ev.body,
        sent_at: ev.posted_at ?? new Date().toISOString(),
      },
      { onConflict: "conversation_id,external_message_id,direction", ignoreDuplicates: true },
    );

  // v1: no reply generation yet — worker just records.
  // v1.1 will wire classify+route+audit pipeline and return reply_text.
  return NextResponse.json({ ok: true, conversation_id: conv.id });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "skool-webhook" });
}
