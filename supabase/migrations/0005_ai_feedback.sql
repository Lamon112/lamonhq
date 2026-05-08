-- =====================================================================
--  LAMON HQ — Migration 0005: AI feedback (learning loop for drafts)
-- =====================================================================

create table if not exists public.ai_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,                       -- 'outreach_draft' | 'lead_score' | 'weekly_report' (future)
  prompt_version text,                      -- 'v2' etc, lets us A/B prompts later
  input_payload jsonb not null default '{}'::jsonb,
  output_text text not null,
  rating text check (rating in ('good', 'bad')),
  feedback_notes text,                      -- "too long", "weak cta", etc
  created_at timestamptz not null default now()
);

create index if not exists ai_feedback_user_id_idx
  on public.ai_feedback (user_id);
create index if not exists ai_feedback_rating_kind_idx
  on public.ai_feedback (user_id, kind, rating, created_at desc);

alter table public.ai_feedback enable row level security;

do $LMHQ$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ai_feedback' and policyname = 'owner_select'
  ) then
    execute 'create policy "owner_select" on public.ai_feedback for select using (auth.uid() = user_id)';
    execute 'create policy "owner_insert" on public.ai_feedback for insert with check (auth.uid() = user_id)';
    execute 'create policy "owner_update" on public.ai_feedback for update using (auth.uid() = user_id)';
    execute 'create policy "owner_delete" on public.ai_feedback for delete using (auth.uid() = user_id)';
  end if;
end$LMHQ$;
