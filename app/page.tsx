import Link from "next/link";
import { ListTodo, FolderKanban, Star, CheckCircle2, ArrowRight, Plus } from "lucide-react";
import {
  getCompletedTasks,
  getOpenTasks,
  getProjectProgressMap,
  getProjects,
  getTodayTasks,
} from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { TaskRow } from "@/components/TaskRow";
import { ProjectTypeTabs } from "@/components/ProjectTypeTabs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [openTasks, projects, todayTasks, completedTasks, progress] = await Promise.all([
    getOpenTasks(),
    getProjects(),
    getTodayTasks(),
    getCompletedTasks(),
    getProjectProgressMap(),
  ]);

  const activeProjects = projects.filter((p) => !p.archived);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const stageNameById = (projectId: string, stageId: string | null) => {
    if (!stageId) return null;
    return projectById.get(projectId)?.stages.find((s) => s.id === stageId)?.name ?? null;
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
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
        <ProjectTypeTabs projects={activeProjects} progress={progress} />
      </section>

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
              stages={projectById.get(task.projectId)?.stages ?? []}
              showProject
              projectName={projectById.get(task.projectId)?.name}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
