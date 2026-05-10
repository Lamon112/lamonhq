-- =====================================================================
--  LAMON HQ — Migration 0017: raids (Fallout-Shelter style threat system)
--
--  Spawns "raids" against Leonardo's HQ. Each raid has a finite TTL
--  (expires_at) and a list of defense choices the player can take.
--  Choosing one resolves the raid with an outcome (won/lost) and
--  applies rewards (XP, caps) or penalties (lose lead, MRR risk, etc.).
--
--  Six archetypes, owned by src/lib/raids.ts:
--    counter_scout   — competitor retaliates after Holmes/Nova scout
--    churn_wraith    — client churn signal triggers raid
--    vendor_swarm    — cold sales pitches flood Comms
--    bad_review      — bad review surfaces on Google/social
--    outage_beast    — Vapi/Supabase health drops
--    gdpr_probe      — random compliance probe (monthly low-chance)
--
--  Trigger sources:
--    - Inngest cron raidScanner (every 15 min) — rolls dice + queries
--      agent_actions / churn_radar to spawn appropriate raids
--    - Manual spawn (dev button) — fires server action `spawnRandomRaid`
--
--  When user picks a defense, server action `defendRaid` writes
--  status='resolved', outcome='won'|'lost', defended_at = now(),
--  and applies side-effects (insert into activity_log, decrement
--  cash_ledger if -€penalty, etc.).
--
--  Critical-severity raids also push a Telegram alert via Jarvis.
-- =====================================================================

create table if not exists public.raids (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- Raid archetype (matches RaidType in src/lib/raids.ts)
  raid_type   text not null check (raid_type in (
    'counter_scout','churn_wraith','vendor_swarm',
    'bad_review','outage_beast','gdpr_probe'
  )),

  -- Severity drives badge color + Jarvis push priority
  severity    text not null check (severity in ('low','medium','high','critical')),

  -- B2B (clinic) or B2C (coach) — keeps the two businesses separate
  scope       text not null default 'b2b' check (scope in ('b2b','b2c','all')),

  -- Which vault room this raid attacks (defender room)
  target_room text not null check (target_room in (
    'holmes','jarvis','nova','comms','treasury',
    'steward','atlas','mentat','forge','aegis'
  )),

  -- Free-form context: { competitor_name, lead_id, client_id, score, ... }
  context     jsonb default '{}'::jsonb,

  -- Lifecycle
  status      text not null default 'incoming' check (status in (
    'incoming','resolved','expired'
  )),
  outcome     text check (outcome in ('won','lost','ignored')),

  -- Which defense the player chose (matches RaidDefense.id in raids.ts)
  defense_choice  text,

  -- Side-effect details written when raid is resolved (xp gained, caps,
  -- lead burned, MRR delta, etc.) — read by ActivityFeed for storytelling
  outcome_detail  jsonb,

  spawned_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  defended_at  timestamptz
);

create index if not exists raids_user_status_idx
  on public.raids (user_id, status, spawned_at desc);

-- Active raids ordered by urgency (soonest expiry first)
create index if not exists raids_active_expiry_idx
  on public.raids (expires_at)
  where status = 'incoming';

-- For per-room badge query (count incoming per room)
create index if not exists raids_target_room_active_idx
  on public.raids (target_room)
  where status = 'incoming';

-- RLS: owner-only
alter table public.raids enable row level security;

drop policy if exists "raids_owner_all" on public.raids;
create policy "raids_owner_all"
  on public.raids
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on public.raids to service_role;

-- Realtime: broadcast incoming raid spawns + resolutions to UI
alter publication supabase_realtime add table public.raids;
