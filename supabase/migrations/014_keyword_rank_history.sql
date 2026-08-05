-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Logs every recorded rank for a keyword over time, so month-to-month
-- position changes can actually be compared instead of only ever seeing the
-- latest value. A row is appended automatically whenever a keyword's
-- current_rank changes (see lib/store.ts updateKeyword).

create table if not exists freelance_hq_keyword_rank_history (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references freelance_hq_keywords (id) on delete cascade,
  rank integer,
  recorded_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists freelance_hq_keyword_rank_history_keyword_id_idx
  on freelance_hq_keyword_rank_history (keyword_id, recorded_on desc);

alter table freelance_hq_keyword_rank_history enable row level security;
