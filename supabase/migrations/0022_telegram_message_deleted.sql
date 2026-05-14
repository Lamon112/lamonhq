-- Track when the userbot retracts a message via GramJS deleteMessages.
-- The post-send duplicate check (Leonardo's zero-tolerance rule: same
-- message NEVER goes twice) deletes the just-sent row if it slipped
-- past the pre-send check. We keep the row in DB so the conversation
-- timeline still shows what was attempted, just with deleted_at + reason.

ALTER TABLE public.telegram_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.telegram_messages
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_telegram_msg_deleted
  ON public.telegram_messages(deleted_at)
  WHERE deleted_at IS NOT NULL;
