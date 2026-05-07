-- =====================================================================
--  LAMON HQ — Initial schema (Phase 1 MVP)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query)
--  Single-user RLS: only the owner (leonardo) can read/write his rows.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- Profiles ----------
-- Mirrors auth.users (one row per signed-in user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Clients ----------
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('b2b_clinic', 'coach_mentor', 'affiliate')),
  status text not null default 'onboarding'
    check (status in ('active', 'onboarding', 'paused', 'churned')),
  monthly_revenue numeric(10, 2) default 0,
  start_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists clients_status_idx on public.clients (status);

-- ---------- Leads / Pipeline ----------
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  source text check (source in ('linkedin', 'instagram', 'tiktok', 'referral', 'other')),
  niche text check (niche in ('stomatologija', 'estetska', 'fizio', 'ortopedija', 'coach', 'other')),
  icp_score int check (icp_score >= 0 and icp_score <= 20),
  stage text not null default 'discovery'
    check (stage in ('discovery', 'pricing', 'financing', 'booking', 'closed_won', 'closed_lost')),
  estimated_value numeric(10, 2),
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists leads_stage_idx on public.leads (stage);

-- ---------- Outreach (per-lead messages) ----------
create table if not exists public.outreach (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  lead_name text,
  platform text check (platform in ('linkedin', 'instagram', 'tiktok', 'email', 'other')),
  message text,
  status text default 'sent'
    check (status in ('sent', 'replied', 'no_reply', 'bounced')),
  sent_at timestamptz not null default now()
);
create index if not exists outreach_user_id_idx on public.outreach (user_id);
create index if not exists outreach_sent_at_idx on public.outreach (sent_at);

-- ---------- Content posts ----------
create table if not exists public.content_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'linkedin')),
  post_url text,
  title text,
  posted_at timestamptz,
  views int default 0,
  likes int default 0,
  comments int default 0,
  saves int default 0,
  link_clicks int default 0,
  created_at timestamptz not null default now()
);
create index if not exists content_posts_user_id_idx on public.content_posts (user_id);
create index if not exists content_posts_platform_idx on public.content_posts (platform);

-- ---------- Goals ----------
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('monthly_mrr', 'active_clients', 'leads_per_week')),
  target_value numeric(10, 2) not null,
  current_value numeric(10, 2) default 0,
  deadline date,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_id_idx on public.goals (user_id);

-- ---------- Tasks ----------
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  room text check (room in (
    'outreach', 'discovery', 'closing',
    'lead_scorer', 'analytics', 'competitor',
    'clients', 'calendar', 'reports'
  )),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);

-- ---------- Activity log ----------
create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  room text,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_user_id_idx on public.activity_log (user_id);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

-- ---------- Competitors ----------
create table if not exists public.competitors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  url text,
  notes text,
  last_check_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists competitors_user_id_idx on public.competitors (user_id);

-- =====================================================================
--  ROW LEVEL SECURITY — single-user app, owner-only access
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.outreach enable row level security;
alter table public.content_posts enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;
alter table public.competitors enable row level security;

-- Profiles
drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Generic owner policy generator (run for each table)
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'clients', 'leads', 'outreach', 'content_posts',
      'goals', 'tasks', 'activity_log', 'competitors'
    ])
  loop
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format(
      'create policy "owner_select" on public.%I for select using (auth.uid() = user_id)',
      t
    );

    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format(
      'create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id)',
      t
    );

    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format(
      'create policy "owner_update" on public.%I for update using (auth.uid() = user_id)',
      t
    );

    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format(
      'create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id)',
      t
    );
  end loop;
end$$;

-- =====================================================================
--  updated_at auto-touch
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();
