-- =====================================================================
--  LAMON HQ — Migration 0014: agent_actions
--  Long-running AI agent research jobs spawned from clickable Vault rooms.
--
--  Flow:
--    1. User clicks Nova room → picks "Find AI-automatable businesses"
--    2. Server action inserts row (status='queued') + sends Inngest event
--    3. Inngest function picks up event, runs Claude Sonnet 4.6 with
--       web_search tool (max 5 calls), updates progress_text after each
--       step (LISTEN/NOTIFY broadcast via Supabase Realtime → animated UI)
--    4. On completion: writes result_md + sources, pushes to Notion DB
--       "🧠 Knowledge Insights", marks status='completed'
--    5. Other agents (Holmes/Jarvis/Atlas...) inject latest 10 completed
--       insights into their system prompts via shared_insights view
-- =====================================================================

create table if not exists public.agent_actions (
  id           uuid primary key default gen_random_uuid(),
  -- Which vault room agent ran this (matches AgentId in src/lib/vault.ts)
  room         text not null check (room in (
    'holmes','jarvis','nova','comms','treasury',
    'steward','atlas','mentat','forge'
  )),
  -- Action key (matches the actions defined in src/lib/agentActions.ts)
  action_type  text not null,
  -- Human-readable title (e.g. "Find AI-automatable businesses")
  title        text not null,
  -- The actual prompt that goes to Claude (rendered from template + ctx)
  prompt       text not null,
  status       text not null default 'queued' check (status in (
    'queued','running','completed','failed'
  )),
  -- Live progress text shown in the room animation. Inngest writes this
  -- after each web_search call / synthesis step.
  progress_text text,
  -- Final markdown result (Claude's synthesized answer)
  result_md    text,
  -- AI-generated 2-3 sentence summary for shared agent memory injection
  summary      text,
  -- Sources Claude cited: [{ title, url, snippet }]
  sources      jsonb default '[]'::jsonb,
  -- Topic tags chosen by Claude: ["strategy","opportunity",...]
  tags         text[] default array[]::text[],
  -- Notion page ID once the result is mirrored. NULL until pushed.
  notion_page_id text,
  -- Anthropic token usage / cost tracking (input, output, web_search calls)
  usage        jsonb,
  -- Error details if status='failed'
  error_text   text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz
);

create index if not exists agent_actions_room_status_idx
  on public.agent_actions (room, status, created_at desc);

create index if not exists agent_actions_completed_idx
  on public.agent_actions (completed_at desc)
  where status = 'completed';

-- RLS: owner-only (single user app, Leonardo)
alter table public.agent_actions enable row level security;

drop policy if exists "agent_actions_owner_all" on public.agent_actions;
create policy "agent_actions_owner_all"
  on public.agent_actions
  for all
  to authenticated
  using (true)
  with check (true);

-- Service role bypasses RLS (Inngest function uses service role key)
grant all on public.agent_actions to service_role;

-- Realtime: enable broadcast on this table so the UI can subscribe
-- to live status/progress updates without polling.
alter publication supabase_realtime add table public.agent_actions;

-- View: latest 20 completed insights, used by ALL other agent prompts
-- to inject shared knowledge ("here's what your siblings recently
-- discovered — use this context").
create or replace view public.shared_insights as
select
  id,
  room,
  action_type,
  title,
  summary,
  tags,
  completed_at
from public.agent_actions
where status = 'completed'
  and summary is not null
order by completed_at desc
limit 20;

grant select on public.shared_insights to authenticated, service_role;
