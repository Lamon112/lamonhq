-- =====================================================================
--  LAMON HQ — Migration 0011: Lead Person Enrichment
--  Stores person-first enrichment data on each lead. Filled by the
--  deepEnrichLead pipeline (Apollo people search + channel health).
-- =====================================================================

alter table public.leads
  add column if not exists person_enrichment jsonb;

-- Shape (target):
-- {
--   "owner": {
--     "name": "Dr. Tina Babić",
--     "title": "Founder, Dental Clinic",
--     "linkedin_url": "...",
--     "email": "tina@dental-babic.hr",
--     "email_status": "verified",
--     "apollo_id": "...",
--     "match_score": 0.92,
--     "channels": { "linkedin": "...", "email": "..." },
--     "channelHealth": { "linkedin": { "status": "alive", "followers": 320 } }
--   },
--   "manager": { ... },             -- optional fallback
--   "candidates_searched": ["Tina Babić", "..."],
--   "apollo_total": 4,
--   "enriched_at": "2026-05-09T..."
-- }
