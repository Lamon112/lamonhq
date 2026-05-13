-- 0018_outreach_status_subtypes.sql
--
-- Expand outreach.status and outreach.platform CHECK constraints so the
-- Sent Archive UI can track richer outcomes than the original
-- ("sent", "replied", "no_reply", "bounced").
--
-- The earlier "replied" bucket lumped together every kind of response —
-- a positive "send more info" reply, a booked Zoom, a closed-won deal,
-- and a flat-out rejection all read identically in the channel filter.
-- Splitting that bucket into four sub-statuses lets Leonardo see at a
-- glance which mails are alive in the pipeline vs. dead.
--
-- platform side: "whatsapp" and "phone" were previously rejected by the
-- CHECK, forcing the SentArchive multi-touch flow to persist WA follow-
-- ups as platform="other" with a marker phrase in the message body
-- (see SentArchivePanel.waOutreachByLead). Relaxing the CHECK lets the
-- code-side mapping in addOutreach go away in a follow-up cleanup.

-- ---------- status ----------
alter table public.outreach
  drop constraint if exists outreach_status_check;

alter table public.outreach
  add constraint outreach_status_check
  check (status in (
    'sent',
    'replied',           -- generic / legacy "they responded"
    'replied_positive',  -- interested, asking for more info
    'replied_booked',    -- Zoom / call confirmed
    'replied_won',       -- converted to paying client
    'replied_rejected',  -- "nismo zainteresirani" — clean no
    'no_reply',
    'bounced'
  ));

-- ---------- platform ----------
alter table public.outreach
  drop constraint if exists outreach_platform_check;

alter table public.outreach
  add constraint outreach_platform_check
  check (platform in (
    'linkedin',
    'instagram',
    'tiktok',
    'email',
    'whatsapp',
    'phone',
    'other'
  ));
