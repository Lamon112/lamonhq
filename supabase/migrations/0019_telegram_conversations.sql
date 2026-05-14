-- Telegram userbot conversation state machine
--
-- Stores DM conversation history + per-user state for the @lamonleonardo
-- Telegram userbot auto-responder. The userbot polls incoming DMs every
-- 30-60 sec, classifies intent (Haiku), advances the user through a
-- 5-stage state machine, and sends auto-replies as @lamonleonardo via
-- GramJS MTProto.
--
-- Stages:
--   0. NEW         — user just DMed, intent classified, qualifying questions sent
--   1. QUALIFYING  — waiting for answers to 3 qualifying questions
--   2. PITCH       — answers received, PDF + PREMIUM pitch sent
--   3. AWAITING    — pitch sent, awaiting user decision (join / detail / mentor)
--   4. MEMBER      — user joined PREMIUM grupa
--   5. HANDOVER    — high-intent (mentorstvo or explicit direct contact)
--                    — bot stops auto-replying, Leonardo manual takeover
--   6. NURTURE     — ghost > 24h, drip scheduled
--   7. DEAD        — ghost > 7 days OR user explicitly opted out
--
-- ALL CONVERSATIONS scoped to one Telegram account (Leonardov @lamonleonardo).
-- If we ever multi-tenant this, add `account_user_id` foreign key.

CREATE TABLE IF NOT EXISTS public.telegram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Telegram peer identity
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  -- State machine
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'qualifying', 'pitch', 'awaiting', 'member', 'handover', 'nurture', 'dead')),
  -- Initial CTA the user used (zlatna_knjiga / yt / mentorstvo / info / generic)
  initial_intent TEXT,
  -- Captured user data (extracted via Haiku from qualifying answers)
  -- Schema: { location, age, experience_level, hours_per_week, monthly_goal, raw_answers }
  captured_data JSONB DEFAULT '{}'::jsonb,
  -- First DM Leonardo received from this user
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Last DM (in either direction) for this conversation
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Last bot-sent reply (for nurture timing)
  last_bot_reply_at TIMESTAMPTZ,
  -- Whether the user has been escalated to Leonardo (HANDOVER stage)
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  -- PREMIUM membership flag
  joined_premium_at TIMESTAMPTZ,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_conv_stage ON public.telegram_conversations(stage);
CREATE INDEX IF NOT EXISTS idx_telegram_conv_last_msg ON public.telegram_conversations(last_message_at DESC);

-- Per-message log so we can audit conversation flow + train the auditor
-- on full back-and-forth. Direction: 'in' = user → @lamonleonardo,
-- 'out' = bot reply as @lamonleonardo.
CREATE TABLE IF NOT EXISTS public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.telegram_conversations(id) ON DELETE CASCADE,
  -- Telegram's own message ID for dedup + reply-threading
  telegram_message_id BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT NOT NULL,
  -- For outbound: which template was used (for analytics + auditor training)
  template_id TEXT,
  -- For outbound: stage transition that triggered this reply
  stage_before TEXT,
  stage_after TEXT,
  -- Audit result if this was a bot reply (from draftAuditor)
  audit_result JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, telegram_message_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_telegram_msg_conv ON public.telegram_messages(conversation_id, sent_at DESC);

-- Poller cursor — tracks the highest Telegram update ID we've processed
-- so we don't re-poll old messages. Single-row table per Telegram account.
CREATE TABLE IF NOT EXISTS public.telegram_poller_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Telegram MTProto update offset (used by gramjs getUpdates equivalent)
  last_update_id BIGINT NOT NULL DEFAULT 0,
  -- Heartbeat — verifies poller is alive
  last_poll_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Counters for debugging / audit lab visibility
  total_polled BIGINT NOT NULL DEFAULT 0,
  total_replied BIGINT NOT NULL DEFAULT 0,
  total_escalated BIGINT NOT NULL DEFAULT 0,
  notes TEXT
);

INSERT INTO public.telegram_poller_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- updated_at trigger for telegram_conversations
CREATE OR REPLACE FUNCTION public.touch_telegram_conv_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER telegram_conv_updated
  BEFORE UPDATE ON public.telegram_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_telegram_conv_updated();

-- RLS — service role only (poller runs server-side; UI reads via server actions)
ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_poller_state ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Leonardo only in single-user setup) to read
-- everything for the Skool Ops Inbox tab. Service role bypass RLS by default.
CREATE POLICY "auth read all telegram_conv" ON public.telegram_conversations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth read all telegram_msg" ON public.telegram_messages
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth read poller state" ON public.telegram_poller_state
  FOR SELECT USING (auth.role() = 'authenticated');
