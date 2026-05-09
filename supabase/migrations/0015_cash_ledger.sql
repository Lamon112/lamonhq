-- =====================================================================
--  LAMON HQ — Migration 0015: cash_ledger
--  Single source of truth for the bank balance Leonardo cares about.
--  Every income (client payment, B2B/B2C revenue, refund) and every
--  outgoing (AI agent costs, fixed monthly expenses, ad-hoc spend)
--  appends a row. Treasury room reads sum() to display running balance.
--
--  Seed: €10,000 starting balance (head-start as of 2026-05-09).
--
--  Recurring monthly outgoings inserted by Inngest cron daily check:
--    - 1st of month:   €380 firm maintenance ("Održavanje firme")
--    - 15th of month:  €970 utilities ("Režije")
--    - 30th of month:  €600 food ("Hrana")
-- =====================================================================

create table if not exists public.cash_ledger (
  id           uuid primary key default gen_random_uuid(),
  -- Owner — single user app, but FK keeps RLS clean
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- When the money moved (not when the row was created)
  occurred_at  timestamptz not null default now(),
  -- + for income, - for outgoing. Stored in cents (EUR).
  amount_cents bigint not null,
  -- Categorization for the UI drill-down + monthly aggregates
  category     text not null check (category in (
    'opening_balance',
    'client_revenue',
    'ai_cost',
    'fixed_expense',
    'one_off_expense',
    'refund',
    'transfer'
  )),
  -- Human-readable description shown in the ledger list
  label        text not null,
  -- Optional source link — e.g. agent_actions.id for AI cost rows,
  -- clients.id for client revenue rows. Kept loose (text) so any
  -- table can reference without FK ceremony.
  source_id    text,
  source_table text,
  -- Free-text metadata (Anthropic input/output tokens, who paid, etc.)
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists cash_ledger_user_occurred_idx
  on public.cash_ledger (user_id, occurred_at desc);

create index if not exists cash_ledger_category_idx
  on public.cash_ledger (category, occurred_at desc);

-- Idempotency for recurring expenses — prevents double-debit if cron
-- runs multiple times on the same day
create unique index if not exists cash_ledger_recurring_unique_idx
  on public.cash_ledger (user_id, category, label, date(occurred_at))
  where category = 'fixed_expense';

-- RLS owner-only
alter table public.cash_ledger enable row level security;
drop policy if exists "cash_ledger_owner_all" on public.cash_ledger;
create policy "cash_ledger_owner_all"
  on public.cash_ledger
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Service role bypasses RLS (Inngest auto-debit + cron use service key)
grant all on public.cash_ledger to service_role;

-- =====================================================================
-- View: cash_balance — running totals + this-month aggregates
-- =====================================================================
create or replace view public.cash_balance as
select
  user_id,
  sum(amount_cents) as balance_cents,
  sum(amount_cents) filter (where amount_cents > 0) as lifetime_in_cents,
  sum(-amount_cents) filter (where amount_cents < 0) as lifetime_out_cents,
  sum(amount_cents) filter (
    where occurred_at >= date_trunc('month', now())
  ) as this_month_net_cents,
  sum(amount_cents) filter (
    where amount_cents > 0
      and occurred_at >= date_trunc('month', now())
  ) as this_month_in_cents,
  sum(-amount_cents) filter (
    where amount_cents < 0
      and occurred_at >= date_trunc('month', now())
  ) as this_month_out_cents,
  count(*) as txn_count
from public.cash_ledger
group by user_id;

grant select on public.cash_balance to authenticated, service_role;

-- =====================================================================
-- Seed: €10,000 head-start opening balance for the sole user (Leonardo)
-- =====================================================================
do $$
declare
  uid uuid;
begin
  -- Pick the first user — single-user app
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is not null then
    insert into public.cash_ledger
      (user_id, occurred_at, amount_cents, category, label, source_table, meta)
    select
      uid,
      timestamp '2026-05-09 00:00:00 +00:00',
      1000000,  -- €10,000 in cents
      'opening_balance',
      'Head-start — bank balance',
      'seed',
      '{"note":"Lamon Agency starting cash 2026-05-09"}'::jsonb
    where not exists (
      select 1 from public.cash_ledger
      where user_id = uid and category = 'opening_balance'
    );
  end if;
end $$;
