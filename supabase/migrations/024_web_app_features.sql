-- Incremental migration. Safe to run once in the SQL Editor.
--
-- "Web Application" project type: a Features -> Sub-features spec/checklist
-- for planning a custom web app build. A Feature is a functional area (e.g.
-- a "Customer" tab); its sub-features are the individual capabilities that
-- area needs (e.g. "Add customer", "Edit customer", "Export list").

create table if not exists freelance_hq_web_app_features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references freelance_hq_projects (id) on delete cascade,
  name text not null,
  description text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_web_app_features_project_id_idx
  on freelance_hq_web_app_features (project_id);

alter table freelance_hq_web_app_features enable row level security;

create table if not exists freelance_hq_web_app_subfeatures (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references freelance_hq_web_app_features (id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_web_app_subfeatures_feature_id_idx
  on freelance_hq_web_app_subfeatures (feature_id);

alter table freelance_hq_web_app_subfeatures enable row level security;
