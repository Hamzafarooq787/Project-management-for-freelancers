import Link from "next/link";
import { Plus } from "lucide-react";
import { getProjectProgress, getProjects, getTasksByProject } from "@/lib/store";
import { ProjectTypeTabs } from "@/components/ProjectTypeTabs";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const active = projects.filter((p) => !p.archived);

  const progress: Record<string, { done: number; total: number; openCount: number }> = {};
  await Promise.all(
    active.map(async (project) => {
      const [{ done, total }, tasks] = await Promise.all([
        getProjectProgress(project.id),
        getTasksByProject(project.id),
      ]);
      progress[project.id] = { done, total, openCount: tasks.filter((t) => t.status !== "done").length };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">SEO and web development, kept in their own lanes.</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 shadow-glow"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>

      <ProjectTypeTabs projects={active} progress={progress} />
    </div>
  );
}
