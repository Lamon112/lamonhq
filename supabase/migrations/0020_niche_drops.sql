-- Niche Hunter — bi-weekly viral niche drop pipeline
--
-- Stores AI-generated niche analyses for the SideHustle™ Skool community.
-- Pipeline (Inngest cron, every 14 days at 02:00 Zagreb):
--   1. For each guru in the curated YT/IG list, fetch latest 3-5 videos
--      from last 14 days (YouTube Data API v3 uploads playlist).
--   2. Pull transcripts via youtube-transcript npm package.
--   3. Pass batched transcripts to Claude Sonnet for niche extraction
--      (emerging niches mentioned by 3+ gurus + first-mover signal).
--   4. Insert one row per identified niche; mark as 'pending_review' so
--      Leonardo manually approves before Skool publish.
--
-- One drop = one niche. Multiple niches per cron run = multiple rows.

CREATE TABLE IF NOT EXISTS public.niche_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The drop "cycle" (Inngest run ID) — groups rows from same cron tick
  cycle_id TEXT NOT NULL,
  cycle_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Niche identity
  niche_name TEXT NOT NULL,
  niche_slug TEXT NOT NULL,  -- url-safe, "ai-faceless-history"
  -- Why-now reasoning
  why_viral_now TEXT NOT NULL,
  first_mover_signal TEXT,
  saturation_score INT CHECK (saturation_score BETWEEN 0 AND 10),  -- 0=open, 10=saturated
  -- Source attribution — which gurus mentioned this niche
  source_gurus JSONB DEFAULT '[]'::jsonb,  -- [{name, video_id, timestamp_seconds}]
  source_video_count INT DEFAULT 0,
  -- Generated content for the Skool post
  hook_lines JSONB DEFAULT '[]'::jsonb,  -- 5 video idea hooks
  monetization_paths JSONB DEFAULT '[]'::jsonb,  -- ["yt_shorts", "tt_creativity", "affiliate"]
  draft_skool_post TEXT,  -- Full markdown post body ready to publish
  -- Review state
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'published', 'rejected')),
  reviewer_notes TEXT,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  -- Cost tracking (per shared_insights pattern)
  generation_cost_usd NUMERIC(10, 4) DEFAULT 0,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_niche_drops_cycle ON public.niche_drops(cycle_id);
CREATE INDEX IF NOT EXISTS idx_niche_drops_status ON public.niche_drops(status);
CREATE INDEX IF NOT EXISTS idx_niche_drops_created ON public.niche_drops(created_at DESC);

-- Per-cycle log so we can see which cron runs found N niches each + cost
CREATE TABLE IF NOT EXISTS public.niche_hunter_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  gurus_scanned INT DEFAULT 0,
  videos_fetched INT DEFAULT 0,
  transcripts_pulled INT DEFAULT 0,
  niches_extracted INT DEFAULT 0,
  total_cost_usd NUMERIC(10, 4) DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_nhr_started ON public.niche_hunter_runs(started_at DESC);

-- updated_at trigger for niche_drops
CREATE OR REPLACE FUNCTION public.touch_niche_drop_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS niche_drop_updated ON public.niche_drops;
CREATE TRIGGER niche_drop_updated
  BEFORE UPDATE ON public.niche_drops
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_niche_drop_updated();

-- RLS — service role for the cron, authenticated read for the panel
ALTER TABLE public.niche_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_hunter_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read niche_drops" ON public.niche_drops;
CREATE POLICY "auth read niche_drops" ON public.niche_drops
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth update niche_drops" ON public.niche_drops;
CREATE POLICY "auth update niche_drops" ON public.niche_drops
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth read niche_hunter_runs" ON public.niche_hunter_runs;
CREATE POLICY "auth read niche_hunter_runs" ON public.niche_hunter_runs
  FOR SELECT USING (auth.role() = 'authenticated');
