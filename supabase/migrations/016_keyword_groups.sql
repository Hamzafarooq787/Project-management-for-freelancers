-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Lets keywords be organized into named Groups (e.g. a content silo or
-- topic), each holding one or more Pages (the pieces of content the
-- keywords in it target). A keyword can optionally be assigned to a page;
-- keywords with no assignment stay in an implicit "Ungrouped" bucket in the
-- UI, so this is purely additive on top of the existing flat keyword list.

create table if not exists freelance_hq_keyword_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references freelance_hq_projects (id) on delete cascade,
  name text not null,
  color text not null default 'accent',
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists freelance_hq_keyword_groups_project_id_idx
  on freelance_hq_keyword_groups (project_id, "order");

alter table freelance_hq_keyword_groups enable row level security;

create table if not exists freelance_hq_keyword_pages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references freelance_hq_keyword_groups (id) on delete cascade,
  name text not null,
  url text not null default '',
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists freelance_hq_keyword_pages_group_id_idx
  on freelance_hq_keyword_pages (group_id, "order");

alter table freelance_hq_keyword_pages enable row level security;

alter table freelance_hq_keywords
  add column if not exists page_id uuid references freelance_hq_keyword_pages (id) on delete set null;

create index if not exists freelance_hq_keywords_page_id_idx
  on freelance_hq_keywords (page_id);
