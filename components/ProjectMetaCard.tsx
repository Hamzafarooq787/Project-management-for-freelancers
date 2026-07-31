"use client";

import { useRef, useState } from "react";
import { Pencil, X, CalendarRange, Link2 } from "lucide-react";
import { updateProjectMetaAction } from "@/lib/actions";
import { formatTimeframe } from "@/lib/projectTheme";

export function ProjectMetaCard({
  projectId,
  description,
  startDate,
  endDate,
  websiteUrl,
  showWebsiteUrl = true,
}: {
  projectId: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  websiteUrl: string;
  showWebsiteUrl?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!editing) {
    return (
      <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Project Details</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-base-700/60 hover:text-accent-300"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>
        {description && <p className="mb-3 break-words text-sm text-neutral-300">{description}</p>}
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-neutral-400">
          <span className="flex shrink-0 items-center gap-1.5">
            <CalendarRange size={13} />
            {formatTimeframe(startDate, endDate)}
          </span>
          {showWebsiteUrl && websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1.5 text-accent-300 hover:underline"
            >
              <Link2 size={13} className="shrink-0" />
              <span className="truncate">{websiteUrl}</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await updateProjectMetaAction(formData);
        setEditing(false);
      }}
      className="flex flex-col gap-3 rounded-xl2 border border-accent-500/30 bg-base-850 p-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Project Details</h2>
        <button type="button" onClick={() => setEditing(false)} className="text-neutral-500 hover:text-neutral-300">
          <X size={15} />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Description</label>
        <textarea
          name="description"
          defaultValue={description}
          rows={2}
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Start date</label>
          <input
            type="date"
            name="startDate"
            defaultValue={startDate ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Due date</label>
          <input
            type="date"
            name="endDate"
            defaultValue={endDate ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      {showWebsiteUrl && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Website URL</label>
          <input
            name="websiteUrl"
            defaultValue={websiteUrl}
            placeholder="https://example.com"
            className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
      )}

      <button type="submit" className="mt-1 rounded-md bg-accent-500 py-2 text-sm font-medium text-base-950 hover:bg-accent-400">
        Save
      </button>
    </form>
  );
}
