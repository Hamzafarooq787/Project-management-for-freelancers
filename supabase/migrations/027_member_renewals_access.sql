-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Renewals (026) was admin-only. This adds a per-member permission flag so
-- an admin can grant specific members access to the Renewals tab (view and
-- manage renewal records) without making them a full admin.

alter table freelance_hq_profiles
  add column if not exists can_access_renewals boolean not null default false;
