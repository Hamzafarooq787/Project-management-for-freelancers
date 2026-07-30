"use client";

import { useRef, useTransition } from "react";
import { X, Trash2, Clock, CalendarDays } from "lucide-react";
import type { Stage, Task } from "@/lib/types";
import { deleteTaskAction, updateTaskDetailsAction } from "@/lib/actions";
import { formatRelativeDate } from "@/lib/utils";

export function TaskDetailModal({
  task,
  stages,
  projectName,
  onClose,
}: {
  task: Task;
  stages: Stage[];
  projectName?: string;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl2 border border-base-700/60 bg-base-850 p-5 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Task details</p>
            {projectName && <p className="mt-0.5 truncate text-sm text-neutral-400">{projectName}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-md p-1 text-neutral-500 hover:bg-base-700/60 hover:text-neutral-300">
            <X size={18} />
          </button>
        </div>

        <form
          ref={formRef}
          action={(formData) => {
            startTransition(async () => {
              await updateTaskDetailsAction(formData);
              onClose();
            });
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="projectId" value={task.projectId} />

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Title</label>
            <input
              name="title"
              required
              defaultValue={task.title}
              className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Notes</label>
            <textarea
              name="notes"
              defaultValue={task.notes}
              rows={3}
              placeholder="Add any extra detail about this task…"
              className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Status</label>
              <select
                name="status"
                defaultValue={task.status}
                className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Priority</label>
              <select
                name="priority"
                defaultValue={task.priority}
                className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Stage</label>
              <select
                name="stageId"
                defaultValue={task.stageId ?? ""}
                className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
              >
                <option value="">No stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Due date</label>
              <input
                type="date"
                name="dueDate"
                defaultValue={task.dueDate ?? ""}
                className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 rounded-md border border-base-600 bg-base-900 px-3 py-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              name="scheduledFor"
              value="today"
              defaultChecked={task.scheduledFor === "today"}
              className="accent-accent-500"
            />
            Scheduled for today
          </label>

          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-base-900/50 px-3 py-2 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Updated {formatRelativeDate(task.updatedAt)}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              Created {formatRelativeDate(task.createdAt)}
            </span>
            {task.completedAt && (
              <span className="flex items-center gap-1 text-accent-400">Completed {formatRelativeDate(task.completedAt)}</span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteTaskAction(task.id, task.projectId);
                  onClose();
                })
              }
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete task
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
