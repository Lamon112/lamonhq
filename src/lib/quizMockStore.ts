/**
 * In-memory quiz lead store — DEV-ONLY fallback when SUPABASE_SERVICE_ROLE_KEY
 * is not set (e.g. local testing without a configured Supabase project).
 *
 * Activated automatically by /api/quiz/submit when service key is missing.
 * Data lives only in the dev server process — restart = wipe. Perfect for
 * UX validation without DB setup.
 *
 * In production (Vercel) the env var IS set, so this fallback never runs
 * and all leads persist normally to Supabase.
 */

import { randomUUID } from "node:crypto";

export interface MockQuizLead {
  id: string;
  responses: Record<string, unknown>;
  score: number | null;
  weaknesses:
    | Array<{ label: string; percent: number; color: string; diagnosis?: string }>
    | null;
  matched_case_study: string | null;
  ai_output_md: string | null;
  lead_email: string | null;
  lead_name: string | null;
  lead_telegram: string | null;
  lead_phone: string | null;
  source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  status: "new" | "dm_sent" | "replied" | "skool_invited" | "converted" | "cold";
  generated_at: string | null;
  generation_cost_usd: number | null;
  email_status: "pending" | "sent" | "delivered" | "failed" | "bounced" | "skipped" | null;
  email_provider_id: string | null;
  email_error: string | null;
  email_sent_at: string | null;
  email_attempts: number;
  created_at: string;
  updated_at: string;
}

// Map keyed by lead id. Module-level — survives across requests within
// the same dev server process.
const STORE = new Map<string, MockQuizLead>();

export function isMockMode(): boolean {
  return !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function mockInsert(initial: Partial<MockQuizLead>): MockQuizLead {
  const now = new Date().toISOString();
  const lead: MockQuizLead = {
    id: randomUUID(),
    responses: initial.responses ?? {},
    score: null,
    weaknesses: null,
    matched_case_study: null,
    ai_output_md: null,
    lead_email: initial.lead_email ?? null,
    lead_name: initial.lead_name ?? null,
    lead_telegram: initial.lead_telegram ?? null,
    lead_phone: null,
    source: initial.source ?? "direct",
    utm_campaign: initial.utm_campaign ?? null,
    utm_medium: initial.utm_medium ?? null,
    status: "new",
    generated_at: null,
    generation_cost_usd: null,
    email_status: null,
    email_provider_id: null,
    email_error: null,
    email_sent_at: null,
    email_attempts: 0,
    created_at: now,
    updated_at: now,
  };
  STORE.set(lead.id, lead);
  return lead;
}

export function mockUpdate(id: string, patch: Partial<MockQuizLead>): MockQuizLead | null {
  const existing = STORE.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
  STORE.set(id, updated);
  return updated;
}

export function mockGet(id: string): MockQuizLead | null {
  return STORE.get(id) ?? null;
}

export function mockList(limit = 50): MockQuizLead[] {
  return Array.from(STORE.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}
