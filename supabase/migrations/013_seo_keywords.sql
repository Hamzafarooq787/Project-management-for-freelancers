-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Adds a keyword rank-tracker for SEO projects: a keyword, the page it
-- targets, its search volume/difficulty, current vs. target rank, a status,
-- and notes — its own table (rather than a project-wide free-text field or
-- checklist items) so keywords are individually addable, editable, and
-- deletable, and can grow into rank history/reporting later.

create table if not exists freelance_hq_keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references freelance_hq_projects (id) on delete cascade,
  keyword text not null,
  target_page text not null default '',
  search_volume integer,
  difficulty integer,
  current_rank integer,
  target_rank integer,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'ranking', 'achieved')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_keywords_project_id_idx on freelance_hq_keywords (project_id);

alter table freelance_hq_keywords enable row level security;
