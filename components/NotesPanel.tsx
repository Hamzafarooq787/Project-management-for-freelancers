"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, FileText, Folder, FolderPlus, Layers, Pencil, Pin, Plus, Trash2, type LucideIcon } from "lucide-react";
import type { Note, NoteFolder, Project } from "@/lib/types";
import { createNoteAction, createNoteFolderAction, deleteNoteFolderAction, renameNoteFolderAction } from "@/lib/actions";
import { formatRelativeDate } from "@/lib/utils";
import { PROJECT_THEME } from "@/lib/projectTheme";

type View = { projectId: string | null; folderId: string | null } | null;

/**
 * Notes are organized like a small file explorer: Projects (plus a
 * project-independent "General" bucket) at the top, each holding one level
 * of folders and/or notes placed directly in the project, and folders
 * holding their own notes.
 */
function viewFromParams(projectParam: string | null, folderParam: string | null): View {
  if (!projectParam) return null;
  return { projectId: projectParam === "general" ? null : projectParam, folderId: folderParam || null };
}

function urlForView(view: View): string {
  if (view === null) return "/notes";
  const params = new URLSearchParams();
  params.set("project", view.projectId ?? "general");
  if (view.folderId) params.set("folder", view.folderId);
  return `/notes?${params.toString()}`;
}

