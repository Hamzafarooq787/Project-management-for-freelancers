-- Incremental migration for projects that already ran an earlier schema.sql.
-- Safe to run once in the SQL Editor.
--
-- 1. Adds a per-task checklist (stored as jsonb, no separate table needed).
-- 2. Generalizes "scheduled_for" from a text flag that only ever held the
--    literal string 'today' into a real date, so tasks can be scheduled for
--    any day. Existing 'today' values are converted to the current date.

alter table tasks add column if not exists checklist jsonb not null default '[]'::jsonb;

alter table tasks drop constraint if exists tasks_scheduled_for_check;

alter table tasks
  alter column scheduled_for type date
  using (case when scheduled_for = 'today' then current_date else null end);
