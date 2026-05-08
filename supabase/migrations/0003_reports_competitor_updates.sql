-- =====================================================================
--  LAMON HQ — Migration 0003: Weekly reports + competitor updates
-- =====================================================================

-- ---------- Weekly reports ----------
create table if not exists public.weekly_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  week_start date not null,
  content text,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, week_start)
);

create index if not exists weekly_reports_user_id_idx
  on public.weekly_reports (user_id);
create index if not exists weekly_reports_client_id_idx
  on public.weekly_reports (client_id);
create index if not exists weekly_reports_week_start_idx
  on public.weekly_reports (week_start desc);

alter table public.weekly_reports enable row level security;

do $LMHQ$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'weekly_reports' and policyname = 'owner_select'
  ) then
    execute 'create policy "owner_select" on public.weekly_reports for select using (auth.uid() = user_id)';
    execute 'create policy "owner_insert" on public.weekly_reports for insert with check (auth.uid() = user_id)';
    execute 'create policy "owner_update" on public.weekly_reports for update using (auth.uid() = user_id)';
    execute 'create policy "owner_delete" on public.weekly_reports for delete using (auth.uid() = user_id)';
  end if;
end$LMHQ$;

drop trigger if exists weekly_reports_touch on public.weekly_reports;
create trigger weekly_reports_touch before update on public.weekly_reports
  for each row execute function public.touch_updated_at();

-- ---------- Competitor updates (timeline of observations) ----------
create table if not exists public.competitor_updates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  observation text not null,
  url text,
  created_at timestamptz not null default now()
);

create index if not exists competitor_updates_user_id_idx
  on public.competitor_updates (user_id);
create index if not exists competitor_updates_competitor_id_idx
  on public.competitor_updates (competitor_id);
create index if not exists competitor_updates_created_at_idx
  on public.competitor_updates (created_at desc);

alter table public.competitor_updates enable row level security;

do $LMHQ$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'competitor_updates' and policyname = 'owner_select'
  ) then
    execute 'create policy "owner_select" on public.competitor_updates for select using (auth.uid() = user_id)';
    execute 'create policy "owner_insert" on public.competitor_updates for insert with check (auth.uid() = user_id)';
    execute 'create policy "owner_update" on public.competitor_updates for update using (auth.uid() = user_id)';
    execute 'create policy "owner_delete" on public.competitor_updates for delete using (auth.uid() = user_id)';
  end if;
end$LMHQ$;

-- ---------- Lead probability (deal pipeline math) ----------
-- Add a per-lead probability override (NULL = inferred from stage)
alter table public.leads
  add column if not exists probability numeric(3, 2);

do $LMHQ$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_probability_check'
  ) then
    alter table public.leads
      add constraint leads_probability_check
      check (probability is null or (probability >= 0 and probability <= 1));
  end if;
end$LMHQ$;
