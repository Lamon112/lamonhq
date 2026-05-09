"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "./activityLog";

export type Niche =
  | "stomatologija"
  | "estetska"
  | "fizio"
  | "ortopedija"
  | "coach"
  | "other";

export type Source =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "referral"
  | "other";

export type Stage =
  | "discovery"
  | "pricing"
  | "financing"
  | "booking"
  | "closed_won"
  | "closed_lost";

export interface AddLeadInput {
  name: string;
  source?: Source | null;
  niche?: Niche | null;
  icpBreakdown?: Record<string, number>;
  estimatedValue?: number | null;
  notes?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function totalScore(breakdown?: Record<string, number>): number {
  if (!breakdown) return 0;
  return Object.values(breakdown).reduce((s, v) => s + (Number(v) || 0), 0);
}

export async function addLead(input: AddLeadInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ime lead-a je obavezno" };

  const score = totalScore(input.icpBreakdown);

  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: userData.user.id,
      name,
      source: input.source ?? null,
      niche: input.niche ?? null,
      icp_score: score,
      icp_breakdown: input.icpBreakdown ?? {},
      stage: "discovery",
      estimated_value: input.estimatedValue ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  void logActivity(userData.user.id, {
    type: "lead_scored",
    title: `Lead score: ${name} · ${score}/20`,
    summary: `${input.niche ?? "?"} · ${input.source ?? "?"} · estimated €${input.estimatedValue ?? 0}`,
    hqRoom: "lead_scorer",
    hqRowId: data.id,
    amountEur: input.estimatedValue ?? undefined,
    tags: [input.niche, input.source].filter(Boolean) as string[],
  });

  revalidatePath("/");
  return { ok: true, id: data.id };
}

export interface UpdateLeadInput {
  id: string;
  name?: string;
  source?: Source | null;
  niche?: Niche | null;
  icpBreakdown?: Record<string, number>;
  stage?: Stage;
  estimatedValue?: number | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  notes?: string | null;
  discoveryAt?: string | null;
  discoveryOutcome?: string | null;
  discoveryNotes?: string | null;
}

export async function updateLead(
  input: UpdateLeadInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.source !== undefined) patch.source = input.source;
  if (input.niche !== undefined) patch.niche = input.niche;
  if (input.icpBreakdown !== undefined) {
    patch.icp_breakdown = input.icpBreakdown;
    patch.icp_score = totalScore(input.icpBreakdown);
  }
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.estimatedValue !== undefined)
    patch.estimated_value = input.estimatedValue;
  if (input.nextAction !== undefined)
    patch.next_action = input.nextAction?.trim() || null;
  if (input.nextActionDate !== undefined)
    patch.next_action_date = input.nextActionDate || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.discoveryAt !== undefined) patch.discovery_at = input.discoveryAt;
  if (input.discoveryOutcome !== undefined)
    patch.discovery_outcome = input.discoveryOutcome;
  if (input.discoveryNotes !== undefined)
    patch.discovery_notes = input.discoveryNotes?.trim() || null;

  const { error } = await supabase.from("leads").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  // Jarvis push: novi sastanak booked
  if (input.discoveryAt) {
    const { data: userData } = await supabase.auth.getUser();
    const { data: lead } = await supabase
      .from("leads")
      .select("name, icp_score")
      .eq("id", input.id)
      .single();
    if (userData.user && lead) {
      const when = new Date(input.discoveryAt).toLocaleString("hr-HR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const score = lead.icp_score ? ` · ${lead.icp_score}/20 ICP` : "";
      const { pushTelegramNotification } = await import("./telegram");
      void pushTelegramNotification(
        "briefing",
        `📅 Sastanak bookiran: ${lead.name}${score}\n${when}\n\nOtvori Brief Room → klikni "Generiraj brief pitanja" par sati prije poziva za AI prep.\n\n— Jarvis`,
        userData.user.id,
      );
    }
  }

  revalidatePath("/");
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────
// BULK IMPORT — paste CSV/TSV/lines of "name,email" or just emails
// Parses lines, dedupes against existing leads.email, inserts as raw
// (icp_score=0) so they show up at the bottom of the queue and can be
// enriched in batch via bulkReEnrichUnscored.
// ────────────────────────────────────────────────────────────────────

export interface BulkImportResult {
  ok: boolean;
  inserted: number;
  skipped: number;
  total: number;
  error?: string;
}

function parseRawLeads(
  raw: string,
): Array<{ name: string; email?: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  const out: Array<{ name: string; email?: string }> = [];
  const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

  for (const line of lines) {
    // Try common CSV/TSV formats; ignore header row
    if (/^name[,;\t]\s*email/i.test(line)) continue;

    const parts = line
      .split(/[,;\t]/)
      .map((p) => p.trim())
      .filter(Boolean);

    let name: string | undefined;
    let email: string | undefined;

    for (const p of parts) {
      const m = p.match(emailRegex);
      if (m && !email) email = m[1].toLowerCase();
      else if (!name) name = p;
    }

    // Single value line: if it's email, use as both; if not, treat as name
    if (parts.length === 1) {
      const single = parts[0];
      const m = single.match(emailRegex);
      if (m) {
        email = m[1].toLowerCase();
        name = single;
      } else {
        name = single;
      }
    }

    if (!name && !email) continue;
    out.push({
      name: (name ?? email ?? "Unknown").slice(0, 200),
      email,
    });
  }

  return out;
}

export async function bulkImportLeads(
  raw: string,
  source: "linkedin" | "instagram" | "tiktok" | "referral" | "other" = "other",
  niche:
    | "stomatologija"
    | "estetska"
    | "fizio"
    | "ortopedija"
    | "coach"
    | "other"
    | null = "stomatologija",
): Promise<BulkImportResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      total: 0,
      error: "Niste prijavljeni",
    };
  const userId = userData.user.id;

  const parsed = parseRawLeads(raw);
  if (parsed.length === 0)
    return { ok: false, inserted: 0, skipped: 0, total: 0, error: "Nema parsiranih redaka" };

  // Dedupe against existing emails for this user
  const emails = parsed.map((p) => p.email).filter(Boolean) as string[];
  const existingSet = new Set<string>();
  if (emails.length > 0) {
    const { data: existing } = await supabase
      .from("leads")
      .select("email")
      .eq("user_id", userId)
      .in("email", emails);
    for (const r of existing ?? []) {
      if (r.email) existingSet.add((r.email as string).toLowerCase());
    }
  }

  const toInsert = parsed
    .filter((p) => !p.email || !existingSet.has(p.email))
    .map((p) => ({
      user_id: userId,
      name: p.name,
      email: p.email ?? null,
      source,
      niche,
      stage: "discovery" as const,
      icp_score: 0,
      icp_breakdown: {},
      notes: `📥 Bulk import ${new Date().toISOString().slice(0, 10)}\nEmail: ${p.email ?? "(nema)"}`,
    }));

  if (toInsert.length === 0) {
    return {
      ok: true,
      inserted: 0,
      skipped: parsed.length,
      total: parsed.length,
    };
  }

  // Insert in chunks of 100 (Supabase row limit safety)
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error, count } = await supabase
      .from("leads")
      .insert(chunk, { count: "exact" });
    if (error)
      return {
        ok: false,
        inserted,
        skipped: parsed.length - inserted,
        total: parsed.length,
        error: error.message,
      };
    inserted += count ?? chunk.length;
  }

  revalidatePath("/");

  if (inserted > 0) {
    const { pushTelegramNotification } = await import("./telegram");
    void pushTelegramNotification(
      "followups",
      `📥 Leonardo, ${inserted} ${inserted === 1 ? "novi lead" : "novih leadova"} importano u Lead Scorer (${niche ?? "general"}). Otvori List tab → "AI re-score & enrich" za batch obradu.\n\n— Jarvis`,
      userId,
    );
  }

  return {
    ok: true,
    inserted,
    skipped: parsed.length - inserted,
    total: parsed.length,
  };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/**
 * Manually set the official website URL for a lead. Holmes + every
 * downstream pipeline reads this before falling back to web search.
 */
