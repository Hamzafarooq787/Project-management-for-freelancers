import Link from "next/link";
import type { Project } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { ProjectTypeBadge } from "./Badges";
import { getProjectProgress, getTasksByProject } from "@/lib/store";

export async function ProjectCard({ project }: { project: Project }) {
  const { done, total } = await getProjectProgress(project.id);
  const tasks = await getTasksByProject(project.id);
  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl2 border border-base-700/60 bg-base-850 p-4 shadow-card transition-colors hover:border-accent-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-neutral-100">{project.name}</h3>
          <p className="truncate text-xs text-neutral-500">{project.client}</p>
        </div>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full mt-1"
          style={{ backgroundColor: project.color }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ProjectTypeBadge type={project.type} />
        <span className="text-[11px] text-neutral-500">{openCount} open</span>
      </div>

      <ProgressBar done={done} total={total} color={project.color} className="mt-4" />
    </Link>
  );
}
