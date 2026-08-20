"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { getTaskNoteAction, saveTaskNoteAction } from "@/lib/actions";
import { RichTextEditor } from "./RichTextEditor";

/** Rich-text notes for one task — loaded lazily when this tab is opened. */
export function TaskNotesEditor({ taskId, projectId }: { taskId: string; projectId: string }) {
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const contentRef = useRef<JSONContent>({});

  useEffect(() => {
    let cancelled = false;
    getTaskNoteAction(taskId, projectId).then((c) => {
      if (!cancelled) {
        setContent(c);
        contentRef.current = c as JSONContent;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [taskId, projectId]);

  function save() {
    startTransition(async () => {
      await saveTaskNoteAction(taskId, projectId, JSON.stringify(contentRef.current));
      setSavedAt(new Date().toISOString());
    });
  }

  if (content === null) {
    return <p className="py-6 text-center text-xs text-neutral-500">Loading notes…</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <RichTextEditor
        content={content}
        onChange={(json) => {
          contentRef.current = json;
        }}
        placeholder="Write article drafts, tables, or anything for this task…"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-3.5 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save notes"}
        </button>
        {savedAt && !isPending && <span className="text-[11px] text-neutral-500">Saved</span>}
      </div>
    </div>
  );
}
