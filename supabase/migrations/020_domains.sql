-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Domain reselling: a standalone inventory of domains you hold to sell,
-- separate from the SEO/web-dev/other project system. Domains can
-- optionally be assigned to a domain client (a lightweight contact list
-- distinct from the main Clients feature). Each domain can carry DNS
-- records managed from this app, and optionally be synced against a
-- Dynadot reseller account (see lib/dynadot.ts) for its live expiry,
-- nameservers, and lock status. The Dynadot API key is stored encrypted
-- (AES-256-GCM, server-side only — see lib/dynadotCrypto.ts), the same
-- pattern used for backlink passwords.

create table if not exists freelance_hq_domain_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table freelance_hq_domain_clients enable row level security;

create table if not exists freelance_hq_domains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain_client_id uuid references freelance_hq_domain_clients (id) on delete set null,
  registrar text not null default 'Dynadot',
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  purchase_price numeric,
  selling_price numeric,
  expiry_date date,
  auto_renew boolean not null default false,
  locked boolean not null default false,
  nameservers text[] not null default '{}',
  notes text not null default '',
  dynadot_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_domains_domain_client_id_idx
  on freelance_hq_domains (domain_client_id);

alter table freelance_hq_domains enable row level security;

create table if not exists freelance_hq_domain_dns_records (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references freelance_hq_domains (id) on delete cascade,
  record_type text not null check (record_type in ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV')),
  host text not null default '@',
  value text not null,
  priority integer,
  ttl integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_domain_dns_records_domain_id_idx
  on freelance_hq_domain_dns_records (domain_id);

alter table freelance_hq_domain_dns_records enable row level security;

-- Singleton row, same pattern as freelance_hq_business_profile.
create table if not exists freelance_hq_domain_settings (
  id boolean primary key default true,
  dynadot_api_key_encrypted text,
  updated_at timestamptz not null default now(),
  constraint freelance_hq_domain_settings_singleton check (id)
);

alter table freelance_hq_domain_settings enable row level security;
