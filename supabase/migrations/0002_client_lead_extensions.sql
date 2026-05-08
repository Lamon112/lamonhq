-- =====================================================================
--  LAMON HQ — Migration 0002: Client + Lead extensions
--  Adds operational fields needed by Client Manager, Lead Scorer,
--  and Discovery Bay rooms.
-- =====================================================================

-- ---------- Clients ops fields ----------
alter table public.clients
  add column if not exists last_touchpoint_at timestamptz,
  add column if not exists next_action text,
  add column if not exists next_action_date date,
  add column if not exists churn_risk text;

-- Add the check constraint separately so re-runs are safe
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clients_churn_risk_check'
  ) then
    alter table public.clients
      add constraint clients_churn_risk_check
      check (churn_risk is null or churn_risk in ('low', 'medium', 'high'));
  end if;
end$$;

create index if not exists clients_next_action_date_idx
  on public.clients (next_action_date);
create index if not exists clients_churn_risk_idx
  on public.clients (churn_risk);

-- ---------- Leads: ICP breakdown + discovery tracking ----------
alter table public.leads
  add column if not exists icp_breakdown jsonb default '{}'::jsonb,
  add column if not exists discovery_at timestamptz,
  add column if not exists discovery_outcome text,
  add column if not exists discovery_notes text;

-- Discovery calls are tracked via leads.discovery_at; index for lookups
create index if not exists leads_discovery_at_idx
  on public.leads (discovery_at);

-- ---------- Tasks: link to specific entity (optional) ----------
alter table public.tasks
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists lead_id uuid references public.leads (id) on delete set null;

create index if not exists tasks_client_id_idx on public.tasks (client_id);
create index if not exists tasks_lead_id_idx on public.tasks (lead_id);
