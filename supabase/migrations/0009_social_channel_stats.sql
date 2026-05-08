-- =====================================================================
--  LAMON HQ — Migration 0009: Social Channel Stats (Performance Analytics)
--  Stores periodic snapshots of channel-level metrics (subs, total views,
--  video count) so the Analytics room can show deltas over time.
-- =====================================================================

create table if not exists public.social_channel_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null
    check (platform in ('youtube', 'instagram', 'tiktok', 'linkedin')),
  handle text,
  channel_id text,
  subscribers bigint,
  total_views bigint,
  video_count int,
  fetched_at timestamptz not null default now(),
  raw jsonb
);

create index if not exists scs_user_platform_idx
  on public.social_channel_stats (user_id, platform, fetched_at desc);

alter table public.social_channel_stats enable row level security;

create policy "scs_owner_select" on public.social_channel_stats
  for select using (auth.uid() = user_id);
create policy "scs_owner_insert" on public.social_channel_stats
  for insert with check (auth.uid() = user_id);
create policy "scs_owner_delete" on public.social_channel_stats
  for delete using (auth.uid() = user_id);
