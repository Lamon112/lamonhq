-- Clinic Caller — automated phone outreach to dental/aesthetic clinics
-- for B2B Plima discovery calls.
--
-- Leonardov 2026-05-14 directive:
--   "sustav za radnike koji ce zvati ordinacije"
--
-- "Radnici" = AI voice agents (Vapi + ElevenLabs + Anthropic stack, per
-- Riva voice MVP already in flight). Each clinic in the queue gets one
-- discovery call attempt; AI follows Leonardov 4-part outreach structure
-- (observation → pain-point Q → solution-proof bridge → assumptive CTA).
--
-- Outcomes:
--   - 'booked'        — discovery call scheduled (success)
--   - 'gatekeeper'    — couldn't reach decision-maker, callback time set
--   - 'voicemail'     — left structured message, ping again in 24h
--   - 'not_interested' — clean rejection, mark cold
--   - 'wrong_number'  — bad data, flag for cleanup
--   - 'no_answer'     — retry queue
--   - 'failed'        — technical failure (drop, no audio)

CREATE TABLE IF NOT EXISTS public.clinic_call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lead identity (denormalized from leads table for call performance)
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  clinic_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,            -- +385... format
  decision_maker_name TEXT,
  preferred_callback_time TIME,        -- if known
  language TEXT DEFAULT 'hr' CHECK (language IN ('hr', 'sr', 'bs', 'en')),
  -- Queue state
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'calling', 'completed', 'paused', 'failed', 'dnc')),
  priority INT NOT NULL DEFAULT 5,     -- 1=urgent, 10=low
  scheduled_for TIMESTAMPTZ,           -- next call attempt
  call_window_start TIME DEFAULT '09:00',
  call_window_end TIME DEFAULT '17:00',
  max_attempts INT DEFAULT 3,
  attempts_made INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  -- Vapi config
  vapi_assistant_id TEXT,              -- which voice assistant config to use
  -- Final outcome
  final_outcome TEXT
    CHECK (final_outcome IN ('booked', 'gatekeeper', 'voicemail', 'not_interested', 'wrong_number', 'no_answer', 'failed', null)),
  final_outcome_at TIMESTAMPTZ,
  meeting_scheduled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccq_status_priority ON public.clinic_call_queue(status, priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_ccq_lead ON public.clinic_call_queue(lead_id);

-- Per-attempt log — what happened on each call
CREATE TABLE IF NOT EXISTS public.clinic_call_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.clinic_call_queue(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  -- Vapi call data
  vapi_call_id TEXT,
  vapi_recording_url TEXT,
  transcript JSONB,                    -- full back-and-forth
  ai_summary TEXT,
  outcome TEXT CHECK (outcome IN ('booked', 'gatekeeper', 'voicemail', 'not_interested', 'wrong_number', 'no_answer', 'failed')),
  next_action TEXT,                    -- "callback at 14:00", "send email", "skip"
  -- Cost tracking
  cost_usd NUMERIC(8, 4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cca_queue ON public.clinic_call_attempts(queue_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_cca_vapi ON public.clinic_call_attempts(vapi_call_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_clinic_call_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ccq_updated ON public.clinic_call_queue;
CREATE TRIGGER ccq_updated BEFORE UPDATE ON public.clinic_call_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_clinic_call_updated();

-- RLS
ALTER TABLE public.clinic_call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_call_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth ccq" ON public.clinic_call_queue;
CREATE POLICY "auth ccq" ON public.clinic_call_queue FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth cca" ON public.clinic_call_attempts;
CREATE POLICY "auth cca" ON public.clinic_call_attempts FOR ALL USING (auth.role() = 'authenticated');
