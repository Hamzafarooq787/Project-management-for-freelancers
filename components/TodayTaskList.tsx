"use client";

import type { Project, Task } from "@/lib/types";
import { TaskRow } from "./TaskRow";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Filters to the browser's own local "today" rather than the server's, so it's never a day off near midnight. */
export function TodayTaskList({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const today = todayKey();
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const todayTasks = tasks.filter((t) => t.scheduledFor === today);

  if (todayTasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-base-700 p-8 text-center text-sm text-neutral-500">
        Nothing scheduled for today yet. Go to a project and star a task, or set it from the task details.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {todayTasks.map((task) => {
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
  );
}
