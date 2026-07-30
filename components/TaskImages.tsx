"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Download, X } from "lucide-react";
import { addTaskImageAction, removeTaskImageAction } from "@/lib/actions";

export function TaskImages({
  taskId,
  projectId,
  images,
}: {
  taskId: string;
  projectId: string;
  images: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("projectId", projectId);
    formData.set("imageFile", file);

    setUploading(true);
    startTransition(async () => {
      await addTaskImageAction(formData);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">Images</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300">
          <ImagePlus size={13} />
          {uploading ? "Uploading…" : "Add image"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group/img relative overflow-hidden rounded-md border border-base-600 bg-base-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Task attachment" className="h-20 w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover/img:opacity-100">
                <a
                  href={url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  title="Download"
                  className="rounded-md bg-base-900/80 p-1.5 text-neutral-200 hover:text-accent-300"
                >
                  <Download size={14} />
                </a>
                <button
                  type="button"
                  title="Remove"
                  disabled={isPending}
                  onClick={() => startTransition(() => removeTaskImageAction(taskId, projectId, url))}
                  className="rounded-md bg-base-900/80 p-1.5 text-neutral-200 hover:text-rose-400 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
