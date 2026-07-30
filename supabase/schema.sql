-- Freelance HQ schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query) for a
-- fresh project. It creates the three tables the app needs and locks them down with
-- Row Level Security so only the server-side service role key (never exposed to the
-- browser) can read or write.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null default '',
  client_details jsonb not null default '{}'::jsonb,
  type text not null check (type in ('seo', 'web_dev', 'digital_marketing', 'other')),
  description text not null default '',
  color text not null default '#33d485',
  archived boolean not null default false,
  start_date date,
  end_date date,
  website_url text not null default '',
  web_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  order_index integer not null default 0
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  stage_id uuid references stages (id) on delete set null,
  title text not null,
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  scheduled_for text check (scheduled_for in ('today')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  order_index integer not null default 0
);

create index if not exists stages_project_id_idx on stages (project_id);
create index if not exists tasks_project_id_idx on tasks (project_id);
create index if not exists tasks_stage_id_idx on tasks (stage_id);

-- Single-row table holding your own business branding (company name + logo) that
-- appears on generated reports. The boolean primary key + check constraint is a
-- standard Postgres trick to guarantee at most one row can ever exist.
create table if not exists business_profile (
  id boolean primary key default true,
  company_name text not null default '',
  logo_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint business_profile_singleton check (id)
);

-- Storage bucket for client and company logos uploaded from the app. Public so the
-- generated PDF reports (and <img> tags in the browser) can load them directly by
-- URL; only the service role key can write to it, since RLS/storage writes bypass
-- policies for that key.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Row Level Security, intentionally with no policies: the app only ever talks to
-- Supabase from server-side code using the service role key, which bypasses RLS.
-- Enabling RLS here means the anon/public API key (if it ever leaked) grants zero
-- access to this data.
alter table projects enable row level security;
alter table stages enable row level security;
alter table tasks enable row level security;
alter table business_profile enable row level security;
