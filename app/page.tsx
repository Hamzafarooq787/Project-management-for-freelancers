import Link from "next/link";
import { ListTodo, FolderKanban, Star, CheckCircle2, ArrowRight } from "lucide-react";
import { getCompletedTasks, getOpenTasks, getProjects, getTodayTasks } from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { TaskRow } from "@/components/TaskRow";
import { ProjectCard } from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [openTasks, projects, todayTasks, completedTasks] = await Promise.all([
    getOpenTasks(),
    getProjects(),
    getTodayTasks(),
    getCompletedTasks(),
  ]);

  const activeProjects = projects.filter((p) => !p.archived);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const stageNameById = (projectId: string, stageId: string | null) => {
    if (!stageId) return null;
    return projectById.get(projectId)?.stages.find((s) => s.id === stageId)?.name ?? null;
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Everything open, across every project, in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open tasks" value={openTasks.length} icon={ListTodo} tone="accent" />
        <StatCard label="Scheduled today" value={todayTasks.length} icon={Star} tone="amber" />
        <StatCard label="Active projects" value={activeProjects.length} icon={FolderKanban} tone="sky" />
        <StatCard label="Completed" value={completedTasks.length} icon={CheckCircle2} tone="accent" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Open Tasks
          </h2>
          <Link href="/today" className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300">
            Plan today <ArrowRight size={12} />
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {openTasks.length === 0 && (
            <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
              Nothing open. You&apos;re fully caught up.
            </p>
          )}
          {openTasks.slice(0, 8).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              stageName={stageNameById(task.projectId, task.stageId)}
              showProject
              projectName={projectById.get(task.projectId)?.name}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Projects</h2>
          <Link href="/projects" className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
