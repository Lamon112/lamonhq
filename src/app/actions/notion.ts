"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAllRows,
  parseDatabaseId,
  previewDatabase,
  type NotionPreview,
  type NotionRow,
} from "@/lib/notion";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface ImportResult extends ActionResult {
  imported?: number;
  skipped?: number;
  failed?: number;
  failures?: { name: string; reason: string }[];
}

export type Mapping = Record<string, string | null>;

export async function previewNotionAction(
  token: string,
  dbInput: string,
  target: "clients" | "leads",
): Promise<NotionPreview> {
  return previewDatabase(token, dbInput, target);
}

function pickString(row: NotionRow, key: string | null): string | null {
  if (!key) return null;
  const v = row[key];
  if (v === null || v === undefined) return null;
  return String(v).trim() || null;
}

function pickNumber(row: NotionRow, key: string | null): number | null {
  if (!key) return null;
  const v = row[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[€$\s,]/g, "").replace(/(\d)\.(\d{3})/g, "$1$2");
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  }
  return null;
}

function pickDate(row: NotionRow, key: string | null): string | null {
  if (!key) return null;
  const v = row[key];
  if (!v) return null;
  const s = String(v);
  // Take date portion if ISO datetime
  return s.length >= 10 ? s.slice(0, 10) : null;
}

const CLIENT_TYPE_MAP: Record<string, "b2b_clinic" | "coach_mentor" | "affiliate"> = {
  clinic: "b2b_clinic",
  klinika: "b2b_clinic",
  b2b: "b2b_clinic",
  b2b_clinic: "b2b_clinic",
  coach: "coach_mentor",
  mentor: "coach_mentor",
  coach_mentor: "coach_mentor",
  affiliate: "affiliate",
};

const CLIENT_STATUS_MAP: Record<string, "active" | "onboarding" | "paused" | "churned"> = {
  active: "active",
  aktivan: "active",
  aktivni: "active",
  onboarding: "onboarding",
  onboard: "onboarding",
  paused: "paused",
  pauziran: "paused",
  pauza: "paused",
  churned: "churned",
  churn: "churned",
  otpao: "churned",
  done: "churned",
};

const LEAD_NICHE_MAP: Record<string, "stomatologija" | "estetska" | "fizio" | "ortopedija" | "coach" | "other"> = {
  stomatologija: "stomatologija",
  stomato: "stomatologija",
  dental: "stomatologija",
  estetska: "estetska",
  estetic: "estetska",
  estetic_klinika: "estetska",
  fizio: "fizio",
  physio: "fizio",
  ortopedija: "ortopedija",
  ortho: "ortopedija",
  coach: "coach",
};

const LEAD_SOURCE_MAP: Record<string, "linkedin" | "instagram" | "tiktok" | "referral" | "other"> = {
  linkedin: "linkedin",
  li: "linkedin",
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
  referral: "referral",
  preporuka: "referral",
};

const LEAD_STAGE_MAP: Record<string, "discovery" | "pricing" | "financing" | "booking" | "closed_won" | "closed_lost"> = {
  discovery: "discovery",
  prvi_kontakt: "discovery",
  pricing: "pricing",
  ponuda: "pricing",
  financing: "financing",
  finansiranje: "financing",
  booking: "booking",
  termin: "booking",
  closed_won: "closed_won",
  won: "closed_won",
  zatvoreno: "closed_won",
  closed_lost: "closed_lost",
  lost: "closed_lost",
  izgubljen: "closed_lost",
};

function mapEnum<T extends string>(
  raw: string | null,
  table: Record<string, T>,
  fallback: T,
): T {
  if (!raw) return fallback;
  const key = raw.toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z_]/g, "");
  return table[key] ?? fallback;
}

