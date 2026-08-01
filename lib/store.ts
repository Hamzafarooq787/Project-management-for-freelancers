import { randomUUID } from "node:crypto";
import { getSupabase } from "./supabaseClient";
import { PROJECT_TEMPLATES } from "./templates";
import type {
  BusinessProfile,
  ChecklistItem,
  Client,
  ClientDetails,
  Payment,
  PaymentKind,
  PaymentPlan,
  PaymentPlanType,
  Profile,
  Project,
  ProjectType,
  Role,
  Stage,
  Task,
  TaskFile,
  TaskPriority,
  TaskStatus,
  WebDevDetails,
} from "./types";

/**
 * Supabase-backed data layer. Every function here is async and mirrors the shape of
 * the app's domain types (lib/types.ts) so page and component code never has to know
 * it's talking to Postgres under the hood. All access goes through the server-only
 * service role client in lib/supabaseClient.ts.
 */

interface ProjectRow {
  id: string;
  name: string;
  client: string;
  client_id: string | null;
  client_details: ClientDetails;
  type: ProjectType;
  description: string;
  color: string;
  archived: boolean;
  start_date: string | null;
  end_date: string | null;
  website_url: string;
  web_details: WebDevDetails | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

interface StageRow {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
}

interface TaskRow {
  id: string;
  project_id: string;
  stage_id: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  scheduled_for: string | null;
  checklist: ChecklistItem[];
  files: (TaskFile | string)[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  order_index: number;
}

/** Normalizes legacy plain-string image URLs (from before file attachments were
 * generalized) alongside the current {url, name, type, size} shape. */
function normalizeFiles(files: (TaskFile | string)[] | null | undefined): TaskFile[] {
  return (files ?? []).map((f) =>
    typeof f === "string" ? { url: f, name: f.split("/").pop() || "file", type: "image/*", size: 0 } : f,
  );
}

function toStage(row: StageRow): Stage {
  return { id: row.id, name: row.name, order: row.order_index };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    stageId: row.stage_id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    scheduledFor: row.scheduled_for,
    checklist: row.checklist ?? [],
    files: normalizeFiles(row.files),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    order: row.order_index,
  };
}

function toProject(row: ProjectRow, stages: Stage[]): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    clientId: row.client_id,
    clientDetails: row.client_details,
    type: row.type,
    description: row.description,
    color: row.color,
    archived: row.archived,
    startDate: row.start_date,
    endDate: row.end_date,
    websiteUrl: row.website_url,
    webDetails: row.web_details,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stages: [...stages].sort((a, b) => a.order - b.order),
  };
}

