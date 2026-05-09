-- =====================================================================
--  LAMON HQ — Migration 0013: lead.website_url
--  First-class structured field for the clinic's official website.
--  Holmes + outreach pipelines read this BEFORE falling back to DDG
--  search or notes-text parsing.
-- =====================================================================

alter table public.leads
  add column if not exists website_url text;
