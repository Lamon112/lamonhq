-- =====================================================================
--  LAMON HQ — Migration 0006: Daily Briefings (Autopilot mode)
-- =====================================================================

create table if not exists public.daily_briefings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  briefing_date date not null,
  greeting text,
  top_actions jsonb not null default '[]'::jsonb,
  -- [{ "title": "...", "why": "...", "room": "outreach", "rowId": "...", "done": false }]
  context_summary text,
  motivational_hook text,
  raw_payload jsonb default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create index if not exists daily_briefings_user_date_idx
  on public.daily_briefings (user_id, briefing_date desc);

alter table public.daily_briefings enable row level security;

do $LMHQ$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'daily_briefings' and policyname = 'owner_select'
  ) then
    execute 'create policy "owner_select" on public.daily_briefings for select using (auth.uid() = user_id)';
    execute 'create policy "owner_insert" on public.daily_briefings for insert with check (auth.uid() = user_id)';
    execute 'create policy "owner_update" on public.daily_briefings for update using (auth.uid() = user_id)';
    execute 'create policy "owner_delete" on public.daily_briefings for delete using (auth.uid() = user_id)';
  end if;
end$LMHQ$;
