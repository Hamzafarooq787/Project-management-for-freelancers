"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FileText, Pin, Plus } from "lucide-react";
import type { Note, Profile, Project } from "@/lib/types";
import { createNoteAction } from "@/lib/actions";
import { formatRelativeDate } from "@/lib/utils";
import { PROJECT_THEME } from "@/lib/projectTheme";

export function NotesPanel({
  notes,
  projects,
  members,
  currentUserId,
  isAdmin,
}: {
  notes: Note[];
  projects: Project[];
  members: Profile[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function createNote() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", "Untitled");
      formData.set("contentJson", "{}");
      const result = await createNoteAction(formData);
      if (result.ok) router.push(`/notes/${result.id}`);
    });
  }

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        disabled={isPending}
        onClick={createNote}
        className="flex w-fit items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
      >
        <Plus size={16} />
        {isPending ? "Creating…" : "New note"}
      </button>

      {notes.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-base-700/60 bg-base-850 p-8 text-center text-sm text-neutral-500">
          No notes yet. Create one to start writing.
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <NoteGroup title="Pinned" notes={pinned} projectById={projectById} currentUserId={currentUserId} isAdmin={isAdmin} />
          )}
          <NoteGroup title={pinned.length > 0 ? "All notes" : "Notes"} notes={rest} projectById={projectById} currentUserId={currentUserId} isAdmin={isAdmin} />
        </>
      )}
    </div>
  );
}

function NoteGroup({
  title,
  notes,
  projectById,
  currentUserId,
  isAdmin,
}: {
  title: string;
  notes: Note[];
  projectById: Map<string, Project>;
  currentUserId: string;
  isAdmin: boolean;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => {
          const project = note.projectId ? projectById.get(note.projectId) : null;
          const theme = project ? PROJECT_THEME[project.type] : null;
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
              {project && theme && (
                <span className={`w-fit truncate rounded-full px-2 py-0.5 text-[10px] ${theme.iconBg} ${theme.iconText}`}>
                  {project.name}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