export async function setLeadWebsite(
  leadId: string,
  websiteUrl: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  let cleaned = websiteUrl.trim();
  if (cleaned && !/^https?:\/\//i.test(cleaned)) cleaned = `https://${cleaned}`;
  cleaned = cleaned.replace(/\/$/, "");
  const { error } = await supabase
    .from("leads")
    .update({ website_url: cleaned || null })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/**
 * Bulk auto-discovery: for every Hot lead missing website_url, run a
 * DDG search and save the best match. Sequential w/ 600ms politeness gap.
 */
export async function bulkDiscoverWebsites(): Promise<{
  ok: boolean;
  discovered: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return {
      ok: false,
      discovered: 0,
      skipped: 0,
      errors: ["Niste prijavljeni"],
    };

  const { data: hotLeads } = await supabase
    .from("leads")
    .select("id, name, website_url")
    .gte("icp_score", 15)
    .in("stage", ["discovery", "pricing", "financing", "booking"]);

  const todo = (hotLeads ?? []).filter(
    (l) => !l.website_url || !(l.website_url as string).trim(),
  );
  if (todo.length === 0) {
    return {
      ok: true,
      discovered: 0,
      skipped: hotLeads?.length ?? 0,
      errors: [],
    };
  }

  // Lazy-import the DDG helper (server-only)
  const { findOfficialWebsite } = await import("@/lib/duckduckgo");

  let discovered = 0;
  const errors: string[] = [];
  for (const l of todo) {
    try {
      const url = await findOfficialWebsite(l.name as string);
      if (url) {
        await supabase
          .from("leads")
          .update({ website_url: url })
          .eq("id", l.id);
        discovered++;
      }
    } catch (e) {
      errors.push(`${l.id}: ${e instanceof Error ? e.message : "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  revalidatePath("/");
  return {
    ok: true,
    discovered,
    skipped: (hotLeads?.length ?? 0) - todo.length,
    errors,
  };
}
