-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Notes get a folder layer: Project -> Folders -> Notes (one level of
-- folders, no nesting). A folder with project_id = null belongs to the
-- "General" bucket (notes not tied to any project). Anyone who can access
-- a project can create/rename/delete its folders and see notes filed in
-- them — folder visibility is project-level, separate from the existing
-- per-note author/admin/assignee edit rules in freelance_hq_notes.

create table if not exists freelance_hq_note_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled folder',
  project_id uuid references freelance_hq_projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freelance_hq_note_folders_project_id_idx on freelance_hq_note_folders (project_id);

alter table freelance_hq_note_folders enable row level security;

alter table freelance_hq_notes
  add column if not exists folder_id uuid references freelance_hq_note_folders (id) on delete set null;

create index if not exists freelance_hq_notes_folder_id_idx on freelance_hq_notes (folder_id);
