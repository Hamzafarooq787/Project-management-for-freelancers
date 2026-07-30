"use client";

import { useRef, useState } from "react";
import { Plus, X, ListChecks, Paperclip } from "lucide-react";
import { createTaskAction } from "@/lib/actions";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function NewTaskForm({ projectId, stageId }: { projectId: string; stageId: string | null }) {
  const [open, setOpen] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [backdate, setBackdate] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    formRef.current?.reset();
    setChecklist([]);
    setBackdate(false);
  }

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
        formData.set("checklistJson", JSON.stringify(checklist.filter((t) => t.trim()).map((text) => ({ text }))));
        await createTaskAction(formData);
        reset();
        setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-850 p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="stageId" value={stageId ?? ""} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">New task</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-neutral-500 hover:text-neutral-300"
        >
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

      <div className="flex flex-wrap items-center gap-2">
        <select
          name="priority"
          defaultValue="medium"
          className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-neutral-400">
          Schedule for
          <input
            type="date"
            name="scheduledFor"
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
            <ListChecks size={13} />
            Checklist
          </span>
          <button
            type="button"
            onClick={() => setChecklist((items) => [...items, ""])}
            className="text-xs text-accent-400 hover:text-accent-300"
          >
            + Add item
          </button>
        </div>
        {checklist.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={item}
              onChange={(e) =>
                setChecklist((items) => items.map((it, idx) => (idx === i ? e.target.value : it)))
              }
              placeholder={`Checklist item ${i + 1}`}
              className="w-full rounded-md border border-base-600 bg-base-900 px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setChecklist((items) => items.filter((_, idx) => idx !== i))}
              className="shrink-0 text-neutral-500 hover:text-rose-400"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {checklist.filter((t) => t.trim()).length > 0 ? (
        <p className="text-[11px] text-neutral-500">
          Tasks with a checklist start as To Do — check items off to complete them.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-1.5 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={backdate}
              onChange={(e) => setBackdate(e.target.checked)}
              className="accent-accent-500"
            />
            Already completed (log past work)
          </label>
          {backdate && (
            <input
              type="date"
              name="markDoneOn"
              defaultValue={todayKey()}
              max={todayKey()}
              className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
            />
          )}
        </>
      )}

      <label className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-neutral-400 hover:text-accent-300">
        <Paperclip size={13} />
        Attach files
        <input type="file" name="attachmentFile" multiple className="hidden" />
      </label>

      <button
        type="submit"
        className="mt-1 rounded-md bg-accent-500 py-1.5 text-sm font-medium text-base-950 hover:bg-accent-400"
      >
        Add task
      </button>
    </form>
  );
}
