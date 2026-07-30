-- Incremental migration for projects that already ran an earlier schema.sql.
-- Safe to run once in the SQL Editor.
--
-- Generalizes task attachments from images-only to any kind of file:
-- 1. Renames the `images` column to `files` (same jsonb array shape, now
--    holding {url, name, type, size} objects instead of plain URL strings —
--    the app normalizes any old plain-string entries on read).
-- 2. Adds a new "task-files" storage bucket for the new uploads. The old
--    "task-images" bucket is left in place so previously uploaded images
--    keep working at their existing URLs.

alter table tasks rename column images to files;

insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', true)
on conflict (id) do nothing;