function emptyWebDetails(): WebDevDetails {
  return {
    websiteName: "",
    websiteUrl: "",
    domainStatus: "pending",
    logoUrl: "",
    siteIconUrl: "",
    openGraphImageUrl: "",
    servicesDetails: "",
    hostingDetails: "",
    contactDetails: "",
    notes: "",
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * True when a query failed only because its table doesn't exist yet (i.e. the
 * relevant migration hasn't been run). Callers use this to fail open — return
 * an empty/default result — instead of crashing every page that touches a
 * newer, optional feature (teams/roles, payments) before it's set up.
 */
export function isMissingTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === "42P01" || Boolean(err?.message?.includes("does not exist"));
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function toCompletedTimestamp(dateKey: string | null): string {
  return `${dateKey || todayDateKey()}T12:00:00.000Z`;
}

function isChecklistComplete(checklist: ChecklistItem[]): boolean {
  return checklist.every((item) => item.done);
}

async function touchProject(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_projects")
    .update({ updated_at: nowIso() })
    .eq("id", projectId);
  if (error) throw error;
}

async function fetchStagesForProjects(projectIds: string[]): Promise<Map<string, Stage[]>> {
  const map = new Map<string, Stage[]>();
  if (projectIds.length === 0) return map;

  const { data, error } = await getSupabase().from("freelance_hq_stages").select("*").in("project_id", projectIds);
  if (error) throw error;

  for (const row of (data ?? []) as StageRow[]) {
    const list = map.get(row.project_id) ?? [];
    list.push(toStage(row));
    map.set(row.project_id, list);
  }
  return map;
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProjectRow[];
  const stagesByProject = await fetchStagesForProjects(rows.map((r) => r.id));
  return rows.map((row) => toProject(row, stagesByProject.get(row.id) ?? []));
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await getSupabase().from("freelance_hq_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ProjectRow;
  const { data: stageRows, error: stageError } = await getSupabase()
    .from("freelance_hq_stages")
    .select("*")
    .eq("project_id", id);
  if (stageError) throw stageError;

  return toProject(row, ((stageRows ?? []) as StageRow[]).map(toStage));
}

export async function createProject(input: {
  name: string;
  type: ProjectType;
  description: string;
  color: string;
  startDate?: string | null;
  endDate?: string | null;
  websiteUrl?: string;
  clientId: string;
  webDetails?: Partial<WebDevDetails> | null;
}): Promise<Project> {
  const client = await getClient(input.clientId);
  if (!client) throw new Error("Client not found.");
  const clientDetails: ClientDetails = {
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    logoUrl: client.logoUrl,
  };

  const webDetails =
    input.type === "web_dev" ? { ...emptyWebDetails(), ...(input.webDetails ?? {}) } : null;

  const { data, error } = await getSupabase()
    .from("freelance_hq_projects")
    .insert({
      name: input.name,
      client: clientDetails.company || clientDetails.name,
      client_id: input.clientId,
      client_details: clientDetails,
      type: input.type,
      description: input.description,
      color: input.color,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      website_url: input.websiteUrl ?? "",
      web_details: webDetails,
    })
    .select()
    .single();
  if (error) throw error;

  const row = data as ProjectRow;
  const stageNames = PROJECT_TEMPLATES[input.type].stages;
  const { data: stageRows, error: stageError } = await getSupabase()
    .from("freelance_hq_stages")
    .insert(stageNames.map((name, i) => ({ project_id: row.id, name, order_index: i })))
    .select();
  if (stageError) throw stageError;

  return toProject(row, ((stageRows ?? []) as StageRow[]).map(toStage));
}

export async function updateProjectDetails(
  id: string,
  patch: Partial<
    Pick<Project, "description" | "startDate" | "endDate" | "websiteUrl" | "clientDetails" | "webDetails">
  >,
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.websiteUrl !== undefined) update.website_url = patch.websiteUrl;
  if (patch.webDetails !== undefined) update.web_details = patch.webDetails;
  if (patch.clientDetails !== undefined) {
    update.client_details = patch.clientDetails;
    update.client = patch.clientDetails.company || patch.clientDetails.name;
  }

  const { error } = await getSupabase().from("freelance_hq_projects").update(update).eq("id", id);
  if (error) throw error;
}

interface ClientRow {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  logo_url: string;
  created_at: string;
}

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
  };
}

export async function listClients(): Promise<Client[]> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_clients").select("*").order("name", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ClientRow[]).map(toClient);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function getClient(id: string): Promise<Client | null> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_clients").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toClient(data as ClientRow) : null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function createClient(input: {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}): Promise<Client> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_clients")
    .insert({
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      logo_url: "",
    })
    .select()
    .single();
  if (error) throw error;
  return toClient(data as ClientRow);
}

export async function updateClient(
  id: string,
  patch: Partial<Pick<Client, "name" | "company" | "email" | "phone" | "notes" | "logoUrl">>,
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.company !== undefined) update.company = patch.company;
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.logoUrl !== undefined) update.logo_url = patch.logoUrl;

  const { error } = await getSupabase().from("freelance_hq_clients").update(update).eq("id", id);
  if (error) throw error;
}

export async function getProjectsForClient(clientId: string): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_projects")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProjectRow[];
  const stagesByProject = await fetchStagesForProjects(rows.map((r) => r.id));
  return rows.map((row) => toProject(row, stagesByProject.get(row.id) ?? []));
}

