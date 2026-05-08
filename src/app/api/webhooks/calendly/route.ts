import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CalendlyPayload {
  event: string;
  payload: {
    email: string;
    name: string;
    timezone?: string;
    questions_and_answers?: { question: string; answer: string }[];
    scheduled_event: {
      uri: string;
      name: string;
      start_time: string;
      end_time: string;
    };
    cancellation?: { canceled_by: string; reason: string };
  };
  created_by?: string;
}

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string,
): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string]),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const data = `${t}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(data)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(v1, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Webhook uses service role to bypass RLS. The user_id is pulled from
 * integrations table (single-user app — first calendly integration).
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("calendly-webhook-signature");
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

  if (signingKey) {
    if (!verifySignature(rawBody, signatureHeader, signingKey)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: CalendlyPayload;
  try {
    body = JSON.parse(rawBody) as CalendlyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = adminClient();

  // Find the user who set up Calendly (single-user app)
  const intRes = await supabase
    .from("integrations")
    .select("user_id, config")
    .eq("provider", "calendly")
    .limit(1)
    .maybeSingle();

  if (!intRes.data) {
    return NextResponse.json(
      { error: "Calendly integration not configured" },
      { status: 500 },
    );
  }

  const ownerUserId = intRes.data.user_id as string;
  const inv = body.payload;
  const event = body.event;

  if (event === "invitee.created") {
    const startTime = new Date(inv.scheduled_event.start_time).toISOString();
    const email = inv.email.toLowerCase();

    // Try to find existing lead by email or by event URI
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("user_id", ownerUserId)
      .or(`email.eq.${email},calendly_event_uri.eq.${inv.scheduled_event.uri}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("leads")
        .update({
          discovery_at: startTime,
          calendly_event_uri: inv.scheduled_event.uri,
          email,
        })
        .eq("id", existing.id);
    } else {
      const notes = [
        `📅 Calendly: ${inv.scheduled_event.name}`,
        ...(inv.questions_and_answers ?? []).map(
          (qa) => `Q: ${qa.question}\nA: ${qa.answer}`,
        ),
      ]
        .filter(Boolean)
        .join("\n\n");

      await supabase.from("leads").insert({
        user_id: ownerUserId,
        name: inv.name,
        email,
        source: "other",
        stage: "discovery",
        discovery_at: startTime,
        calendly_event_uri: inv.scheduled_event.uri,
        notes: notes || null,
        icp_breakdown: {},
      });
    }

    await supabase.from("activity_log").insert({
      user_id: ownerUserId,
      room: "discovery",
      action: "calendly_booking_created",
      metadata: {
        invitee: inv.name,
        email: inv.email,
        event_name: inv.scheduled_event.name,
        start_time: inv.scheduled_event.start_time,
      },
    });

    return NextResponse.json({ ok: true, action: "booking_recorded" });
  }

  if (event === "invitee.canceled") {
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("calendly_event_uri", inv.scheduled_event.uri)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("leads")
        .update({
          discovery_at: null,
          discovery_outcome: "rescheduled",
          discovery_notes: inv.cancellation?.reason ?? "Canceled by invitee",
        })
        .eq("id", existing.id);
    }

    await supabase.from("activity_log").insert({
      user_id: ownerUserId,
      room: "discovery",
      action: "calendly_booking_canceled",
      metadata: {
        invitee: inv.name,
        email: inv.email,
        reason: inv.cancellation?.reason,
      },
    });

    return NextResponse.json({ ok: true, action: "cancellation_recorded" });
  }

  return NextResponse.json({ ok: true, action: "ignored", event });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "Calendly webhook receiver",
    method: "POST only",
  });
}
