-- =====================================================================
--  LAMON HQ — Migration 0004: Calendly integration
-- =====================================================================

-- Add email + Calendly event URI to leads (so webhooks can match)
alter table public.leads
  add column if not exists email text,
  add column if not exists calendly_event_uri text;

create index if not exists leads_email_idx on public.leads (lower(email));
create unique index if not exists leads_calendly_event_uri_idx
  on public.leads (calendly_event_uri)
  where calendly_event_uri is not null;

-- Per-user integration settings (Calendly tokens, webhook signing keys, etc.)
create table if not exists public.integrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.integrations enable row level security;

do $LMHQ$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'integrations' and policyname = 'owner_select'
  ) then
    execute 'create policy "owner_select" on public.integrations for select using (auth.uid() = user_id)';
    execute 'create policy "owner_insert" on public.integrations for insert with check (auth.uid() = user_id)';
    execute 'create policy "owner_update" on public.integrations for update using (auth.uid() = user_id)';
    execute 'create policy "owner_delete" on public.integrations for delete using (auth.uid() = user_id)';
  end if;
end$LMHQ$;

drop trigger if exists integrations_touch on public.integrations;
create trigger integrations_touch before update on public.integrations
  for each row execute function public.touch_updated_at();
