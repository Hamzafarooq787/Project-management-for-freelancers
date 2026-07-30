"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import * as store from "./store";
import { uploadLogo } from "./storage";
import type {
  ChecklistItem,
  ClientDetails,
  DomainStatus,
  ProjectType,
  TaskPriority,
  TaskStatus,
  WebDevDetails,
} from "./types";

function refresh(projectId?: string) {
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

interface RawChecklistItem {
  id?: unknown;
  text?: unknown;
  done?: unknown;
}

function parseChecklistJson(formData: FormData): ChecklistItem[] {
  const raw = str(formData, "checklistJson");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RawChecklistItem[])
      .filter((item) => item && typeof item.text === "string" && item.text.trim() !== "")
      .map((item) => ({
        id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
        text: String(item.text).trim(),
        done: Boolean(item.done),
      }));
  } catch {
    return [];
  }
}

export async function createProjectAction(formData: FormData) {
  const name = str(formData, "name");
  const type = str(formData, "type") as ProjectType;
  const description = str(formData, "description");
  const color = str(formData, "color") || "#33d485";
  const startDate = str(formData, "startDate") || null;
  const endDate = str(formData, "endDate") || null;
  const websiteUrl = str(formData, "websiteUrl");

  if (!name) return;

  const clientDetails: ClientDetails = {
    name: str(formData, "clientName"),
    company: str(formData, "clientCompany"),
    email: str(formData, "clientEmail"),
    phone: str(formData, "clientPhone"),
    notes: str(formData, "clientNotes"),
    logoUrl: "",
  };

  const webDetails: Partial<WebDevDetails> | null =
    type === "web_dev"
      ? {
          websiteName: str(formData, "websiteName"),
          websiteUrl,
          domainStatus: (str(formData, "domainStatus") || "pending") as DomainStatus,
          logoUrl: str(formData, "logoUrl"),
          siteIconUrl: str(formData, "siteIconUrl"),
          openGraphImageUrl: str(formData, "openGraphImageUrl"),
          servicesDetails: str(formData, "servicesDetails"),
          hostingDetails: str(formData, "hostingDetails"),
          contactDetails: str(formData, "contactDetails"),
          notes: str(formData, "webNotes"),
        }
      : null;

  const project = await store.createProject({
    name,
    type,
    description,
    color,
    startDate,
    endDate,
    websiteUrl,
    clientDetails,
    webDetails,
  });
  refresh(project.id);
  return project.id;
}

export async function updateClientDetailsAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  if (!projectId) return;

  const logoFile = formData.get("logoFile");
  const uploadedLogoUrl = logoFile instanceof File ? await uploadLogo(logoFile, `clients/${projectId}`) : null;

  const clientDetails: ClientDetails = {
    name: str(formData, "clientName"),
    company: str(formData, "clientCompany"),
    email: str(formData, "clientEmail"),
    phone: str(formData, "clientPhone"),
    notes: str(formData, "clientNotes"),
    logoUrl: uploadedLogoUrl ?? str(formData, "existingLogoUrl"),
  };

  await store.updateProjectDetails(projectId, { clientDetails });
  refresh(projectId);
}

export async function updateProjectMetaAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  if (!projectId) return;

  await store.updateProjectDetails(projectId, {
    description: str(formData, "description"),
    startDate: str(formData, "startDate") || null,
    endDate: str(formData, "endDate") || null,
    websiteUrl: str(formData, "websiteUrl"),
  });
  refresh(projectId);
}

export async function updateWebDetailsAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  if (!projectId) return;

  const webDetails: WebDevDetails = {
    websiteName: str(formData, "websiteName"),
    websiteUrl: str(formData, "websiteUrl"),
    domainStatus: (str(formData, "domainStatus") || "pending") as DomainStatus,
    logoUrl: str(formData, "logoUrl"),
    siteIconUrl: str(formData, "siteIconUrl"),
    openGraphImageUrl: str(formData, "openGraphImageUrl"),
    servicesDetails: str(formData, "servicesDetails"),
    hostingDetails: str(formData, "hostingDetails"),
    contactDetails: str(formData, "contactDetails"),
    notes: str(formData, "webNotes"),
  };

  await store.updateProjectDetails(projectId, { webDetails, websiteUrl: webDetails.websiteUrl });
  refresh(projectId);
}

export async function createTaskAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  const stageId = str(formData, "stageId") || null;
  const title = str(formData, "title");
  const priority = (str(formData, "priority") || "medium") as TaskPriority;
  const scheduledFor = str(formData, "scheduledFor") || null;
  const markDoneOn = str(formData, "markDoneOn") || null;
  const checklist = parseChecklistJson(formData);
  if (!projectId || !title) return;

  await store.createTask({ projectId, stageId, title, priority, scheduledFor, checklist, markDoneOn });
  refresh(projectId);
}

export async function updateTaskDetailsAction(formData: FormData) {
  const taskId = str(formData, "taskId");
  const projectId = str(formData, "projectId");
  if (!taskId || !projectId) return;

  await store.updateTaskDetails(taskId, {
    title: str(formData, "title"),
    notes: str(formData, "notes"),
    priority: (str(formData, "priority") || "medium") as TaskPriority,
    stageId: str(formData, "stageId") || null,
    dueDate: str(formData, "dueDate") || null,
    status: (str(formData, "status") || "todo") as TaskStatus,
    scheduledFor: str(formData, "scheduledFor") || null,
    checklist: parseChecklistJson(formData),
    completedDate: str(formData, "completedDate") || null,
  });
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

export async function updateBusinessProfileAction(formData: FormData) {
  const logoFile = formData.get("logoFile");
  const uploadedLogoUrl = logoFile instanceof File ? await uploadLogo(logoFile, "company") : null;

  await store.updateBusinessProfile({
    companyName: str(formData, "companyName"),
    logoUrl: uploadedLogoUrl ?? str(formData, "existingLogoUrl"),
  });
  revalidatePath("/settings");
}
