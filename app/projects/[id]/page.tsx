import { notFound } from "next/navigation";
import { getProject, getProjectProgress, getTasksByProject } from "@/lib/store";
import { ProjectTypeBadge } from "@/components/Badges";
import { ProgressBar } from "@/components/ProgressBar";
import { StageBoard } from "@/components/StageBoard";
import { TaskRow } from "@/components/TaskRow";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const [tasks, progress] = await Promise.all([
    getTasksByProject(project.id),
    getProjectProgress(project.id),
  ]);

  const completed = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1));

  const stageName = (stageId: string | null) =>
    project.stages.find((s) => s.id === stageId)?.name ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="text-2xl font-semibold text-neutral-50">{project.name}</h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500">{project.client}</p>
          <div className="mt-2 flex items-center gap-2">
            <ProjectTypeBadge type={project.type} />
          </div>
          {project.description && <p className="mt-3 max-w-xl text-sm text-neutral-400">{project.description}</p>}
        </div>

        <div className="flex flex-col items-end gap-3">
          <ArchiveToggle projectId={project.id} archived={project.archived} />
          <div className="w-48">
            <ProgressBar done={progress.done} total={progress.total} color={project.color} />
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Stages &amp; Tasks
        </h2>
        <StageBoard project={project} tasks={tasks} />
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Completed ({completed.length})
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {completed.length === 0 && (
            <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
              No completed tasks yet.
            </p>
          )}
          {completed.map((task) => (
            <TaskRow key={task.id} task={task} stageName={stageName(task.stageId)} />
          ))}
        </div>
      </section>
    </div>
  );
}
