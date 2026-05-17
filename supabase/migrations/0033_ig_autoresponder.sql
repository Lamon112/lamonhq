-- 0033_ig_autoresponder.sql
--
-- Instagram comment + DM auto-responder schema.
--
-- Funnel (per Leonardov 2026-05-17 spec):
--   1. Visitor comments on post matching keyword
--      → we auto-reply PUBLICLY to comment: "javi se u DM 💪"
--   2. Visitor DMs us
--      → we auto-reply with quiz link
--
-- Powered by Meta Graph API + webhooks. Subscription events:
--   - comments (per IG Business account)
--   - messages (per IG Business account, via Messenger Platform)
--
-- All replies logged for analytics + de-dupe (don't reply twice to same
-- comment / same DM thread within cooldown window).

-- ─────────────────────────────────────────────────────────────────
-- ig_keyword_triggers — what to watch for + what to reply with
-- ─────────────────────────────────────────────────────────────────
create table if not exists ig_keyword_triggers (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  match_mode text not null default 'contains' check (match_mode in ('exact', 'contains', 'word_boundary')),
  case_sensitive boolean not null default false,

  -- What to reply PUBLICLY under the comment (step 1 of funnel)
  comment_reply_text text not null,

  -- What to send in DM when user later messages us (step 2)
  dm_reply_text text not null,

  -- Optional link to drop in DM (rendered into dm_reply_text via {{link}})
  dm_link text,

  -- Throttling: don't reply if same user commented within N seconds
  cooldown_seconds int not null default 3600,

  active boolean not null default true,
  priority int not null default 100, -- lower = checked first
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ig_keyword_triggers_active_idx on ig_keyword_triggers(active, priority);
create index if not exists ig_keyword_triggers_keyword_idx on ig_keyword_triggers(keyword);

-- ─────────────────────────────────────────────────────────────────
-- ig_comment_events — every comment we see (matched or not)
-- ─────────────────────────────────────────────────────────────────
create table if not exists ig_comment_events (
  id uuid primary key default gen_random_uuid(),

  -- IG identifiers
  ig_comment_id text not null unique, -- Meta's comment id, dedupe key
  ig_post_id text,
  ig_user_id text not null, -- commenter's IG user id
  ig_username text, -- commenter's @handle if available

  comment_text text not null,

  -- Match
  matched_trigger_id uuid references ig_keyword_triggers(id),
  matched_keyword text,

  -- Public reply tracking
  public_reply_status text not null default 'pending' check (public_reply_status in ('pending', 'sent', 'failed', 'skipped_cooldown', 'skipped_unmatched', 'skipped_self')),
  public_reply_text text,
  public_reply_at timestamptz,
  public_reply_error text,

  received_at timestamptz not null default now()
);

create index if not exists ig_comment_events_user_idx on ig_comment_events(ig_user_id, received_at desc);
create index if not exists ig_comment_events_matched_idx on ig_comment_events(matched_trigger_id, received_at desc);
create index if not exists ig_comment_events_status_idx on ig_comment_events(public_reply_status);

-- ─────────────────────────────────────────────────────────────────
-- ig_dm_events — every DM we receive (matched or not)
-- ─────────────────────────────────────────────────────────────────
create table if not exists ig_dm_events (
  id uuid primary key default gen_random_uuid(),

  -- IG identifiers
  ig_message_id text not null unique, -- Messenger Platform mid
  ig_user_id text not null, -- sender's IG user id (Page-scoped)
  ig_username text,

  message_text text,
  message_type text default 'text' check (message_type in ('text', 'image', 'video', 'story_reply', 'reaction', 'other')),

  -- Link back to the comment that triggered this DM (if user is responding
  -- to our "javi se u DM" prompt)
  triggered_by_comment_id uuid references ig_comment_events(id),

  -- Auto-reply tracking
  reply_status text not null default 'pending' check (reply_status in ('pending', 'sent', 'failed', 'skipped_cooldown', 'skipped_no_match')),
  reply_text text,
  reply_at timestamptz,
  reply_error text,
  link_sent text,

  received_at timestamptz not null default now()
);

create index if not exists ig_dm_events_user_idx on ig_dm_events(ig_user_id, received_at desc);
create index if not exists ig_dm_events_status_idx on ig_dm_events(reply_status);

-- ─────────────────────────────────────────────────────────────────
-- Updated_at trigger for ig_keyword_triggers
-- ─────────────────────────────────────────────────────────────────
create or replace function set_ig_keyword_triggers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ig_keyword_triggers_updated_at on ig_keyword_triggers;
create trigger ig_keyword_triggers_updated_at
  before update on ig_keyword_triggers
  for each row execute function set_ig_keyword_triggers_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- Seed: starter keywords from Leonardov 2026-05-17 spec
-- All point to quiz.lamon.io/quiz initially (per Leonardov funnel).
-- Customize per-keyword later via admin panel.
-- ─────────────────────────────────────────────────────────────────
insert into ig_keyword_triggers (keyword, comment_reply_text, dm_reply_text, dm_link, priority, notes)
values
  (
    'online',
    'Javi se u DM, šaljem vam besplatan vodič 🙏',
    'Hej! 🙌 Evo besplatan vodič koji sam ti obećao — interaktivni AI quiz koji ti za 2 min napravi osobni plan zarade online: {{link}}'||E'\n\nReci mi rezultat kad ga prođeš, čitam sve poruke!',
    'https://quiz.lamon.io/quiz?utm_source=ig&utm_medium=dm&utm_campaign=online',
    10,
    'Trigger iz "online prevare" reaction video 2026-05-17'
  ),
  (
    'AI',
    'Javi se u DM za besplatan AI vodič 🤖',
    'Hej! 🙌 Evo link za besplatan AI quiz koji ti pravi osobni plan zarade preko AI alata: {{link}}'||E'\n\nProđi 2 min i reci mi što misliš!',
    'https://quiz.lamon.io/quiz?utm_source=ig&utm_medium=dm&utm_campaign=ai',
    20,
    'Generalni AI keyword'
  ),
  (
    'clipping',
    'Javi se u DM, šaljem ti sve info o clippingu 🎬',
    'Hej! 🙌 Evo besplatan vodič i osobni plan za clipping karijeru: {{link}}'||E'\n\n2 min interaktivni quiz pa ti šaljem konkretne sljedeće korake.',
    'https://quiz.lamon.io/quiz?utm_source=ig&utm_medium=dm&utm_campaign=clipping',
    30,
    'Clipping monetizacija topic'
  ),
  (
    'zlatna knjiga',
    'Javi se u DM za zlatnu knjigu 📕',
    'Hej! 🙌 Evo Zlatna knjiga + bonus interaktivni quiz koji ti pravi osobni 30-dnevni plan: {{link}}'||E'\n\nReci mi koji rezultat dobiješ!',
    'https://quiz.lamon.io/quiz?utm_source=ig&utm_medium=dm&utm_campaign=zlatna',
    40,
    'Zlatna knjiga lead magnet'
  ),
  (
    'info',
    'Javi se u DM, šaljem ti sve info 🙌',
    'Hej! 🙌 Evo brži način da vidiš što ti se najviše isplati — 2 min AI quiz: {{link}}'||E'\n\nProđi pa ti šaljem detaljniju info baziranu na tvojim odgovorima.',
    'https://quiz.lamon.io/quiz?utm_source=ig&utm_medium=dm&utm_campaign=info',
    50,
    'Generalni info catch-all'
  ),
  (
    'mentorstvo',
    'Javi se u DM za sve info o mentorstvu 💪',
    'Hej! 🙌 Mentorstvo je premium tier SideHustle™ grupe. Prije nego ti pošaljem detalje, prođi ovaj 2 min AI quiz da vidim gdje točno trebaš pomoć: {{link}}'||E'\n\nNakon quiz-a ti šaljem custom mentor plan.',
    'https://quiz.lamon.io/quiz?utm_source=ig&utm_medium=dm&utm_campaign=mentorstvo',
    60,
    'Mentorstvo premium path'
  )
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────
-- RLS — service role only (no public read/write)
-- ─────────────────────────────────────────────────────────────────
alter table ig_keyword_triggers enable row level security;
alter table ig_comment_events enable row level security;
alter table ig_dm_events enable row level security;

-- Service role bypasses RLS automatically; no policies needed since this
-- is server-side only (no anon access).

-- ─────────────────────────────────────────────────────────────────
-- Notes
-- ─────────────────────────────────────────────────────────────────
-- 1. Meta Graph API endpoints used:
--    - Receive: POST /api/webhooks/instagram (this app)
--    - Reply to comment: POST /{ig-comment-id}/replies
--    - Send DM: POST /{ig-business-id}/messages
-- 2. Required Meta app permissions:
--    - instagram_basic
--    - instagram_manage_comments
--    - instagram_manage_messages
--    - pages_messaging
-- 3. Required env vars:
--    - META_APP_SECRET (for webhook signature verification)
--    - META_VERIFY_TOKEN (any random string we choose)
--    - IG_PAGE_ACCESS_TOKEN (long-lived Page token tied to IG Business)
--    - IG_BUSINESS_ACCOUNT_ID
