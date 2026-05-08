-- =====================================================================
--  LAMON HQ — Migration 0008: Inbound Messages (Smart Inbox Triage)
-- =====================================================================

create table if not exists public.inbound_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  channel text not null default 'manual'
    check (channel in ('linkedin', 'email', 'instagram', 'tiktok', 'manual')),
  sender_name text,
  raw_text text not null,
  category text
    check (category in (
      'interested', 'objection', 'scheduling',
      'question', 'not_now', 'unsubscribe', 'out_of_office', 'unclear'
    )),
  summary text,
  suggested_stage text,
  reply_drafts jsonb default '[]'::jsonb,
  reasoning text,
  status text not null default 'new'
    check (status in ('new', 'replied', 'dismissed', 'archived')),
  received_at timestamptz not null default now(),
  acted_on_at timestamptz
);

create index if not exists inbound_messages_user_status_idx
  on public.inbound_messages (user_id, status, received_at desc);
create index if not exists inbound_messages_lead_idx
  on public.inbound_messages (lead_id);

alter table public.inbound_messages enable row level security;

create policy "im_owner_select" on public.inbound_messages
  for select using (auth.uid() = user_id);
create policy "im_owner_insert" on public.inbound_messages
  for insert with check (auth.uid() = user_id);
create policy "im_owner_update" on public.inbound_messages
  for update using (auth.uid() = user_id);
create policy "im_owner_delete" on public.inbound_messages
  for delete using (auth.uid() = user_id);
