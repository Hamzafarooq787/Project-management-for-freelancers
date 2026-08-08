"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip, Download, Trash2, FileText } from "lucide-react";
import type { ProjectAttachment } from "@/lib/types";
import { addProjectAttachmentAction, removeProjectAttachmentAction } from "@/lib/actions";
import { formatFileSize, formatDateKey } from "@/lib/utils";

export function ProjectAttachments({
  projectId,
  attachments,
}: {
  projectId: string;
  attachments: ProjectAttachment[];
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    startTransition(async () => {
      for (const file of selected) {
        const formData = new FormData();
        formData.set("projectId", projectId);
        formData.set("file", file);
        await addProjectAttachmentAction(formData);
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Attachments</h2>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300">
          <Paperclip size={13} />
          {uploading ? "Uploading…" : "Attach files"}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
          No attachments yet. Upload briefs, reports, or exports here to keep them with the project.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-base-700/60 bg-base-900 px-3 py-2.5"
            >
              <FileText size={16} className="shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-200">{file.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                  <span>{formatDateKey(file.createdAt)}</span>
                  {file.size > 0 && <span>{formatFileSize(file.size)}</span>}
                </div>
              </div>
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noreferrer"
                title="Download"
                className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:text-accent-300"
              >
                <Download size={15} />
              </a>
              <button
                type="button"
                title="Remove"
                disabled={isPending && removingId === file.id}
                onClick={() => {
                  setRemovingId(file.id);
                  startTransition(() => removeProjectAttachmentAction(file.id, projectId));
                }}
                className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
