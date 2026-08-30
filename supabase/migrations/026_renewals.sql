-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Hosting/Domain Renewal tracker: a standalone log of paid renewal work
-- (domain renewal, hosting renewal, email service, malware removal, etc.)
-- separate from the Domains resale inventory (migration 020). Each record
-- captures what you charged the client and what the service actually cost
-- you, so a single page can show total earned vs. total paid.
--
-- Reuses freelance_hq_domain_clients (020) for the optional client link —
-- a renewal can point at an existing domain client or just carry a
-- free-text client_name snapshot.

create table if not exists freelance_hq_renewals (
  id uuid primary key default gen_random_uuid(),
  domain_client_id uuid references freelance_hq_domain_clients (id) on delete set null,
  client_name text not null default '',
  item_name text not null default '',
  service_types text[] not null default '{}',
  amount_charged numeric,
  amount_paid numeric,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_renewals_due_date_idx on freelance_hq_renewals (due_date);
create index if not exists freelance_hq_renewals_domain_client_id_idx on freelance_hq_renewals (domain_client_id);

alter table freelance_hq_renewals enable row level security;
