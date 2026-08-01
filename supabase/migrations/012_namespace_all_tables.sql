-- Incremental migration. Safe to run once in the SQL Editor.
--
-- This Supabase project is shared with another app. 009 already showed that a
-- generically-named table ("clients") can silently collide with a
-- same-named table belonging to that other app. Rather than wait for the next
-- collision, every table this app owns is renamed with a `freelance_hq_`
-- prefix so none of them can ever be mistaken for (or clobbered by) a table
-- from anything else running in this same database.
--
-- `rename to` only renames the table — all rows, columns, foreign keys,
-- indexes and RLS settings carry over unchanged, so this is non-destructive.
-- freelance_hq_clients was already namespaced in 010 and is left alone here.

alter table if exists projects rename to freelance_hq_projects;
alter table if exists stages rename to freelance_hq_stages;
alter table if exists tasks rename to freelance_hq_tasks;
alter table if exists business_profile rename to freelance_hq_business_profile;
alter table if exists profiles rename to freelance_hq_profiles;
alter table if exists project_assignments rename to freelance_hq_project_assignments;
alter table if exists payment_plans rename to freelance_hq_payment_plans;
alter table if exists payments rename to freelance_hq_payments;
