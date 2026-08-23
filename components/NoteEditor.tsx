"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, Lock, Pin, Trash2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import type { Note, NoteFolder, Profile, Project } from "@/lib/types";
import { deleteNoteAction, toggleNotePinAction, updateNoteAction } from "@/lib/actions";
import { RichTextEditor } from "./RichTextEditor";
import { formatRelativeDate } from "@/lib/utils";

export function NoteEditor({
  note,
  projects,
  folders,
  members,
  isAdmin,
  canEdit,
  currentUserId,
}: {
  note: Note;
  projects: Project[];
  folders: NoteFolder[];
  members: Profile[];
  isAdmin: boolean;
  canEdit: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(note.title);
  const [projectId, setProjectId] = useState(note.projectId ?? "");
  const [folderId, setFolderId] = useState(note.folderId ?? "");
  const [assignedToUserId, setAssignedToUserId] = useState(note.assignedToUserId ?? "");
  const [editableByAssignee, setEditableByAssignee] = useState(note.editableByAssignee);
  const [pinned, setPinned] = useState(note.pinned);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const contentRef = useRef<JSONContent>(note.content as JSONContent);

  const canDelete = isAdmin || note.authorId === currentUserId;
  const isRestrictedView = !canEdit;

  // Land back exactly where this note was opened from — its own project/folder
  // view — instead of always resetting to the top-level Notes list.
  const backHref = (() => {
    if (!note.projectId && !note.folderId) return "/notes";
    const params = new URLSearchParams();
    params.set("project", note.projectId ?? "general");
    if (note.folderId) params.set("folder", note.folderId);
    return `/notes?${params.toString()}`;
  })();

  function save() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title || "Untitled");
      formData.set("contentJson", JSON.stringify(contentRef.current));
      formData.set("projectId", projectId);
      formData.set("folderId", folderId);
      if (isAdmin) {
        formData.set("assignedToUserId", assignedToUserId);
        formData.set("editableByAssignee", editableByAssignee ? "on" : "off");
      }
      formData.set("pinned", pinned ? "on" : "off");
      const result = await updateNoteAction(note.id, formData);
      if (result.ok) setSavedAt(new Date().toISOString());
      else setError(result.error);
    });
  }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    startTransition(() => toggleNotePinAction(note.id, next));
  }

  function remove() {
    if (!confirm("Delete this note? This can't be undone.")) return;
    startTransition(async () => {
      await deleteNoteAction(note.id);
      router.push(backHref);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href={backHref} className="flex w-fit items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300">
        <ArrowLeft size={13} />
        Back
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {canEdit ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full bg-transparent text-2xl font-semibold text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl font-semibold text-neutral-50">{note.title || "Untitled"}</h1>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            By {note.authorName} · Updated {formatRelativeDate(note.updatedAt)}
            {isRestrictedView && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-400">
                <Lock size={11} />
                View only
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePin}
            disabled={!canEdit && !(isAdmin || note.authorId === currentUserId)}
            title={pinned ? "Unpin from dashboard" : "Pin to dashboard"}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
              pinned ? "border-accent-500/50 bg-accent-500/10 text-accent-300" : "border-base-600 text-neutral-300 hover:border-accent-500/50"
            }`}
          >
            <Pin size={13} />
            {pinned ? "Pinned" : "Pin"}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className="rounded-md p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
              title="Delete note"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-base-700/60 bg-base-850 p-3">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span>Project:</span>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setFolderId("");
            }}
            disabled={!canEdit}
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1 text-xs text-neutral-200 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          >
            <option value="">General (no project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span>Folder:</span>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            disabled={!canEdit}
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1 text-xs text-neutral-200 focus:border-accent-500 focus:outline-none disabled:opacity-60"
          >
            <option value="">None (top level)</option>
            {folders
              .filter((f) => (f.projectId ?? "") === projectId)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </select>
        </div>

        {isAdmin && (
          <>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span>Assign to:</span>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="rounded-md border border-base-600 bg-base-900 px-2 py-1 text-xs text-neutral-200 focus:border-accent-500 focus:outline-none"
              >
                <option value="">No one</option>
                {members
                  .filter((m) => m.id !== note.authorId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
              </select>
            </div>
            {assignedToUserId && (
              <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={editableByAssignee}
                  onChange={(e) => setEditableByAssignee(e.target.checked)}
                  className="accent-accent-500"
                />
                They can edit
              </label>
            )}
          </>
        )}
        {note.assignedToUserId && !isAdmin && (
          <p className="text-xs text-neutral-500">Assigned to {note.assignedToName}</p>
        )}
      </div>

      <RichTextEditor
        content={note.content}
        editable={canEdit}
        onChange={(json) => {
          contentRef.current = json;
        }}
        placeholder="Write an article, paste a table, plan out the work…"
      />

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {savedAt && !isPending && <span className="text-xs text-neutral-500">Saved</span>}
        </div>
      )}
    </div>
  );
}
