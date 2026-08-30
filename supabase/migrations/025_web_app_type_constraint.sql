-- Incremental migration. Safe to run once in the SQL Editor.
--
-- freelance_hq_projects.type still carries the CHECK constraint from the
-- original (pre-namespacing) `projects` table, which only allows
-- 'seo', 'web_dev', 'digital_marketing', 'other'. That constraint predates
-- the new "web_app" project type added in 024, so creating a Web
-- Application project fails with a constraint violation. Drop the old
-- constraint (under either name it may have kept) and add one that
-- includes 'web_app'.

alter table freelance_hq_projects drop constraint if exists projects_type_check;
alter table freelance_hq_projects drop constraint if exists freelance_hq_projects_type_check;

alter table freelance_hq_projects
  add constraint freelance_hq_projects_type_check
  check (type in ('seo', 'web_dev', 'web_app', 'digital_marketing', 'other'));
