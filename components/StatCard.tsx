import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "accent" | "sky" | "amber" | "rose";
}) {
  const toneStyles: Record<string, string> = {
    accent: "bg-accent-500/15 text-accent-400",
    sky: "bg-sky-500/15 text-sky-400",
    amber: "bg-amber-500/15 text-amber-400",
    rose: "bg-rose-500/15 text-rose-400",
  };

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneStyles[tone])}>
          <Icon size={18} />
        </span>
        <div>
          <p className="text-xl font-semibold text-neutral-50 tabular-nums">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
