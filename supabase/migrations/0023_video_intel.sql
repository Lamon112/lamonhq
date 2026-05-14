-- Video intel — Leonardov own-channel performance archive.
--
-- We import every published clip from @lamon.leonardo + @sidequestshr +
-- @sidehustlebalkan via TT/YT APIs, compute viral multipliers vs the
-- channel baseline, and feed top performers into the weekly script
-- generator. Cron refreshes nightly so the script gen always sees the
-- latest trending patterns.
--
-- "10x viral" = views >= 10 × channel median for that account.

CREATE TABLE IF NOT EXISTS public.video_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Provenance
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
  account_handle TEXT NOT NULL,  -- e.g. '@lamon.leonardo', '@sidequestshr'
  external_video_id TEXT NOT NULL,
  url TEXT NOT NULL,
  -- Content
  title TEXT,
  description TEXT,
  caption TEXT,
  hook_first_3sec TEXT,  -- Extracted from title or first frame caption
  duration_seconds INT,
  published_at TIMESTAMPTZ,
  -- Performance (snapshot)
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  share_count BIGINT,
  save_count BIGINT,
  -- Derived
  viral_multiplier NUMERIC(8, 2),  -- views / channel_median
  engagement_rate NUMERIC(6, 4),   -- (likes+comments+shares) / views
  is_top_10x BOOLEAN DEFAULT false, -- true when viral_multiplier >= 10
  -- LLM analysis (filled by script gen pipeline)
  format_tags TEXT[],         -- ['storytelling', 'educational', 'reaction']
  niche_tags TEXT[],          -- ['side-hustle', 'yt-shorts', 'ai-tools']
  hook_pattern TEXT,          -- 'stat-shock', 'pattern-interrupt', 'question'
  conversion_signal TEXT,     -- 'comments-fire', 'dms-spike', 'skool-joins'
  what_worked TEXT,           -- 1-2 sentences from LLM analysis
  what_to_repeat TEXT,        -- Actionable next-video copy hint
  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, external_video_id)
);

CREATE INDEX IF NOT EXISTS idx_vi_account ON public.video_intel(account_handle, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vi_top10x ON public.video_intel(is_top_10x) WHERE is_top_10x = true;
CREATE INDEX IF NOT EXISTS idx_vi_viral ON public.video_intel(viral_multiplier DESC NULLS LAST);

-- Generated scripts table — output of the weekly script generator
CREATE TABLE IF NOT EXISTS public.video_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id TEXT NOT NULL,  -- "scripts-YYYY-MM-DD"
  cycle_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Target placement
  target_platform TEXT NOT NULL CHECK (target_platform IN ('youtube', 'tiktok', 'instagram', 'cross')),
  target_account TEXT,  -- which Leonardo channel this is for
  slot_label TEXT,      -- "PON edukativni", "UTO live", "SRI case study", etc.
  -- Script content
  title TEXT NOT NULL,
  hook_3sec TEXT NOT NULL,
  body_structure TEXT NOT NULL,  -- Setup→Problem→Twist→Lekcija→CTA
  full_script TEXT NOT NULL,     -- Word-for-word voiceover ready
  cta TEXT NOT NULL,
  duration_estimate_sec INT,
  hashtags TEXT[],
  on_screen_text TEXT[],  -- Burned-in subtitle lines
  -- Predictions / rationale
  viral_prediction NUMERIC(4, 2),  -- 0-10 score from Claude
  conversion_prediction NUMERIC(4, 2),
  borrowed_from JSONB DEFAULT '[]'::jsonb,  -- video_intel IDs that inspired this
  rationale TEXT,  -- "Why this format works for this niche right now"
  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'shot', 'published', 'rejected')),
  reviewer_notes TEXT,
  approved_at TIMESTAMPTZ,
  shot_at TIMESTAMPTZ,
  published_url TEXT,
  generation_cost_usd NUMERIC(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vs_cycle ON public.video_scripts(cycle_id);
CREATE INDEX IF NOT EXISTS idx_vs_status ON public.video_scripts(status);
CREATE INDEX IF NOT EXISTS idx_vs_created ON public.video_scripts(created_at DESC);

-- updated_at trigger for video_scripts
CREATE OR REPLACE FUNCTION public.touch_video_script_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_script_updated ON public.video_scripts;
CREATE TRIGGER video_script_updated
  BEFORE UPDATE ON public.video_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_video_script_updated();

-- RLS
ALTER TABLE public.video_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read video_intel" ON public.video_intel;
CREATE POLICY "auth read video_intel" ON public.video_intel
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth read video_scripts" ON public.video_scripts;
CREATE POLICY "auth read video_scripts" ON public.video_scripts
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth update video_scripts" ON public.video_scripts;
CREATE POLICY "auth update video_scripts" ON public.video_scripts
  FOR UPDATE USING (auth.role() = 'authenticated');
