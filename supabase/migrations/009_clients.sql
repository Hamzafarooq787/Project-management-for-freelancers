-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Introduces clients as a first-class, reusable entity instead of contact
-- details living only inside each project's client_details snapshot. A
-- project can now be linked to a client via client_id, letting you pick an
-- existing client when creating a project and see every project (of any
-- type) tied to a given client from one place.

create table if not exists clients (
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

alter table projects add column if not exists client_id uuid references clients (id) on delete set null;
create index if not exists projects_client_id_idx on projects (client_id);

alter table clients enable row level security;
