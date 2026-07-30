import { cn } from "@/lib/utils";

export function ProgressBar({
  done,
  total,
  color = "#33d485",
  className,
}: {
  done: number;
  total: number;
  color?: string;
  className?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-700/70">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums text-neutral-400 w-9 text-right">{pct}%</span>
    </div>
  );
}
