"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as store from "./store";
import { requireAdmin, requireProjectAccess } from "./auth";
import { uploadLogo, uploadTaskFile } from "./storage";
import type {
  ChecklistItem,
  ClientDetails,
  DomainStatus,
  PaymentKind,
  PaymentPlanType,
  ProjectType,
  Role,
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
  await requireAdmin();

  const name = str(formData, "name");
  const type = str(formData, "type") as ProjectType;
  const description = str(formData, "description");
  const color = str(formData, "color") || "#33d485";
  const startDate = str(formData, "startDate") || null;
  const endDate = str(formData, "endDate") || null;
  const websiteUrl = str(formData, "websiteUrl");
  const clientId = str(formData, "clientId");

  if (!name || !clientId) return;

  const webDetails: Partial<WebDevDetails> | null =
    type === "web_dev"
      ? {
          websiteName: name,
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
    clientId,
    webDetails,
  });
  refresh(project.id);
  return project.id;
}

export async function createClientAction(formData: FormData) {
  await requireAdmin();

  const name = str(formData, "name");
  const company = str(formData, "company");
  if (!name && !company) return;

  const client = await store.createClient({
    name,
    company,
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    notes: str(formData, "notes"),
  });
  revalidatePath("/clients");
  revalidatePath("/projects/new");
  return client.id;
}