export async function importClientsAction(
  token: string,
  dbInput: string,
  mapping: Mapping,
): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  let rows: NotionRow[];
  try {
    const dbId = parseDatabaseId(dbInput);
    rows = await fetchAllRows(token, dbId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Notion fetch greška",
    };
  }

  // Existing client names (to dedupe by case-insensitive match)
  const { data: existing } = await supabase
    .from("clients")
    .select("name");
  const existingNames = new Set(
    (existing ?? []).map((c) => (c.name ?? "").toLowerCase().trim()),
  );

  const inserts: Array<Record<string, unknown>> = [];
  const failures: { name: string; reason: string }[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = pickString(row, mapping.name);
    if (!name) {
      failures.push({ name: row._id, reason: "Nedostaje name" });
      continue;
    }
    if (existingNames.has(name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const type = mapEnum(
      pickString(row, mapping.type),
      CLIENT_TYPE_MAP,
      "b2b_clinic",
    );
    const status = mapEnum(
      pickString(row, mapping.status),
      CLIENT_STATUS_MAP,
      "onboarding",
    );
    inserts.push({
      user_id: userData.user.id,
      name,
      type,
      status,
      monthly_revenue: pickNumber(row, mapping.monthly_revenue) ?? 0,
      start_date: pickDate(row, mapping.start_date),
      notes: pickString(row, mapping.notes),
      next_action: pickString(row, mapping.next_action),
      churn_risk:
        pickString(row, mapping.churn_risk)?.toLowerCase() === "high"
          ? "high"
          : pickString(row, mapping.churn_risk)?.toLowerCase() === "medium"
            ? "medium"
            : pickString(row, mapping.churn_risk)?.toLowerCase() === "low"
              ? "low"
              : null,
      last_touchpoint_at: new Date().toISOString(),
    });
  }

  let inserted = 0;
  if (inserts.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < inserts.length; i += 100) {
      const batch = inserts.slice(i, i + 100);
      const { error } = await supabase.from("clients").insert(batch);
      if (error) {
        failures.push({ name: `batch_${i}`, reason: error.message });
      } else {
        inserted += batch.length;
      }
    }
  }

  revalidatePath("/");
  return {
    ok: true,
    imported: inserted,
    skipped,
    failed: failures.length,
    failures,
  };
}

export async function importLeadsAction(
  token: string,
  dbInput: string,
  mapping: Mapping,
): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  let rows: NotionRow[];
  try {
    const dbId = parseDatabaseId(dbInput);
    rows = await fetchAllRows(token, dbId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Notion fetch greška",
    };
  }

  const { data: existing } = await supabase.from("leads").select("name");
  const existingNames = new Set(
    (existing ?? []).map((l) => (l.name ?? "").toLowerCase().trim()),
  );

  const inserts: Array<Record<string, unknown>> = [];
  const failures: { name: string; reason: string }[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = pickString(row, mapping.name);
    if (!name) {
      failures.push({ name: row._id, reason: "Nedostaje name" });
      continue;
    }
    if (existingNames.has(name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const niche = mapEnum(
      pickString(row, mapping.niche),
      LEAD_NICHE_MAP,
      "other",
    );
    const source = mapEnum(
      pickString(row, mapping.source),
      LEAD_SOURCE_MAP,
      "other",
    );
    const stage = mapEnum(
      pickString(row, mapping.stage),
      LEAD_STAGE_MAP,
      "discovery",
    );
    const icpScoreRaw = pickNumber(row, mapping.icp_score);
    const icpScore =
      icpScoreRaw === null
        ? null
        : Math.min(20, Math.max(0, Math.round(icpScoreRaw)));

    inserts.push({
      user_id: userData.user.id,
      name,
      source,
      niche,
      icp_score: icpScore,
      icp_breakdown: {},
      stage,
      estimated_value: pickNumber(row, mapping.estimated_value),
      next_action: pickString(row, mapping.next_action),
      notes: pickString(row, mapping.notes),
    });
  }

  let inserted = 0;
  if (inserts.length > 0) {
    for (let i = 0; i < inserts.length; i += 100) {
      const batch = inserts.slice(i, i + 100);
      const { error } = await supabase.from("leads").insert(batch);
      if (error) {
        failures.push({ name: `batch_${i}`, reason: error.message });
      } else {
        inserted += batch.length;
      }
    }
  }

  revalidatePath("/");
  return {
    ok: true,
    imported: inserted,
    skipped,
    failed: failures.length,
    failures,
  };
}
