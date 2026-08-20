-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Docs-style notes: a global notes system (sidebar) and one rich-text
-- note per task. Content is stored as Tiptap JSON (jsonb) so it can hold
-- headings, tables, lists, etc. — not just plain text.
--
-- Visibility/edit rules are enforced in the app layer (lib/store.ts /
-- lib/actions.ts), same as every other role-gated feature in this app:
--   - Admins can see, edit, and delete every note.
--   - A member can always see/edit notes they authored.
--   - A note an admin assigns to a member (assigned_to_user_id) is
--     visible to that member too, and editable by them unless the admin
--     sets editable_by_assignee = false (view-only for that member).

create table if not exists freelance_hq_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  content jsonb not null default '{}'::jsonb,
  author_id uuid not null references freelance_hq_profiles (id) on delete cascade,
  assigned_to_user_id uuid references freelance_hq_profiles (id) on delete set null,
  editable_by_assignee boolean not null default true,
  pinned boolean not null default false,
  project_id uuid references freelance_hq_projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_notes_author_id_idx on freelance_hq_notes (author_id);
create index if not exists freelance_hq_notes_assigned_to_user_id_idx on freelance_hq_notes (assigned_to_user_id);
create index if not exists freelance_hq_notes_project_id_idx on freelance_hq_notes (project_id);

alter table freelance_hq_notes enable row level security;

create table if not exists freelance_hq_task_notes (
  task_id uuid primary key references freelance_hq_tasks (id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references freelance_hq_profiles (id) on delete set null
);

alter table freelance_hq_task_notes enable row level security;
