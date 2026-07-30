import { getProjects, getTodayTasks } from "@/lib/store";
import { TaskRow } from "@/components/TaskRow";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [tasks, projects] = await Promise.all([getTodayTasks(), getProjects()]);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Today</h1>
        <p className="mt-1 text-sm text-neutral-500">
          What you&apos;re doing today, pulled from every project. Star any task to add it here.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-base-700 p-8 text-center text-sm text-neutral-500">
            Nothing scheduled for today yet. Go to a project and star a task to plan your day.
          </p>
        )}
        {tasks.map((task) => {
          const project = projectById.get(task.projectId);
          const stageName = project?.stages.find((s) => s.id === task.stageId)?.name ?? null;
          return (
            <TaskRow
              key={task.id}
              task={task}
              stageName={stageName}
              showProject
              projectName={project?.name}
            />
          );
        })}
      </div>
    </div>
  );
}
