"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  appendActivityRow,
  createActivityLogDb,
  findActivityLogDb,
  parseDatabaseId,
  type ActivityPayload,
} from "@/lib/notion";

export interface SetupResult {
  ok: boolean;
  error?: string;
  activityLogDbId?: string;
}

interface NotionConfig {
  token: string;
  parent_page_id?: string;
  parent_page_url?: string;
  activity_log_db_id?: string;
  klijenti_db_id?: string;
  pipeline_db_id?: string;
  setup_at?: string;
}

const PARENT_PAGE_ID_FALLBACK = "35562e077ead8167a7b4ce9c2634c53c";

/**
 * Setup: persist token + auto-create / detect Activity Log DB.
 */
export async function setupNotionSync(
  token: string,
  parentPageInput?: string,
  klijentiInput?: string,
  pipelineInput?: string,
): Promise<SetupResult> {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const parentPageId = parentPageInput
    ? parseDatabaseId(parentPageInput)
    : PARENT_PAGE_ID_FALLBACK;

  // 1. Look up existing Activity Log DB by title
  let dbId: string | null = null;
  const existing = await findActivityLogDb(token);
  if (existing) dbId = existing.id;

  // 2. Create if not found
  if (!dbId) {
    const created = await createActivityLogDb(token, parentPageId);
    if ("error" in created) {
      return {
        ok: false,
        error: `Create DB failed: ${created.error}. Provjeri da je Lamon HQ Import konekcija dodana na parent page.`,
      };
    }
    dbId = created.id;
  }

  // 3. Optional: parse Klijenti + Pipeline DB IDs if user provided
  let klijentiDbId: string | undefined;
  let pipelineDbId: string | undefined;
  try {
    if (klijentiInput?.trim()) klijentiDbId = parseDatabaseId(klijentiInput);
  } catch {
    // ignore
  }
  try {
    if (pipelineInput?.trim()) pipelineDbId = parseDatabaseId(pipelineInput);
  } catch {
    // ignore
  }

  const config: NotionConfig = {
    token,
    parent_page_id: parentPageId,
    activity_log_db_id: dbId,
    klijenti_db_id: klijentiDbId,
    pipeline_db_id: pipelineDbId,
    setup_at: new Date().toISOString(),
  };

  await supabase
    .from("integrations")
    .upsert({
      user_id: userData.user.id,
      provider: "notion",
      config,
    });

  return { ok: true, activityLogDbId: dbId };
}

export async function getNotionStatus(): Promise<{
  connected: boolean;
  activityLogDbId?: string;
  klijentiDbId?: string;
  pipelineDbId?: string;
  setupAt?: string;
}> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "notion")
    .maybeSingle();
  if (!data?.config) return { connected: false };
  const c = data.config as NotionConfig;
  return {
    connected: true,
    activityLogDbId: c.activity_log_db_id,
    klijentiDbId: c.klijenti_db_id,
    pipelineDbId: c.pipeline_db_id,
    setupAt: c.setup_at,
  };
}

/**
 * Fire-and-forget sync — called from other server actions.
 * Uses service role to read integrations regardless of RLS context.
 */
export async function notionSync(payload: ActivityPayload): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data } = await admin
      .from("integrations")
      .select("config")
      .eq("provider", "notion")
      .limit(1)
      .maybeSingle();

    if (!data?.config) return; // not configured — silently skip
    const cfg = data.config as NotionConfig;
    if (!cfg.token || !cfg.activity_log_db_id) return;

    await appendActivityRow(cfg.token, cfg.activity_log_db_id, payload);
  } catch {
    // Never throw — sync failure should never break HQ flow
  }
}
