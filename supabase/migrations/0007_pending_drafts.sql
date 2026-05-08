-- =====================================================================
--  LAMON HQ — Migration 0007: Pending Drafts (auto follow-ups)
-- =====================================================================

create table if not exists public.pending_drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  draft_type text not null default 'follow_up',
  draft_text text not null,
  reasoning text,
  context_payload jsonb default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'dismissed', 'edited')),
  generated_at timestamptz not null default now(),
  acted_on_at timestamptz
);

create index if not exists pending_drafts_user_status_idx
  on public.pending_drafts (user_id, status, generated_at desc);
create index if not exists pending_drafts_lead_idx
  on public.pending_drafts (lead_id);

alter table public.pending_drafts enable row level security;

create policy "pd_owner_select" on public.pending_drafts
  for select using (auth.uid() = user_id);
create policy "pd_owner_insert" on public.pending_drafts
  for insert with check (auth.uid() = user_id);
create policy "pd_owner_update" on public.pending_drafts
  for update using (auth.uid() = user_id);
create policy "pd_owner_delete" on public.pending_drafts
  for delete using (auth.uid() = user_id);
