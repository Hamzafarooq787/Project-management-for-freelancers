"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Stage } from "@/lib/types";
import { createTaskAction } from "@/lib/actions";

export function NewTaskForm({ projectId, stages }: { projectId: string; stages: Stage[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-base-600 py-2 text-sm text-neutral-400 hover:border-accent-500/50 hover:text-accent-300"
      >
        <Plus size={15} />
        Add task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createTaskAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-850 p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">New task</span>
        <button type="button" onClick={() => setOpen(false)} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      <input
        name="title"
        autoFocus
        required
        placeholder="What needs to be done?"
        className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex flex-wrap gap-2">
        <select
          name="stageId"
          className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        >
          <option value="">No stage</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue="medium"
          className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <label className="flex items-center gap-1.5 rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300">
          <input type="checkbox" name="scheduledFor" value="today" className="accent-accent-500" />
          Today
        </label>
      </div>
      <button
        type="submit"
        className="mt-1 rounded-md bg-accent-500 py-1.5 text-sm font-medium text-base-950 hover:bg-accent-400"
      >
        Add task
      </button>
    </form>
  );
}
