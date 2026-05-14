-- LinkedIn post generator output store
CREATE TABLE IF NOT EXISTS public.linkedin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  angle TEXT,
  audience TEXT,
  variant_kind TEXT NOT NULL CHECK (variant_kind IN ('hook','story','contrarian')),
  body TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  viral_prediction NUMERIC(4,2),
  conversion_prediction NUMERIC(4,2),
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','published','rejected')),
  published_url TEXT,
  generation_cost_usd NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_li_status ON public.linkedin_posts(status);
CREATE INDEX IF NOT EXISTS idx_li_created ON public.linkedin_posts(created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_linkedin_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS linkedin_post_updated ON public.linkedin_posts;
CREATE TRIGGER linkedin_post_updated BEFORE UPDATE ON public.linkedin_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_linkedin_updated();

ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth linkedin" ON public.linkedin_posts;
CREATE POLICY "auth linkedin" ON public.linkedin_posts FOR ALL USING (auth.role() = 'authenticated');
