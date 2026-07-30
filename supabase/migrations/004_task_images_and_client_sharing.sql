-- Incremental migration for projects that already ran an earlier schema.sql.
-- Safe to run once in the SQL Editor.
--
-- 1. Lets tasks carry image attachments (jsonb array of public URLs, same
--    pattern as the existing checklist column).
-- 2. Lets a project be shared with a client via a unique, unguessable link
--    (/share/<token>). A project with a null share_token has sharing off.

alter table tasks add column if not exists images jsonb not null default '[]'::jsonb;

alter table projects add column if not exists share_token text unique;

insert into storage.buckets (id, name, public)
values ('task-images', 'task-images', true)
on conflict (id) do nothing;
