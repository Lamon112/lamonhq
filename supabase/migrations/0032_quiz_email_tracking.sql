-- Email delivery tracking on quiz_leads
-- Per Leonardov 2026-05-16 "double check protokol" directive: every quiz
-- lead must have explicit email send status so we can see at a glance
-- whether the personalized plan email reached them.

ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS email_status TEXT
    CHECK (email_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'skipped', null));

-- Provider message id (from Resend) — lets us trace each send back to a
-- specific Resend log entry for debugging.
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS email_provider_id TEXT;

-- Last error message if email failed (truncated to 500 chars for storage)
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS email_error TEXT;

-- When the send was attempted
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Number of attempts (1 if first try worked, up to MAX_ATTEMPTS retries)
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS email_attempts INT DEFAULT 0;

-- Index on email_status so the HQ Quiz Funnel panel can quickly surface
-- failed/pending sends needing manual retry.
CREATE INDEX IF NOT EXISTS idx_quiz_leads_email_status
  ON public.quiz_leads (email_status)
  WHERE email_status IS NOT NULL;
