"use server";

import { revalidatePath } from "next/cache";
import * as store from "./store";
import type { ProjectType, TaskPriority, TaskStatus } from "./types";

function refresh(projectId?: string) {
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const client = String(formData.get("client") ?? "").trim();
  const type = String(formData.get("type") ?? "other") as ProjectType;
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#33d485");

  if (!name) return;

  const project = await store.createProject({ name, client, type, description, color });
  refresh(project.id);
  return project.id;
}

export async function createTaskAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const stageId = String(formData.get("stageId") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium") as TaskPriority;
  const scheduledFor = formData.get("scheduledFor") === "today" ? "today" : null;
  if (!projectId || !title) return;

  await store.createTask({ projectId, stageId, title, priority, scheduledFor });
  refresh(projectId);
}

export async function updateTaskStatusAction(taskId: string, projectId: string, status: TaskStatus) {
  await store.updateTaskStatus(taskId, status);
  refresh(projectId);
}

export async function toggleTodayAction(taskId: string, projectId: string) {
  await store.toggleToday(taskId);
  refresh(projectId);
}

export async function deleteTaskAction(taskId: string, projectId: string) {
  await store.deleteTask(taskId);
  refresh(projectId);
}

export async function addStageAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) return;
  await store.addStage(projectId, name);
  refresh(projectId);
}

export async function archiveProjectAction(projectId: string, archived: boolean) {
  await store.archiveProject(projectId, archived);
  refresh(projectId);
}
