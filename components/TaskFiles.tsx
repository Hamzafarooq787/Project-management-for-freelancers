"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip, Download, X, FileText } from "lucide-react";
import type { TaskFile } from "@/lib/types";
import { addTaskFileAction, removeTaskFileAction } from "@/lib/actions";
import { formatFileSize } from "@/lib/utils";

export function TaskFiles({
  taskId,
  projectId,
  files,
}: {
  taskId: string;
  projectId: string;
  files: TaskFile[];
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    startTransition(async () => {
      for (const file of selected) {
        const formData = new FormData();
        formData.set("taskId", taskId);
        formData.set("projectId", projectId);
        formData.set("file", file);
        await addTaskFileAction(formData);
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">Files</span>
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

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file) => (
            <div
              key={file.url}
              className="flex items-center gap-2 rounded-md border border-base-600 bg-base-900 px-2.5 py-1.5"
            >
              <FileText size={14} className="shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-200">{file.name}</span>
              {file.size > 0 && (
                <span className="shrink-0 text-[11px] text-neutral-500">{formatFileSize(file.size)}</span>
              )}
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noreferrer"
                title="Download"
                className="shrink-0 rounded-md p-1 text-neutral-400 hover:text-accent-300"
              >
                <Download size={14} />
              </a>
              <button
                type="button"
                title="Remove"
                disabled={isPending && removingUrl === file.url}
                onClick={() => {
                  setRemovingUrl(file.url);
                  startTransition(() => removeTaskFileAction(taskId, projectId, file.url));
                }}
                className="shrink-0 rounded-md p-1 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
