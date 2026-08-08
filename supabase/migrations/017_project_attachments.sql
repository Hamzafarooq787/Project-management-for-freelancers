-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Project-level attachments: files that belong to the project as a whole
-- (briefs, reports, exports, screenshots) rather than to a single task.
-- Shows up in its own Attachments tab on the project detail page.

create table if not exists freelance_hq_project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references freelance_hq_projects (id) on delete cascade,
  url text not null,
  name text not null,
  type text not null default 'application/octet-stream',
  size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists freelance_hq_project_attachments_project_id_idx
  on freelance_hq_project_attachments (project_id, created_at desc);

alter table freelance_hq_project_attachments enable row level security;

insert into storage.buckets (id, name, public)
values ('project-attachments', 'project-attachments', true)
on conflict (id) do nothing;
