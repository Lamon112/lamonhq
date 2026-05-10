-- =====================================================================
--  LAMON HQ — Migration 0016: leads.onboarding_status
--  Per-lead 6-step onboarding checklist for post-close → live workflow.
--  Stored as JSONB so we can iterate the schema without ALTER TABLE.
--
--  Schema (TS-side, no SQL constraint):
--  {
--    intake_sent_at:     ISO date | null,  -- T+0  brifing poslan klijentu
--    intake_returned_at: ISO date | null,  -- T+0  klijent vratio popunjen
--    ai_configured_at:   ISO date | null,  -- T+3  Riva production setup
--    shadow_test_at:     ISO date | null,  -- T+7  shadow mode (Riva sluša)
--    live_cutover_at:    ISO date | null,  -- T+14 go-live
--    first_review_at:    ISO date | null,  -- T+30 first monthly review
--    notes: string | null
--  }
--
--  Steward Client HQ Lifecycle View renders this as a checklist per
--  client in onboarding stage. Once first_review_at is set, lead moves
--  conceptually to Aegis (ongoing nurture) — but DB row stays in leads
--  (single source of truth).
-- =====================================================================

alter table public.leads
  add column if not exists onboarding_status jsonb;

-- Helper index for "show me clients currently in onboarding"
-- (any non-null onboarding_status without a live_cutover_at)
create index if not exists leads_onboarding_in_progress_idx
  on public.leads ((onboarding_status->>'live_cutover_at'))
  where onboarding_status is not null
    and (onboarding_status->>'live_cutover_at') is null;
