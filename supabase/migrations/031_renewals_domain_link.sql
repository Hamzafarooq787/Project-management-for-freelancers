-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Folds the standalone Domains inventory tab into the Renewals tab (renamed
-- "Domains" in the UI). A renewal record can now optionally link to a real
-- domain in the inventory (freelance_hq_domains) so its Website settings
-- popup (Google Tag codes, contact info, offline toggle) can be opened
-- straight from that renewal row. Nulled out automatically if the linked
-- domain is ever removed from the inventory.

alter table freelance_hq_renewals
  add column if not exists domain_id uuid references freelance_hq_domains (id) on delete set null;

create index if not exists freelance_hq_renewals_domain_id_idx on freelance_hq_renewals (domain_id);
