-- Incremental migration for projects that already ran an earlier schema.sql.
-- Safe to run once in the SQL Editor.
--
-- Adds team accounts with roles (admin / member) and per-member project
-- assignments, so an admin can invite team members and give them access to
-- only specific projects.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_assignments_project_id_idx on project_assignments (project_id);
create index if not exists project_assignments_user_id_idx on project_assignments (user_id);

alter table profiles enable row level security;
alter table project_assignments enable row level security;
