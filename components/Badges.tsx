import { cn, PRIORITY_LABEL, PROJECT_TYPE_LABEL } from "@/lib/utils";
import type { ProjectType, TaskPriority, TaskStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    todo: "bg-base-700/60 text-neutral-300 border-base-600",
    in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    done: "bg-accent-500/15 text-accent-300 border-accent-500/30",
  };
  const labels: Record<TaskStatus, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    low: "text-neutral-400 border-base-600",
    medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    high: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles[priority])}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function ProjectTypeBadge({ type }: { type: ProjectType }) {
  return (
    <span className="inline-flex items-center rounded-full border border-base-600 bg-base-800 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
      {PROJECT_TYPE_LABEL[type]}
    </span>
  );
}