export async function archiveProject(id: string, archived: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_projects")
    .update({ archived, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Permanently deletes a project (tasks, stages, payment plans, and team
 * assignments always go with it via foreign-key cascade). Payment history is
 * the one exception: when keepFinancialData is true, its payments are
 * detached (project_id set to null) first so they survive the cascade and
 * keep counting toward Finance totals.
 */
export async function deleteProject(id: string, keepFinancialData: boolean): Promise<void> {
  if (keepFinancialData) {
    const { error: detachError } = await getSupabase()
      .from("freelance_hq_payments")
      .update({ project_id: null })
      .eq("project_id", id);
    if (detachError) throw detachError;
  }

  const { error } = await getSupabase().from("freelance_hq_projects").delete().eq("id", id);
  if (error) throw error;
}

export async function addStage(projectId: string, name: string): Promise<Stage | null> {
  const { count, error: countError } = await getSupabase()
    .from("freelance_hq_stages")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countError) throw countError;

  const { data, error } = await getSupabase()
    .from("freelance_hq_stages")
    .insert({ project_id: projectId, name, order_index: count ?? 0 })
    .select()
    .single();
  if (error) throw error;

  await touchProject(projectId);
  return toStage(data as StageRow);
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index");
  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map(toTask);
}

export async function getOpenTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase().from("freelance_hq_tasks").select("*").neq("status", "done");
  if (error) throw error;

  const tasks = ((data ?? []) as TaskRow[]).map(toTask);
  return tasks.sort((a, b) => {
    const rank = (s: TaskStatus) => (s === "in_progress" ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    const pr = { high: 0, medium: 1, low: 2 } as const;
    if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export async function getTasksScheduledOn(date: string): Promise<Task[]> {
  const open = await getOpenTasks();
  return open.filter((t) => t.scheduledFor === date);
}

export async function getCompletedTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase().from("freelance_hq_tasks").select("*").eq("status", "done");
  if (error) throw error;

  return ((data ?? []) as TaskRow[])
    .map(toTask)
    .sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1));
}

export async function createTask(input: {
  projectId: string;
  stageId: string | null;
  title: string;
  notes?: string;
  priority?: TaskPriority;
  scheduledFor?: string | null;
  checklist?: ChecklistItem[];
  files?: TaskFile[];
  markDoneOn?: string | null;
}): Promise<Task> {
  const { count, error: countError } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", input.projectId);
  if (countError) throw countError;

  const checklist = input.checklist ?? [];
  const isBackdated = Boolean(input.markDoneOn) && isChecklistComplete(checklist);

  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .insert({
      project_id: input.projectId,
      stage_id: input.stageId,
      title: input.title,
      notes: input.notes ?? "",
      priority: input.priority ?? "medium",
      scheduled_for: isBackdated ? null : (input.scheduledFor ?? null),
      checklist,
      files: input.files ?? [],
      status: isBackdated ? "done" : "todo",
      completed_at: isBackdated ? toCompletedTimestamp(input.markDoneOn ?? null) : null,
      order_index: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;

  await touchProject(input.projectId);
  return toTask(data as TaskRow);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  let resolvedStatus = status;

  if (status === "done") {
    const { data: existing, error: fetchError } = await getSupabase()
      .from("freelance_hq_tasks")
      .select("checklist")
      .eq("id", taskId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    const checklist = (existing as { checklist: ChecklistItem[] } | null)?.checklist ?? [];
    if (!isChecklistComplete(checklist)) resolvedStatus = "in_progress";
  }

  const update: Record<string, unknown> = {
    status: resolvedStatus,
    updated_at: nowIso(),
    completed_at: resolvedStatus === "done" ? nowIso() : null,
  };
  if (resolvedStatus === "done") update.scheduled_for = null;

  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .update(update)
    .eq("id", taskId)
    .select("project_id")
    .maybeSingle();
  if (error) throw error;

  if (data) await touchProject((data as { project_id: string }).project_id);
}

export async function updateTaskDetails(
  taskId: string,
  patch: {
    title: string;
    notes: string;
    priority: TaskPriority;
    stageId: string | null;
    dueDate: string | null;
    status: TaskStatus;
    scheduledFor: string | null;
    checklist: ChecklistItem[];
    completedDate: string | null;
  },
): Promise<void> {
  const status = patch.status === "done" && !isChecklistComplete(patch.checklist) ? "in_progress" : patch.status;

  const update: Record<string, unknown> = {
    title: patch.title,
    notes: patch.notes,
    priority: patch.priority,
    stage_id: patch.stageId,
    due_date: patch.dueDate,
    status,
    scheduled_for: status === "done" ? null : patch.scheduledFor,
    checklist: patch.checklist,
    completed_at: status === "done" ? toCompletedTimestamp(patch.completedDate) : null,
    updated_at: nowIso(),
  };

  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .update(update)
    .eq("id", taskId)
    .select("project_id")
    .maybeSingle();
  if (error) throw error;

  if (data) await touchProject((data as { project_id: string }).project_id);
}

export async function toggleToday(taskId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("scheduled_for")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const today = todayDateKey();
  const current = (data as { scheduled_for: string | null }).scheduled_for;
  const next = current === today ? null : today;
  const { error: updateError } = await getSupabase()
    .from("freelance_hq_tasks")
    .update({ scheduled_for: next, updated_at: nowIso() })
    .eq("id", taskId);
  if (updateError) throw updateError;
}

export async function toggleChecklistItem(taskId: string, itemId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("checklist, project_id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const row = data as { checklist: ChecklistItem[]; project_id: string; status: TaskStatus };
  const nextChecklist = row.checklist.map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item,
  );

  const update: Record<string, unknown> = { checklist: nextChecklist, updated_at: nowIso() };
  if (row.status === "done" && !isChecklistComplete(nextChecklist)) {
    update.status = "in_progress";
    update.completed_at = null;
  }

  const { error: updateError } = await getSupabase().from("freelance_hq_tasks").update(update).eq("id", taskId);
  if (updateError) throw updateError;

  await touchProject(row.project_id);
}

export async function addTaskFile(taskId: string, file: TaskFile): Promise<void> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("files, project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const row = data as { files: (TaskFile | string)[]; project_id: string };
  const { error: updateError } = await getSupabase()
    .from("freelance_hq_tasks")
    .update({ files: [...normalizeFiles(row.files), file], updated_at: nowIso() })
    .eq("id", taskId);
  if (updateError) throw updateError;

  await touchProject(row.project_id);
}

export async function removeTaskFile(taskId: string, url: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("files, project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const row = data as { files: (TaskFile | string)[]; project_id: string };
  const { error: updateError } = await getSupabase()
    .from("freelance_hq_tasks")
    .update({ files: normalizeFiles(row.files).filter((f) => f.url !== url), updated_at: nowIso() })
    .eq("id", taskId);
  if (updateError) throw updateError;

  await touchProject(row.project_id);
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function getProjectProgress(projectId: string): Promise<{ done: number; total: number }> {
  const tasks = await getTasksByProject(projectId);
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total: tasks.length };
}

export async function getProjectProgressMap(): Promise<
  Record<string, { done: number; total: number; openCount: number }>
> {
  const { data, error } = await getSupabase().from("freelance_hq_tasks").select("project_id, status");
  if (error) throw error;

  const map: Record<string, { done: number; total: number; openCount: number }> = {};
  for (const row of (data ?? []) as { project_id: string; status: TaskStatus }[]) {
    const entry = map[row.project_id] ?? { done: 0, total: 0, openCount: 0 };
    entry.total += 1;
    if (row.status === "done") entry.done += 1;
    else entry.openCount += 1;
    map[row.project_id] = entry;
  }
  return map;
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_business_profile")
    .select("company_name, logo_url")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;

  return {
    companyName: (data as { company_name: string } | null)?.company_name ?? "",
    logoUrl: (data as { logo_url: string } | null)?.logo_url ?? "",
  };
}

export async function updateBusinessProfile(patch: BusinessProfile): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_business_profile")
    .upsert({ id: true, company_name: patch.companyName, logo_url: patch.logoUrl, updated_at: nowIso() });
  if (error) throw error;
}

/**
 * A project's share_token being non-null is what "sharing enabled" means — there is
 * no separate boolean flag. Disabling sharing clears the token; the previous link
 * stops resolving to anything.
 */
export async function getOrCreateShareToken(projectId: string): Promise<string> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_projects")
    .select("share_token")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;

  const existing = (data as { share_token: string | null } | null)?.share_token;
  if (existing) return existing;

  const token = randomUUID().replace(/-/g, "");
  const { error: updateError } = await getSupabase()
    .from("freelance_hq_projects")
    .update({ share_token: token, updated_at: nowIso() })
    .eq("id", projectId);
  if (updateError) throw updateError;

  return token;
}

export async function regenerateShareToken(projectId: string): Promise<string> {
  const token = randomUUID().replace(/-/g, "");
  const { error } = await getSupabase()
    .from("freelance_hq_projects")
    .update({ share_token: token, updated_at: nowIso() })
    .eq("id", projectId);
  if (error) throw error;
  return token;
}

export async function disableSharing(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_projects")
    .update({ share_token: null, updated_at: nowIso() })
    .eq("id", projectId);
  if (error) throw error;
}

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return { id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase().from("freelance_hq_profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as ProfileRow) : null;
}

export async function getProfileCount(): Promise<number> {
  const { count, error } = await getSupabase().from("freelance_hq_profiles").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function createProfile(input: { id: string; email: string; name: string; role: Role }): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_profiles")
    .insert({ id: input.id, email: input.email, name: input.name, role: input.role })
    .select()
    .single();
  if (error) throw error;
  return toProfile(data as ProfileRow);
}

export async function listTeamMembers(): Promise<Profile[]> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_profiles").select("*").order("created_at");
    if (error) throw error;
    return ((data ?? []) as ProfileRow[]).map(toProfile);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function updateMemberRole(userId: string, role: Role): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_profiles").update({ role, updated_at: nowIso() }).eq("id", userId);
  if (error) throw error;
}

export async function inviteTeamMember(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<Profile> {
  const { data, error } = await getSupabase().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error) throw error;

  return createProfile({ id: data.user.id, email: input.email, name: input.name, role: input.role });
}

export async function removeMember(userId: string): Promise<void> {
  const { error } = await getSupabase().auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function getAssignedProjectIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_project_assignments").select("project_id").eq("user_id", userId);
    if (error) throw error;
    return ((data ?? []) as { project_id: string }[]).map((row) => row.project_id);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function isProjectAssignedToUser(projectId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
}

export async function setMemberAssignments(userId: string, projectIds: string[]): Promise<void> {
  const { error: deleteError } = await getSupabase().from("freelance_hq_project_assignments").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;
  if (projectIds.length === 0) return;

  const { error: insertError } = await getSupabase()
    .from("freelance_hq_project_assignments")
    .insert(projectIds.map((projectId) => ({ project_id: projectId, user_id: userId })));
  if (insertError) throw insertError;
}

export async function getProjectsForProfile(profile: Profile): Promise<Project[]> {
  const all = await getProjects();
  if (profile.role === "admin") return all;

  const assigned = new Set(await getAssignedProjectIds(profile.id));
  return all.filter((p) => assigned.has(p.id));
}

interface PaymentPlanRow {
  id: string;
  project_id: string;
  plan_type: PaymentPlanType;
  amount: number;
  currency: string;
  notes: string;
}

function toPaymentPlan(row: PaymentPlanRow): PaymentPlan {
  return {
    id: row.id,
    projectId: row.project_id,
    planType: row.plan_type,
    amount: Number(row.amount),
    currency: row.currency,
    notes: row.notes,
  };
}

/** A project can have one plan per currency (e.g. a PKR plan and a USD plan on the same project). */
export async function listPaymentPlansForProject(projectId: string): Promise<PaymentPlan[]> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_payment_plans").select("*").eq("project_id", projectId);
    if (error) throw error;
    return ((data ?? []) as PaymentPlanRow[]).map(toPaymentPlan);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function listPaymentPlans(): Promise<PaymentPlan[]> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_payment_plans").select("*");
    if (error) throw error;
    return ((data ?? []) as PaymentPlanRow[]).map(toPaymentPlan);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function setPaymentPlan(
  projectId: string,
  input: { planType: PaymentPlanType; amount: number; currency: string; notes: string },
): Promise<PaymentPlan> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_payment_plans")
    .upsert(
      {
        project_id: projectId,
        plan_type: input.planType,
        amount: input.amount,
        currency: input.currency,
        notes: input.notes,
        updated_at: nowIso(),
      },
      { onConflict: "project_id,currency" },
    )
    .select()
    .single();
  if (error) throw error;
  return toPaymentPlan(data as PaymentPlanRow);
}

export async function deletePaymentPlan(projectId: string, currency: string): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_payment_plans")
    .delete()
    .eq("project_id", projectId)
    .eq("currency", currency);
  if (error) throw error;
}

interface PaymentRow {
  id: string;
  project_id: string | null;
  amount: number;
  currency: string;
  kind: PaymentKind;
  period: string | null;
  note: string;
  paid_on: string;
  created_at: string;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    projectId: row.project_id,
    amount: Number(row.amount),
    currency: row.currency,
    kind: row.kind,
    period: row.period,
    note: row.note,
    paidOn: row.paid_on,
    createdAt: row.created_at,
  };
}

export async function listPaymentsForProject(projectId: string): Promise<Payment[]> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_payments")
      .select("*")
      .eq("project_id", projectId)
      .order("paid_on", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as PaymentRow[]).map(toPayment);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function listAllPayments(): Promise<Payment[]> {
  try {
    const { data, error } = await getSupabase().from("freelance_hq_payments").select("*").order("paid_on", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as PaymentRow[]).map(toPayment);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function addPayment(input: {
  projectId: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  period: string | null;
  note: string;
  paidOn: string;
}): Promise<Payment> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_payments")
    .insert({
      project_id: input.projectId,
      amount: input.amount,
      currency: input.currency,
      kind: input.kind,
      period: input.period,
      note: input.note,
      paid_on: input.paidOn,
    })
    .select()
    .single();
  if (error) throw error;
  return toPayment(data as PaymentRow);
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_payments").delete().eq("id", id);
  if (error) throw error;
}

export async function getProjectByShareToken(token: string): Promise<Project | null> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_projects")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ProjectRow;
  const { data: stageRows, error: stageError } = await getSupabase()
    .from("freelance_hq_stages")
    .select("*")
    .eq("project_id", row.id);
  if (stageError) throw stageError;

  return toProject(row, ((stageRows ?? []) as StageRow[]).map(toStage));
}
