-- Quiz AI funnel — Hormozi-style personalized side hustle scorer
-- Replaces Telegram→Skool funnel. Flow:
--   viral TT/IG video → CTA "komentiraj ZLATNA" → AI auto-reply DM s quiz linkom
--   → /quiz multi-step → Claude scoring (score 0-100 + 3 weakness bars + 30-day plan)
--   → /quiz/result/[id] osobni plan + matched case study + soft Skool €50/mj CTA
-- All data persists in quiz_leads for retargeting + nurture sequences.

CREATE TABLE IF NOT EXISTS public.quiz_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw answer payload — keys mirror QuizQuestions.ts step IDs
  -- (trenutno_stanje, iskustvo, sati_tj, budget, blocker, cilj_zarade,
  --  kamera, platforma, lokacija, email, ime, telegram_handle)
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Claude scoring output
  score INT CHECK (score >= 0 AND score <= 100),

  -- Ranked weakness bars (top 3) — JSON: [{label, percent, color}]
  weaknesses JSONB,

  -- Markdown 30-day plan + matched case study + recommended next step
  ai_output_md TEXT,

  -- Which case study Claude matched (tom_17k | matija_3k | vuk_5k | filmovi_30k | borna_doc)
  matched_case_study TEXT,

  -- Lead capture
  lead_email TEXT,
  lead_name TEXT,
  lead_telegram TEXT,
  lead_phone TEXT,

  -- Attribution — utm_source from URL query (tt, ig, telegram, dm, direct)
  source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,

  -- Status pipeline for follow-up — once Skool join confirmed flip to converted
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'dm_sent', 'replied', 'skool_invited', 'converted', 'cold')),

  -- Generation telemetry
  generated_at TIMESTAMPTZ,
  generation_cost_usd NUMERIC(10, 6),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_leads_created_at
  ON public.quiz_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_leads_status
  ON public.quiz_leads (status);

CREATE INDEX IF NOT EXISTS idx_quiz_leads_email
  ON public.quiz_leads (lead_email)
  WHERE lead_email IS NOT NULL;

-- Anyone can INSERT/SELECT their own row (public funnel). Only service-role
-- can UPDATE — admin moves status through pipeline, leads cannot mutate.
ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_leads_insert_public"
  ON public.quiz_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "quiz_leads_select_public"
  ON public.quiz_leads FOR SELECT
  TO anon, authenticated
  USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.quiz_leads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_leads_updated_at ON public.quiz_leads;
CREATE TRIGGER quiz_leads_updated_at
  BEFORE UPDATE ON public.quiz_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.quiz_leads_set_updated_at();
