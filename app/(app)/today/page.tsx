import { getCurrentProfile } from "@/lib/auth";
import { getProjectsForProfile, getTasksScheduledOn, todayDateKey } from "@/lib/store";
import { TaskRow } from "@/components/TaskRow";
import { DateNav } from "@/components/DateNav";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date || todayDateKey();
  const profile = await getCurrentProfile();
  const [allTasks, projects] = await Promise.all([
    getTasksScheduledOn(date),
    profile ? getProjectsForProfile(profile) : Promise.resolve([]),
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const tasks = allTasks.filter((t) => projectById.has(t.projectId));
  const isToday = date === todayDateKey();

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">{isToday ? "Today" : displayDate}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isToday
              ? "What you're doing today, pulled from every project."
              : `Tasks scheduled for ${displayDate}.`}{" "}
            Star any task, or pick a date to plan ahead.
          </p>
        </div>
        <DateNav date={date} basePath="/today" />
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-base-700 p-8 text-center text-sm text-neutral-500">
            Nothing scheduled for this date yet. Go to a project and star a task, or pick it from the task
            details.
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
