-- Skool članovi (SideHustle premium grupa) — ingestion za win-back kampanju
-- i tier migration tracking.
--
-- Kontekst (Leonardov 2026-05-15 feedback): od 243 "active" članova,
-- 122 free + 47 legacy €20 + 6 novi €50 + 68 ostali (gratis/komp/test).
-- Win-back cilj: 47 legacy €20 → migrirati na €50 ili otkazati.
--
-- Ingest: Skool nema public API. Leonardo extracta članove kao admin
-- iz `window.__NEXT_DATA__` (admin panel) → CSV → ovaj table preko
-- scripts/ingest-skool-members.mjs.

CREATE TABLE IF NOT EXISTS public.skool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Skool identity
  skool_user_id TEXT UNIQUE,
  skool_username TEXT,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Tier — important for win-back logic
  -- legacy_20: stari €20 plan (47 ljudi, target za win-back)
  -- premium_50: novi €50 plan
  -- free: nije plaćeno
  -- comp: kompenzacija/barter/gratis (Leonardo daje besplatno)
  -- mentor: mentor program (€500/mj × 3 mj)
  tier TEXT CHECK (tier IN ('legacy_20', 'premium_50', 'free', 'comp', 'mentor', null)),

  -- Geo + lifecycle
  country TEXT,
  city TEXT,
  joined_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,

  -- Engagement signal — number of posts/comments/likes (admin export)
  posts_count INT,
  comments_count INT,
  likes_count INT,

  -- Win-back campaign tracking
  winback_email_sent_at TIMESTAMPTZ,
  winback_email_template TEXT,
  winback_response TEXT
    CHECK (winback_response IN ('migrated_to_50', 'declined', 'cancelled', 'no_reply', null)),

  -- Source attribution — kako je došao (čitamo iz Skool referrer ako exposed)
  source_attribution TEXT,

  -- Free-form admin notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skool_members_tier
  ON public.skool_members (tier);

CREATE INDEX IF NOT EXISTS idx_skool_members_email
  ON public.skool_members (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skool_members_winback
  ON public.skool_members (winback_email_sent_at)
  WHERE winback_email_sent_at IS NOT NULL;

-- Updated_at trigger reuses the same fn pattern as 0030
CREATE OR REPLACE FUNCTION public.skool_members_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skool_members_updated_at ON public.skool_members;
CREATE TRIGGER skool_members_updated_at
  BEFORE UPDATE ON public.skool_members
  FOR EACH ROW
  EXECUTE FUNCTION public.skool_members_set_updated_at();

-- Service-role only — admin tool, no public access
ALTER TABLE public.skool_members ENABLE ROW LEVEL SECURITY;
