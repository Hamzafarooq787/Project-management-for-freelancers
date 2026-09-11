-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Client Website Management: lets you attach a Next.js site you built to a
-- Domain (freelance_hq_domains, 020) and manage the content that site pulls
-- from this app at runtime — contact info, service-area city names, and
-- Google Tag Manager/GA/Pixel head+body scripts — without redeploying the
-- site. Each row gets a random, unguessable api_key used by the public
-- read-only config endpoint (app/api/site-config) that the website fetches
-- server-side; nothing here is readable without that key.

create table if not exists freelance_hq_websites (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references freelance_hq_domains (id) on delete set null,
  name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  contact_address text not null default '',
  cities text[] not null default '{}',
  head_scripts text not null default '',
  body_scripts text not null default '',
  api_key text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists freelance_hq_websites_api_key_idx on freelance_hq_websites (api_key);
create index if not exists freelance_hq_websites_domain_id_idx on freelance_hq_websites (domain_id);

alter table freelance_hq_websites enable row level security;
