import Link from "next/link";
import { CalendarRange } from "lucide-react";
import type { Project } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { PROJECT_THEME, formatTimeframe } from "@/lib/projectTheme";
import { cn } from "@/lib/utils";

export function ProjectCardClient({
  project,
  progress,
}: {
  project: Project;
  progress: { done: number; total: number; openCount: number };
}) {
  const theme = PROJECT_THEME[project.type];
  const Icon = theme.icon;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "block rounded-xl2 border p-4 shadow-card transition-colors",
        theme.cardBg,
        theme.cardBorder,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", theme.iconBg, theme.iconText)}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-neutral-100">{project.name}</h3>
          <p className="truncate text-xs text-neutral-500">{project.client}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-400">
        <CalendarRange size={12} />
        {formatTimeframe(project.startDate, project.endDate)}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", theme.iconBg, theme.iconText)}>
          {theme.label}
        </span>
        <span className="text-[11px] text-neutral-500">{progress.openCount} open</span>
      </div>

      <ProgressBar done={progress.done} total={progress.total} color={theme.accent} className="mt-4" />
    </Link>
  );
}
