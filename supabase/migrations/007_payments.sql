-- Incremental migration for projects that already ran an earlier schema.sql.
-- Safe to run once in the SQL Editor.
--
-- Adds billing: a payment_plans row per project describing how it's priced
-- (a fixed monthly fee, or a one-time total amount for the whole project),
-- and a payments ledger recording every amount actually received against it.

create table if not exists payment_plans (
  project_id uuid primary key references projects (id) on delete cascade,
  plan_type text not null check (plan_type in ('monthly_fixed', 'one_time')),
  amount numeric not null default 0,
  currency text not null default 'USD',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  amount numeric not null,
  currency text not null default 'USD',
  kind text not null check (kind in ('monthly', 'additional', 'installment')),
  period text,
  note text not null default '',
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists payments_project_id_idx on payments (project_id);
create index if not exists payments_paid_on_idx on payments (paid_on);

alter table payment_plans enable row level security;
alter table payments enable row level security;
