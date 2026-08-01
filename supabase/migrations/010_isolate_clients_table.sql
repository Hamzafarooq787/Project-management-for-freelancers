-- Incremental migration. Safe to run once in the SQL Editor.
--
-- 009 created a table literally named "clients" using `create table if not
-- exists`. If your Supabase project is shared with another app that already
-- has its own "clients" table (a different schema), 009 silently left that
-- foreign table alone — and the client_id foreign key on projects ended up
-- pointing at it, breaking inserts since the columns don't match what this
-- app expects. This migration moves everything to a table namespaced to
-- this app so it can never collide with another project's "clients" table.

create table if not exists freelance_hq_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  logo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If 009 actually created its own "clients" table (i.e. it has the exact
-- columns this app expects, not some unrelated app's schema), carry any rows
-- already in it over to the new table.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'clients' and column_name = 'company'
  ) and exists (
    select 1 from information_schema.columns
    where table_name = 'clients' and column_name = 'logo_url'
  ) then
    insert into freelance_hq_clients (id, name, company, email, phone, notes, logo_url, created_at, updated_at)
    select id, name, company, email, phone, notes, logo_url, created_at, updated_at
    from clients
    on conflict (id) do nothing;
  end if;
end $$;

alter table projects drop constraint if exists projects_client_id_fkey;
alter table projects add constraint projects_client_id_fkey
  foreign key (client_id) references freelance_hq_clients (id) on delete set null;

alter table freelance_hq_clients enable row level security;
