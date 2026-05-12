-- Migration: add external_message_id to inbound_messages for dedup
-- Run in Supabase SQL Editor once. Idempotent.

ALTER TABLE inbound_messages
  ADD COLUMN IF NOT EXISTS external_message_id text;

CREATE INDEX IF NOT EXISTS inbound_messages_external_message_id_idx
  ON inbound_messages (user_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

COMMENT ON COLUMN inbound_messages.external_message_id IS
  'Provider-side message ID (Gmail msg id, IG DM id, etc.) — used to dedup auto-poller runs.';
