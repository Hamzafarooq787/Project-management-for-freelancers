-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Lightweight "unseen count" badges for the sidebar/mobile nav (e.g. a red
-- circle with a number on the Projects or Notes tab). One row per
-- (user, section) tracks when that user last opened that section; the
-- badge count is however many relevant items appeared after that.
-- "Relevant" per section:
--   projects -> project assignments created after last_seen_at (or, for an
--               admin, any project created after last_seen_at)
--   notes    -> notes assigned to this user (by an admin) after last_seen_at

create table if not exists freelance_hq_notification_seen (
  user_id uuid not null references freelance_hq_profiles (id) on delete cascade,
  section text not null,
  last_seen_at timestamptz not null default 'epoch',
  primary key (user_id, section)
);

alter table freelance_hq_notification_seen enable row level security;
