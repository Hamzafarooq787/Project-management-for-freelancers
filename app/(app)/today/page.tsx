import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { getProjectsForProfile, getTasksScheduledOn, todayDateKey } from "@/lib/store";
import { TaskRow } from "@/components/TaskRow";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const date = cookies().get("today-date")?.value || todayDateKey();
  const profile = await getCurrentProfile();
  const [allTasks, projects] = await Promise.all([
    getTasksScheduledOn(date),
    profile ? getProjectsForProfile(profile) : Promise.resolve([]),
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const tasks = allTasks.filter((t) => projectById.has(t.projectId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Today</h1>
        <p className="mt-1 text-sm text-neutral-500">
          What you&apos;re doing today, pulled from every project. Star any task from a project to add it here.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-base-700 p-8 text-center text-sm text-neutral-500">
            Nothing scheduled for today yet. Go to a project and star a task, or set it from the task details.
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
              stages={project?.stages ?? []}
              showProject
              projectName={project?.name}
            />
          );
        })}
      </div>
    </div>
  );
}
