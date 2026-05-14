-- Human Cold Caller pivot — Leonardov 2026-05-14 directive correction:
-- bot je krivo razumio Vapi/AI voice. Pravi plan = HIRE HUMAN COLD CALLER,
-- pure performance €200 / Plima Voice close.
--
-- Repurpose tables:
--   clinic_call_queue  → still works as the queue (caller picks next lead)
--   clinic_call_attempts → caller logs each call manually via UI
--
-- Add caller_assignments + caller_payouts tables for the human side.
-- AI voice columns (vapi_call_id, vapi_recording_url) stay nullable for
-- legacy/future compatibility.

CREATE TABLE IF NOT EXISTS public.cold_callers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  iban TEXT,                            -- for payout
  -- Compensation model (locked from Notion plan 2026-05-14)
  payout_per_voice_close_eur INT DEFAULT 200,
  payout_per_premium_close_eur INT DEFAULT 300,
  payout_per_mreza_close_eur INT DEFAULT 100,
  payout_per_quality_zoom_eur INT DEFAULT 30, -- only after 3 closes
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'paused', 'churned')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,            -- 7 days from trial_started_at
  trial_call_target INT DEFAULT 50,
  go_no_go_decision TEXT
    CHECK (go_no_go_decision IN ('go', 'no_go', null)),
  go_no_go_at TIMESTAMPTZ,
  contract_signed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_status ON public.cold_callers(status);

-- Assign callers to queue rows (which caller is responsible for which leads)
ALTER TABLE public.clinic_call_queue
  ADD COLUMN IF NOT EXISTS assigned_caller_id UUID REFERENCES public.cold_callers(id);

CREATE INDEX IF NOT EXISTS idx_ccq_caller ON public.clinic_call_queue(assigned_caller_id);

-- When the caller logs a call attempt manually, we use the same
-- clinic_call_attempts table; just add caller_id + manual_log flag.
ALTER TABLE public.clinic_call_attempts
  ADD COLUMN IF NOT EXISTS caller_id UUID REFERENCES public.cold_callers(id);
ALTER TABLE public.clinic_call_attempts
  ADD COLUMN IF NOT EXISTS manual_log BOOLEAN DEFAULT false;
ALTER TABLE public.clinic_call_attempts
  ADD COLUMN IF NOT EXISTS quality_zoom_marked_at TIMESTAMPTZ;
ALTER TABLE public.clinic_call_attempts
  ADD COLUMN IF NOT EXISTS close_status TEXT
    CHECK (close_status IN ('won_voice', 'won_premium', 'won_mreza', 'lost', null));

-- Daily caller report (caller submits at EOD via UI form)
CREATE TABLE IF NOT EXISTS public.caller_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES public.cold_callers(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  calls_attempted INT DEFAULT 0,
  calls_connected INT DEFAULT 0,
  zooms_booked INT DEFAULT 0,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (caller_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_cdr_caller_date ON public.caller_daily_reports(caller_id, report_date DESC);

-- Payout ledger — tracks what we owe + what's been paid
CREATE TABLE IF NOT EXISTS public.caller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES public.cold_callers(id) ON DELETE RESTRICT,
  attempt_id UUID REFERENCES public.clinic_call_attempts(id),
  amount_eur INT NOT NULL,
  reason TEXT NOT NULL,                 -- "voice_close", "premium_close", "quality_zoom", etc.
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cp_caller ON public.caller_payouts(caller_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_unpaid ON public.caller_payouts(paid_at) WHERE paid_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_cold_caller_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cold_caller_updated ON public.cold_callers;
CREATE TRIGGER cold_caller_updated BEFORE UPDATE ON public.cold_callers
  FOR EACH ROW EXECUTE FUNCTION public.touch_cold_caller_updated();

ALTER TABLE public.cold_callers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth cold_callers" ON public.cold_callers;
CREATE POLICY "auth cold_callers" ON public.cold_callers FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth caller_daily_reports" ON public.caller_daily_reports;
CREATE POLICY "auth caller_daily_reports" ON public.caller_daily_reports FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth caller_payouts" ON public.caller_payouts;
CREATE POLICY "auth caller_payouts" ON public.caller_payouts FOR ALL USING (auth.role() = 'authenticated');