export function NotesPanel({
  notes,
  folders,
  projects,
  currentUserId,
  isAdmin,
  initialProjectId = null,
  initialFolderId = null,
}: {
  notes: Note[];
  folders: NoteFolder[];
  projects: Project[];
  currentUserId: string;
  isAdmin: boolean;
  initialProjectId?: string | null;
  initialFolderId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setViewState] = useState<View>(viewFromParams(initialProjectId, initialFolderId));
  const [error, setError] = useState<string | null>(null);

  function setView(next: View) {
    setViewState(next);
    router.replace(urlForView(next), { scroll: false });
  }

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const folderById = new Map(folders.map((f) => [f.id, f]));

  function createNote(projectId: string | null, folderId: string | null) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", "Untitled");
      formData.set("contentJson", "{}");
      if (projectId) formData.set("projectId", projectId);
      if (folderId) formData.set("folderId", folderId);
      const result = await createNoteAction(formData);
      if (result.ok) router.push(`/notes/${result.id}`);
      else setError(result.error);
    });
  }

  function createFolder(projectId: string | null) {
    const name = window.prompt("Folder name");
    if (!name) return;
    startTransition(async () => {
      const result = await createNoteFolderAction(name, projectId);
      if (!result.ok) setError(result.error);
    });
  }

  function renameFolder(folder: NoteFolder) {
    const name = window.prompt("Rename folder", folder.name);
    if (!name || name === folder.name) return;
    startTransition(() => renameNoteFolderAction(folder.id, name));
  }

  function removeFolder(folder: NoteFolder) {
    if (!confirm(`Delete "${folder.name}"? Notes inside will move back to the top level, not be deleted.`)) return;
    startTransition(() => deleteNoteFolderAction(folder.id));
  }

  // Root: Projects + General
  if (view === null) {
    return (
      <div className="flex flex-col gap-4">
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RootEntry
            label="General"
            sublabel="Not tied to a project"
            icon={Layers}
            count={notes.filter((n) => n.projectId === null).length + folders.filter((f) => f.projectId === null).length}
            onClick={() => setView({ projectId: null, folderId: null })}
          />
          {projects.map((project) => {
            const theme = PROJECT_THEME[project.type];
            const count =
              notes.filter((n) => n.projectId === project.id).length + folders.filter((f) => f.projectId === project.id).length;
            return (
              <RootEntry
                key={project.id}
                label={project.name}
                sublabel={theme.label}
                icon={theme.icon}
                iconClass={theme.iconText}
                count={count}
                onClick={() => setView({ projectId: project.id, folderId: null })}
              />
            );
          })}
        </div>
        {projects.length === 0 && (
          <p className="text-xs text-neutral-500">No projects yet — you can still use General for notes.</p>
        )}
      </div>
    );
  }

  const { projectId, folderId } = view;
  const project = projectId ? projectById.get(projectId) : null;
  const folder = folderId ? folderById.get(folderId) : null;

  // Inside a folder
  if (folder) {
    const folderNotes = notes.filter((n) => n.folderId === folder.id);
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: "Notes", onClick: () => setView(null) },
            { label: project ? project.name : "General", onClick: () => setView({ projectId, folderId: null }) },
            { label: folder.name },
          ]}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-100">
            <Folder size={15} className="text-accent-400" />
            {folder.name}
          </h2>
          <button type="button" onClick={() => renameFolder(folder)} className="text-neutral-500 hover:text-neutral-300" title="Rename folder">
            <Pencil size={13} />
          </button>
          <button type="button" onClick={() => removeFolder(folder)} className="text-neutral-500 hover:text-rose-400" title="Delete folder">
            <Trash2 size={13} />
          </button>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => createNote(projectId, folder.id)}
          className="flex w-fit items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          <Plus size={16} />
          New note
        </button>
        <NoteGrid notes={folderNotes} currentUserId={currentUserId} isAdmin={isAdmin} emptyLabel="No notes in this folder yet." />
      </div>
    );
  }

  // Inside a project or General: folders + direct notes
  const levelFolders = folders.filter((f) => f.projectId === projectId);
  const directNotes = notes.filter((n) => n.projectId === projectId && n.folderId === null);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Notes", onClick: () => setView(null) }, { label: project ? project.name : "General" }]} />
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => createNote(projectId, null)}
          className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          <Plus size={16} />
          New note
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => createFolder(projectId)}
          className="flex items-center gap-2 rounded-lg border border-base-600 px-4 py-2 text-sm text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-60"
        >
          <FolderPlus size={16} />
          New folder
        </button>
      </div>

      {levelFolders.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Folders</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {levelFolders.map((f) => {
              const count = notes.filter((n) => n.folderId === f.id).length;
              return (
                <div
                  key={f.id}
                  className="group flex items-center justify-between gap-2 rounded-xl2 border border-base-700/60 bg-base-850 p-3.5 hover:border-accent-500/50"
                >
                  <button
                    type="button"
                    onClick={() => setView({ projectId, folderId: f.id })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <Folder size={16} className="shrink-0 text-accent-400" />
                    <span className="truncate text-sm text-neutral-100">{f.name}</span>
                    <span className="shrink-0 text-[11px] text-neutral-500">{count}</span>
                  </button>
                  <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                    <button type="button" onClick={() => renameFolder(f)} className="text-neutral-500 hover:text-neutral-300" title="Rename">
                      <Pencil size={13} />
                    </button>
                    <button type="button" onClick={() => removeFolder(f)} className="text-neutral-500 hover:text-rose-400" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Notes</h2>
        <NoteGrid notes={directNotes} currentUserId={currentUserId} isAdmin={isAdmin} emptyLabel="No notes here yet." />
      </div>
    </div>
  );
}

function RootEntry({
  label,
  sublabel,
  icon: Icon,
  iconClass,
  count,
  onClick,
}: {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  iconClass?: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-xl2 border border-base-700/60 bg-base-850 p-4 text-left hover:border-accent-500/50"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon size={18} className={iconClass ?? "text-neutral-400"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-100">{label}</p>
          <p className="truncate text-[11px] text-neutral-500">{sublabel}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-neutral-500">
        <span className="text-xs">{count}</span>
        <ChevronRight size={14} />
      </div>
    </button>
  );
}

function Breadcrumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-neutral-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick} className="hover:text-accent-300">
              {item.label}
            </button>
          ) : (
            <span className="text-neutral-300">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function NoteGrid({
  notes,
  currentUserId,
  isAdmin,
  emptyLabel,
}: {
  notes: Note[];
  currentUserId: string;
  isAdmin: boolean;
  emptyLabel: string;
}) {
  if (notes.length === 0) {
    return <p className="rounded-xl2 border border-dashed border-base-700/60 bg-base-850 p-6 text-center text-xs text-neutral-500">{emptyLabel}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        const isAssignedToMe = note.assignedToUserId === currentUserId && note.authorId !== currentUserId;
        return (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            className="flex flex-col gap-2 rounded-xl2 border border-base-700/60 bg-base-850 p-4 hover:border-accent-500/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-neutral-100">
                <FileText size={14} className="shrink-0 text-neutral-500" />
                <p className="truncate text-sm font-medium">{note.title || "Untitled"}</p>
              </div>
              {note.pinned && <Pin size={13} className="shrink-0 text-accent-400" />}
            </div>
            <p className="text-[11px] text-neutral-500">
              {isAdmin && note.authorId !== currentUserId ? `By ${note.authorName} · ` : ""}
              {isAssignedToMe ? "Assigned to you · " : ""}
              Updated {formatRelativeDate(note.updatedAt)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