export async function updateClientAction(formData: FormData) {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) return;

  const logoFile = formData.get("logoFile");
  const uploadedLogoUrl = logoFile instanceof File ? await uploadLogo(logoFile, `clients/${id}`) : null;

  await store.updateClient(id, {
    name: str(formData, "name"),
    company: str(formData, "company"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    notes: str(formData, "notes"),
    logoUrl: uploadedLogoUrl ?? str(formData, "existingLogoUrl"),
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function updateClientDetailsAction(formData: FormData) {
  const projectId = str(formData, "projectId");
  if (!projectId) return;
  await requireProjectAccess(projectId);

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
  await requireProjectAccess(projectId);

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
  await requireProjectAccess(projectId);

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
  await requireProjectAccess(projectId);

  const task = await store.createTask({ projectId, stageId, title, priority, scheduledFor, checklist, markDoneOn });

  const attachments = formData.getAll("attachmentFile").filter((f): f is File => f instanceof File && f.size > 0);
  for (const attachment of attachments) {
    const uploaded = await uploadTaskFile(attachment, task.id);
    if (uploaded) await store.addTaskFile(task.id, uploaded);
  }

  refresh(projectId);
}

export async function updateTaskDetailsAction(formData: FormData) {
  const taskId = str(formData, "taskId");
  const projectId = str(formData, "projectId");
  if (!taskId || !projectId) return;
  await requireProjectAccess(projectId);

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
  await requireProjectAccess(projectId);
  await store.updateTaskStatus(taskId, status);
  refresh(projectId);
}

export async function toggleTodayAction(taskId: string, projectId: string) {
  await requireProjectAccess(projectId);
  await store.toggleToday(taskId);
  refresh(projectId);
}

export async function toggleChecklistItemAction(taskId: string, projectId: string, itemId: string) {
  await requireProjectAccess(projectId);
  await store.toggleChecklistItem(taskId, itemId);
  refresh(projectId);
}

export async function deleteTaskAction(taskId: string, projectId: string) {
  await requireProjectAccess(projectId);
  await store.deleteTask(taskId);
  refresh(projectId);
}

export async function addStageAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) return;
  await requireProjectAccess(projectId);
  await store.addStage(projectId, name);
  refresh(projectId);
}

export async function archiveProjectAction(projectId: string, archived: boolean) {
  await requireProjectAccess(projectId);
  await store.archiveProject(projectId, archived);
  refresh(projectId);
}

export async function deleteProjectAction(projectId: string, keepFinancialData: boolean) {
  await requireAdmin();
  await store.deleteProject(projectId, keepFinancialData);
  refresh(projectId);
  revalidatePath("/finance");
  redirect("/projects");
}

export async function updateBusinessProfileAction(formData: FormData) {
  await requireAdmin();
  const logoFile = formData.get("logoFile");
  const uploadedLogoUrl = logoFile instanceof File ? await uploadLogo(logoFile, "company") : null;

  await store.updateBusinessProfile({
    companyName: str(formData, "companyName"),
    logoUrl: uploadedLogoUrl ?? str(formData, "existingLogoUrl"),
  });
  revalidatePath("/settings");
}

export async function addTaskFileAction(formData: FormData) {
  const taskId = str(formData, "taskId");
  const projectId = str(formData, "projectId");
  const file = formData.get("file");
  if (!taskId || !projectId || !(file instanceof File)) return;
  await requireProjectAccess(projectId);

  const uploaded = await uploadTaskFile(file, taskId);
  if (!uploaded) return;

  await store.addTaskFile(taskId, uploaded);
  refresh(projectId);
}

export async function removeTaskFileAction(taskId: string, projectId: string, url: string) {
  await requireProjectAccess(projectId);
  await store.removeTaskFile(taskId, url);
  refresh(projectId);
}

export async function enableSharingAction(projectId: string): Promise<string> {
  await requireProjectAccess(projectId);
  const token = await store.getOrCreateShareToken(projectId);
  refresh(projectId);
  return token;
}

export async function regenerateShareTokenAction(projectId: string): Promise<string> {
  await requireProjectAccess(projectId);
  const token = await store.regenerateShareToken(projectId);
  refresh(projectId);
  return token;
}

export async function disableSharingAction(projectId: string) {
  await requireProjectAccess(projectId);
  await store.disableSharing(projectId);
  refresh(projectId);
}

/**
 * Admin-only team management. Team members are real Supabase Auth accounts
 * (created via the service-role admin API) with a role + optional per-project
 * assignments — see lib/auth.ts for how access is enforced.
 */
export async function inviteTeamMemberAction(formData: FormData) {
  await requireAdmin();

  const email = str(formData, "email");
  const password = str(formData, "password");
  const name = str(formData, "name");
  const role = (str(formData, "role") || "member") as Role;
  if (!email || !password) return;

  await store.inviteTeamMember({ email, password, name, role });
  revalidatePath("/admin");
}

export async function updateMemberRoleAction(userId: string, role: Role) {
  await requireAdmin();
  await store.updateMemberRole(userId, role);
  revalidatePath("/admin");
}

export async function assignProjectsAction(formData: FormData) {
  await requireAdmin();

  const userId = str(formData, "userId");
  if (!userId) return;

  const projectIds = formData.getAll("projectIds").map(String);
  await store.setMemberAssignments(userId, projectIds);
  revalidatePath("/admin");
}

export async function removeMemberAction(userId: string) {
  await requireAdmin();
  await store.removeMember(userId);
  revalidatePath("/admin");
}

/**
 * Billing. Kept admin-only since payment plans and the payment ledger are
 * financial data, unlike ordinary task/project management which members can
 * be given access to.
 */
export async function setPaymentPlanAction(formData: FormData) {
  await requireAdmin();

  const projectId = str(formData, "projectId");
  if (!projectId) return;

  const planType = (str(formData, "planType") || "monthly_fixed") as PaymentPlanType;
  const amount = Number(str(formData, "amount")) || 0;
  const currency = str(formData, "currency") || "PKR";
  const notes = str(formData, "notes");

  await store.setPaymentPlan(projectId, { planType, amount, currency, notes });
  refresh(projectId);
  revalidatePath("/finance");
}

export async function addPaymentAction(formData: FormData) {
  await requireAdmin();

  const projectId = str(formData, "projectId");
  const amount = Number(str(formData, "amount"));
  if (!projectId || !amount) return;

  const currency = str(formData, "currency") || "PKR";
  const kind = (str(formData, "kind") || "installment") as PaymentKind;
  const period = str(formData, "period") || null;
  const note = str(formData, "note");
  const paidOn = str(formData, "paidOn") || store.todayDateKey();

  await store.addPayment({ projectId, amount, currency, kind, period, note, paidOn });
  refresh(projectId);
  revalidatePath("/finance");
}

export async function deletePaymentAction(id: string, projectId: string) {
  await requireAdmin();
  await store.deletePayment(id);
  refresh(projectId);
  revalidatePath("/finance");
}

export async function deletePaymentPlanAction(formData: FormData) {
  await requireAdmin();

  const projectId = str(formData, "projectId");
  const currency = str(formData, "currency");
  if (!projectId || !currency) return;

  await store.deletePaymentPlan(projectId, currency);
  refresh(projectId);
  revalidatePath("/finance");
}

/**
 * Public, unauthenticated actions reachable from /share/[token]. These never trust a
 * client-supplied projectId — the project is always resolved strictly from the share
 * token itself, so a link only ever grants access to the one project it was created
 * for, and a disabled/regenerated link (null or different token) grants nothing.
 */
export async function createClientTaskAction(formData: FormData) {
  const token = str(formData, "shareToken");
  const title = str(formData, "title");
  if (!token || !title) return;

  const project = await store.getProjectByShareToken(token);
  if (!project) return;

  const stageId = str(formData, "stageId") || null;
  const notes = str(formData, "notes");

  const task = await store.createTask({
    projectId: project.id,
    stageId,
    title,
    notes,
  });

  const attachments = formData.getAll("attachmentFile").filter((f): f is File => f instanceof File && f.size > 0);
  for (const attachment of attachments) {
    const uploaded = await uploadTaskFile(attachment, `client-${task.id}`);
    if (uploaded) await store.addTaskFile(task.id, uploaded);
  }

  revalidatePath(`/share/${token}`);
  refresh(project.id);
  return task.id;
}

export async function addClientTaskFileAction(formData: FormData) {
  const token = str(formData, "shareToken");
  const taskId = str(formData, "taskId");
  const file = formData.get("file");
  if (!token || !taskId || !(file instanceof File)) return;

  const project = await store.getProjectByShareToken(token);
  if (!project) return;

  const tasks = await store.getTasksByProject(project.id);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const uploaded = await uploadTaskFile(file, `client-${taskId}`);
  if (!uploaded) return;

  await store.addTaskFile(taskId, uploaded);
  revalidatePath(`/share/${token}`);
  refresh(project.id);
}
