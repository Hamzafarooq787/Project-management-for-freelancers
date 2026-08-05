-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Lets a subset of keywords be flagged for monthly position tracking (a
-- separate, curated list picked from the full keyword table) and records one
-- manually-entered rank per keyword per calendar month, so previous months'
-- positions stay visible alongside the newest entry instead of only ever
-- showing the latest rank.

alter table freelance_hq_keywords
  add column if not exists is_tracked boolean not null default false;

create table if not exists freelance_hq_keyword_monthly_positions (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references freelance_hq_keywords (id) on delete cascade,
  month text not null,
  rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (keyword_id, month)
);

create index if not exists freelance_hq_keyword_monthly_positions_keyword_id_idx
  on freelance_hq_keyword_monthly_positions (keyword_id, month);

alter table freelance_hq_keyword_monthly_positions enable row level security;
