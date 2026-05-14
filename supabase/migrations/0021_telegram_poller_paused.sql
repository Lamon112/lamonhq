-- Telegram bot kill switch — Leonardo's directive 2026-05-14:
-- "ne salji vise nikome poruke dokle nismo troduplo provjerili da sve radi"
--
-- The poller checks this flag at the top of every cron tick. When TRUE,
-- it just touches the heartbeat and returns — no polling, no replies.
-- Re-enable with:  UPDATE telegram_poller_state SET paused = false WHERE id = 1;

ALTER TABLE public.telegram_poller_state
  ADD COLUMN IF NOT EXISTS paused BOOLEAN NOT NULL DEFAULT false;

-- Default-pause until comprehensive conversation tests pass.
UPDATE public.telegram_poller_state SET paused = true WHERE id = 1;
