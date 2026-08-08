-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Backlink tracking for SEO projects: entries (platform/site logins, posting
-- cadence, and article/backlink links) organized into named categories.
-- Passwords are stored encrypted (AES-256-GCM, server-side only — see
-- lib/backlinkCrypto.ts) and are only ever decrypted after the requesting
-- user's own security password (a per-user reveal password, unrelated to
-- their login password) checks out against the hash on their profile.

create table if not exists freelance_hq_backlink_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references freelance_hq_projects (id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists freelance_hq_backlink_categories_project_id_idx
  on freelance_hq_backlink_categories (project_id, "order");

alter table freelance_hq_backlink_categories enable row level security;

create table if not exists freelance_hq_backlink_entries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references freelance_hq_backlink_categories (id) on delete cascade,
  project_id uuid not null references freelance_hq_projects (id) on delete cascade,
  name text not null,
  url text not null default '',
  username text not null default '',
  email text not null default '',
  password_encrypted text,
  posts_per_month integer,
  notes text not null default '',
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_backlink_entries_category_id_idx
  on freelance_hq_backlink_entries (category_id);

alter table freelance_hq_backlink_entries enable row level security;

-- Per-user security password (separate from their login password), gating
-- reveal of any saved backlink credential. Null until the user sets one.
alter table freelance_hq_profiles
  add column if not exists vault_password_hash text;
