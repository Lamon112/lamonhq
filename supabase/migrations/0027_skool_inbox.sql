-- Skool community DM/post auto-responder state.
--
-- Leonardov 2026-05-14 directive:
--   "sustav za automatsko odgovaranje na skoolu, integracija u skool"
--
-- Skool has NO public API. Three implementation paths:
--   A. Browser-extension userscript that runs in Leonardov Skool tab,
--      polls DMs/posts, triggers auto-replies. Requires Leonardov machine
--      to be on or VPS+headless Chrome.
--   B. Playwright/Puppeteer scraper running on a Render/Railway worker
--      that logs in as Leonardo (storing session cookies in env) and
--      polls every 5-10 min.
--   C. Hybrid: scrape posts/DMs via worker, push replies via the same
--      worker. Auth via Skool session cookies.
--
-- v1 (this schema): store the inbox + outbound state. v1.1 ships the
-- Playwright worker (separate Render service) that talks to this table.
-- v1.2 adds template-based auto-replies via same flow as Telegram bot.

CREATE TABLE IF NOT EXISTS public.skool_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Skool user identity (scraped from their member page)
  skool_user_id TEXT NOT NULL UNIQUE,
  skool_handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  -- Membership flags
  is_premium_member BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ,
  -- State machine (mirrors telegram_conversations)
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new','qualifying','pitch','awaiting','member','handover','nurture','dead')),
  initial_intent TEXT,
  captured_data JSONB DEFAULT '{}'::jsonb,
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_bot_reply_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sc_stage ON public.skool_conversations(stage);
CREATE INDEX IF NOT EXISTS idx_sc_last_msg ON public.skool_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.skool_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.skool_conversations(id) ON DELETE CASCADE,
  -- Source: 'dm' = direct message, 'post' = community feed post,
  -- 'comment' = comment on community post
  source TEXT NOT NULL CHECK (source IN ('dm','post','comment')),
  external_message_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  body TEXT NOT NULL,
  template_id TEXT,
  stage_before TEXT,
  stage_after TEXT,
  audit_result JSONB,
  deleted_at TIMESTAMPTZ,
  delete_reason TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, external_message_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_sm_conv ON public.skool_messages(conversation_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.skool_poller_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  worker_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_dm_cursor TEXT,
  last_post_cursor TEXT,
  total_polled BIGINT NOT NULL DEFAULT 0,
  total_replied BIGINT NOT NULL DEFAULT 0,
  total_escalated BIGINT NOT NULL DEFAULT 0,
  paused BOOLEAN NOT NULL DEFAULT true,  -- default paused until tested
  notes TEXT
);
INSERT INTO public.skool_poller_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_skool_conv_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skool_conv_updated ON public.skool_conversations;
CREATE TRIGGER skool_conv_updated BEFORE UPDATE ON public.skool_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_skool_conv_updated();

ALTER TABLE public.skool_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skool_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skool_poller_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth skool_conv" ON public.skool_conversations;
CREATE POLICY "auth skool_conv" ON public.skool_conversations FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth skool_msg" ON public.skool_messages;
CREATE POLICY "auth skool_msg" ON public.skool_messages FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth skool_state" ON public.skool_poller_state;
CREATE POLICY "auth skool_state" ON public.skool_poller_state FOR ALL USING (auth.role() = 'authenticated');
