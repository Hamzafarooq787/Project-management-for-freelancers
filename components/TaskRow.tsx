"use client";

import { useState, useTransition } from "react";
import { Check, Circle, Star, Trash2, Timer, ListChecks } from "lucide-react";
import type { Stage, Task } from "@/lib/types";
import { PriorityBadge } from "./Badges";
import { cn, formatRelativeDate } from "@/lib/utils";
import { deleteTaskAction, toggleTodayAction, updateTaskStatusAction } from "@/lib/actions";
import { TaskDetailModal } from "./TaskDetailModal";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TaskRow({
  task,
  stageName,
  stages = [],
  showProject,
  projectName,
}: {
  task: Task;
  stageName?: string | null;
  stages?: Stage[];
  showProject?: boolean;
  projectName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [detailOpen, setDetailOpen] = useState(false);
  const isScheduledToday = task.scheduledFor === todayKey();
  const checklistDone = task.checklist.filter((c) => c.done).length;

  function cycleStatus() {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    startTransition(() => updateTaskStatusAction(task.id, task.projectId, next));
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-base-700/50 bg-base-850/60 px-3 py-2.5 transition-opacity",
        isPending && "opacity-50",
      )}
    >
      <button
        onClick={cycleStatus}
        title="Click to change status"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.status === "done"
            ? "border-accent-500 bg-accent-500 text-base-950"
            : task.status === "in_progress"
              ? "border-sky-400 text-sky-400"
              : "border-neutral-600 text-transparent hover:border-accent-400",
        )}
      >
        {task.status === "done" ? (
          <Check size={12} strokeWidth={3} />
        ) : task.status === "in_progress" ? (
          <Timer size={11} />
        ) : (
          <Circle size={6} />
        )}
      </button>

      <button
        onClick={() => setDetailOpen(true)}
        title="View task details"
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <p
          className={cn(
            "text-sm text-neutral-100 hover:text-accent-300",
            task.status === "done" && "text-neutral-500 line-through hover:text-neutral-400",
          )}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {stageName && (
            <span className="rounded-full border border-base-600 px-2 py-0.5 text-[11px] text-neutral-400">
              {stageName}
            </span>
          )}
          {showProject && projectName && (
            <span className="rounded-full bg-base-700/60 px-2 py-0.5 text-[11px] text-neutral-300">
              {projectName}
            </span>
          )}
          {task.checklist.length > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-base-600 px-2 py-0.5 text-[11px] text-neutral-400">
              <ListChecks size={11} />
              {checklistDone}/{task.checklist.length}
            </span>
          )}
          <span className="text-[11px] text-neutral-500">{formatRelativeDate(task.updatedAt)}</span>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          title={isScheduledToday ? "Remove from Today" : "Schedule for today"}
          onClick={() => startTransition(() => toggleTodayAction(task.id, task.projectId))}
          className={cn(
            "rounded-md p-1.5 hover:bg-base-700/60",
            isScheduledToday ? "text-amber-400" : "text-neutral-500",
          )}
        >
          <Star size={14} fill={isScheduledToday ? "currentColor" : "none"} />
        </button>
        <button
          title="Delete task"
          onClick={() => startTransition(() => deleteTaskAction(task.id, task.projectId))}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {detailOpen && (
        <TaskDetailModal
          task={task}
          stages={stages}
          projectName={projectName}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}
