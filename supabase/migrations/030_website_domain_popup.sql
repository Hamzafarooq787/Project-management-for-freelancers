-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Reworks Website Management (029) from its own tab into a popup on each
-- Domains-tab row: one Website config per Domain, edited/attached from
-- there instead of a separate list. Adds:
--   - is_offline: a kill-switch flag surfaced in the public config so the
--     live site can show a "temporarily offline" state when it checks it.
--   - last_fetched_at: stamped by the public /api/site-config endpoint on
--     every successful lookup, so the Domains tab can show a live
--     "Connected" signal once the real site starts fetching its config.
-- Also makes domain_id one-to-one (a domain has at most one Website row)
-- and cascades deletion — a Website config has no meaning once its domain
-- is removed from the inventory.

alter table freelance_hq_websites
  add column if not exists is_offline boolean not null default false,
  add column if not exists last_fetched_at timestamptz;

drop index if exists freelance_hq_websites_domain_id_idx;
create unique index if not exists freelance_hq_websites_domain_id_key
  on freelance_hq_websites (domain_id)
  where domain_id is not null;

alter table freelance_hq_websites drop constraint if exists freelance_hq_websites_domain_id_fkey;
alter table freelance_hq_websites
  add constraint freelance_hq_websites_domain_id_fkey
  foreign key (domain_id) references freelance_hq_domains (id) on delete cascade;
