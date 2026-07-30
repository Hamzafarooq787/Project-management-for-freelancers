import { cn, PRIORITY_LABEL } from "@/lib/utils";
import type { TaskPriority } from "@/lib/types";

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
