-- Coach Lab — AI YouTube biznis coach za Leonardove 1:1 studente.
--
-- Leonardov 2026-05-14 directive:
--   "program koji ce biti perfektan coach za youtube biznis umjesto mene
--    - ili ti ga ja nadgledavam, a on pomaze mojim 1:1 studentima da
--    uspiju sa iznimno personaliziranim planom i analizama"
--
-- Architecture:
--   - Each 1:1 student = 1 row in coach_students
--   - Student onboarding fills in: niche, current channel stats, goals,
--     bottleneck, learning style
--   - AI coach generates a 12-week personalized roadmap (Claude Opus)
--   - Weekly check-in: student uploads metrics + asks questions
--   - AI replies with personalized analysis using their full history
--     + Leonardov methodology + their roadmap context
--   - Leonardo reviews all AI replies before they're sent (oversight mode)

CREATE TABLE IF NOT EXISTS public.coach_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identity
  full_name TEXT NOT NULL,
  email TEXT,
  telegram_handle TEXT,
  -- Onboarding intake
  niche TEXT,                          -- e.g. "AI tutorials", "Croatian comedy"
  primary_platform TEXT CHECK (primary_platform IN ('youtube', 'tiktok', 'instagram', 'cross')),
  current_subs INT,
  current_avg_views BIGINT,
  monetization_status TEXT,            -- "not yet", "amp eligible", "earning <500", "earning 500-2k", "earning 2k+"
  monthly_goal_eur INT,
  hours_per_week INT,
  primary_bottleneck TEXT,             -- self-reported
  learning_style TEXT,                 -- "video", "written", "1on1", "mixed"
  -- Generated plan
  ai_roadmap_md TEXT,                  -- 12-week markdown plan
  ai_roadmap_generated_at TIMESTAMPTZ,
  -- Lifecycle
  start_date DATE,
  months_paid INT DEFAULT 0,
  monthly_fee_eur INT DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('onboarding', 'active', 'paused', 'graduated', 'churned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_status ON public.coach_students(status);
CREATE INDEX IF NOT EXISTS idx_cs_start ON public.coach_students(start_date DESC);

-- Weekly check-ins — student submits metrics + question, AI drafts reply
CREATE TABLE IF NOT EXISTS public.coach_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.coach_students(id) ON DELETE CASCADE,
  week_number INT NOT NULL,             -- 1..52 from start_date
  -- Student input
  metrics JSONB DEFAULT '{}'::jsonb,    -- {views_this_week, subs_gained, top_video_url, ...}
  videos_published JSONB DEFAULT '[]'::jsonb,
  question TEXT,                        -- free-form student question
  blocker TEXT,                         -- self-reported bottleneck this week
  -- AI analysis
  ai_analysis_md TEXT,                  -- Markdown: what's working, what's not, next 7-day plan
  ai_recommended_actions JSONB DEFAULT '[]'::jsonb,
  ai_generated_at TIMESTAMPTZ,
  -- Leonardo oversight
  leonardo_approved BOOLEAN DEFAULT false,
  leonardo_edits_md TEXT,               -- Leonardov override or addendum
  sent_to_student_at TIMESTAMPTZ,
  generation_cost_usd NUMERIC(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_student_week ON public.coach_checkins(student_id, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_cc_pending_review ON public.coach_checkins(leonardo_approved, ai_generated_at DESC)
  WHERE leonardo_approved = false AND ai_generated_at IS NOT NULL;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_coach_student_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_student_updated ON public.coach_students;
CREATE TRIGGER coach_student_updated BEFORE UPDATE ON public.coach_students
  FOR EACH ROW EXECUTE FUNCTION public.touch_coach_student_updated();

DROP TRIGGER IF EXISTS coach_checkin_updated ON public.coach_checkins;
CREATE TRIGGER coach_checkin_updated BEFORE UPDATE ON public.coach_checkins
  FOR EACH ROW EXECUTE FUNCTION public.touch_coach_student_updated();

-- RLS
ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read coach_students" ON public.coach_students;
CREATE POLICY "auth read coach_students" ON public.coach_students
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth write coach_students" ON public.coach_students;
CREATE POLICY "auth write coach_students" ON public.coach_students
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth read coach_checkins" ON public.coach_checkins;
CREATE POLICY "auth read coach_checkins" ON public.coach_checkins
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth write coach_checkins" ON public.coach_checkins;
CREATE POLICY "auth write coach_checkins" ON public.coach_checkins
  FOR ALL USING (auth.role() = 'authenticated');
