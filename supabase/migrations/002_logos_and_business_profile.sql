-- Incremental migration for projects that already ran the original schema.sql
-- before logo uploads existed. Safe to run once in the SQL Editor — everything is
-- idempotent (if-not-exists / on-conflict).
--
-- Note: client logos need no migration of their own — they're stored inside the
-- existing `projects.client_details` jsonb column under a new "logoUrl" key, which
-- Postgres accepts without any schema change.

create table if not exists business_profile (
  id boolean primary key default true,
  company_name text not null default '',
  logo_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint business_profile_singleton check (id)
);

alter table business_profile enable row level security;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
