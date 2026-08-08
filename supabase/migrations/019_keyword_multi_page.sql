-- Incremental migration. Safe to run once in the SQL Editor.
--
-- A keyword can now belong to multiple Pages at once (e.g. the same
-- keyword targets both a service page and a location page), not just one.
-- Replaces the single `page_id` column on keywords with a join table.
-- Existing single-page assignments are copied over automatically; the old
-- `page_id` column is left in place (now unused) rather than dropped, so
-- this migration can never lose data.

create table if not exists freelance_hq_keyword_page_links (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references freelance_hq_keywords (id) on delete cascade,
  page_id uuid not null references freelance_hq_keyword_pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (keyword_id, page_id)
);

create index if not exists freelance_hq_keyword_page_links_keyword_id_idx
  on freelance_hq_keyword_page_links (keyword_id);

create index if not exists freelance_hq_keyword_page_links_page_id_idx
  on freelance_hq_keyword_page_links (page_id);

alter table freelance_hq_keyword_page_links enable row level security;

insert into freelance_hq_keyword_page_links (keyword_id, page_id)
select id, page_id from freelance_hq_keywords
where page_id is not null
on conflict (keyword_id, page_id) do nothing;
