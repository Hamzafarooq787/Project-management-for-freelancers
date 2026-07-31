-- Incremental migration for projects that already ran 007_payments.sql.
-- Safe to run once in the SQL Editor.
--
-- Lets a project have one payment plan per currency (e.g. a PKR plan and a
-- USD plan on the same project) instead of a single project-wide plan.

alter table payment_plans add column if not exists id uuid not null default gen_random_uuid();

alter table payment_plans drop constraint if exists payment_plans_pkey;
alter table payment_plans add constraint payment_plans_pkey primary key (id);

alter table payment_plans drop constraint if exists payment_plans_project_currency_key;
alter table payment_plans add constraint payment_plans_project_currency_key unique (project_id, currency);

create index if not exists payment_plans_project_id_idx on payment_plans (project_id);
