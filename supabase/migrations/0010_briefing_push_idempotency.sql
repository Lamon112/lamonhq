-- =====================================================================
--  LAMON HQ — Migration 0010: Briefing Push Idempotency
--  Tracks when each daily briefing was actually pushed to Telegram so
--  re-runs of the cron / manual regenerate don't spam Jarvis messages.
-- =====================================================================

alter table public.daily_briefings
  add column if not exists pushed_to_telegram_at timestamptz;

-- Backfill: assume any briefing older than 1 hour was already pushed
-- so we don't immediately re-push existing rows on next cron tick.
update public.daily_briefings
  set pushed_to_telegram_at = generated_at
  where pushed_to_telegram_at is null
    and generated_at < now() - interval '1 hour';
