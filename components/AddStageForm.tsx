"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addStageAction } from "@/lib/actions";

export function AddStageForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-accent-300"
      >
        <Plus size={15} />
        Add stage / step
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addStageAction(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input
        name="name"
        autoFocus
        required
        placeholder="Stage name"
        className="rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-accent-500 py-1.5 text-sm font-medium text-base-950 hover:bg-accent-400">
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-base-600 px-3 py-1.5 text-sm text-neutral-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
