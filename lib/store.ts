import { getSupabase } from "./supabaseClient";
import { PROJECT_TEMPLATES } from "./templates";
import type {
  BusinessProfile,
  ChecklistItem,
  ClientDetails,
  Project,
  ProjectType,
  Stage,
  Task,
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
  client_details: ClientDetails;
  type: ProjectType;
  description: string;
  color: string;
  archived: boolean;
  start_date: string | null;
  end_date: string | null;
  website_url: string;
  web_details: WebDevDetails | null;
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
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  order_index: number;
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
    clientDetails: row.client_details,
    type: row.type,
    description: row.description,
    color: row.color,
    archived: row.archived,
    startDate: row.start_date,
    endDate: row.end_date,
    websiteUrl: row.website_url,
    webDetails: row.web_details,
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

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function toCompletedTimestamp(dateKey: string | null): string {
  return `${dateKey || todayDateKey()}T12:00:00.000Z`;
}

async function touchProject(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("projects")
    .update({ updated_at: nowIso() })
    .eq("id", projectId);
  if (error) throw error;
}

async function fetchStagesForProjects(projectIds: string[]): Promise<Map<string, Stage[]>> {
  const map = new Map<string, Stage[]>();
  if (projectIds.length === 0) return map;

  const { data, error } = await getSupabase().from("stages").select("*").in("project_id", projectIds);
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
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProjectRow[];
  const stagesByProject = await fetchStagesForProjects(rows.map((r) => r.id));
  return rows.map((row) => toProject(row, stagesByProject.get(row.id) ?? []));
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await getSupabase().from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ProjectRow;
  const { data: stageRows, error: stageError } = await getSupabase()
    .from("stages")
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
  clientDetails: ClientDetails;
  webDetails?: Partial<WebDevDetails> | null;
}): Promise<Project> {
  const webDetails =
    input.type === "web_dev" ? { ...emptyWebDetails(), ...(input.webDetails ?? {}) } : null;

  const { data, error } = await getSupabase()
    .from("projects")
    .insert({
      name: input.name,
      client: input.clientDetails.company || input.clientDetails.name,
      client_details: input.clientDetails,
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
    .from("stages")
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

  const { error } = await getSupabase().from("projects").update(update).eq("id", id);
  if (error) throw error;
}

export async function archiveProject(id: string, archived: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("projects")
    .update({ archived, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw error;
}

export async function addStage(projectId: string, name: string): Promise<Stage | null> {
  const { count, error: countError } = await getSupabase()
    .from("stages")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (countError) throw countError;

  const { data, error } = await getSupabase()
    .from("stages")
    .insert({ project_id: projectId, name, order_index: count ?? 0 })
    .select()
    .single();
  if (error) throw error;

  await touchProject(projectId);
  return toStage(data as StageRow);
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index");
  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map(toTask);
}

export async function getOpenTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase().from("tasks").select("*").neq("status", "done");
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
  const { data, error } = await getSupabase().from("tasks").select("*").eq("status", "done");
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
  markDoneOn?: string | null;
}): Promise<Task> {
  const { count, error: countError } = await getSupabase()
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", input.projectId);
  if (countError) throw countError;

  const isBackdated = Boolean(input.markDoneOn);

  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({
      project_id: input.projectId,
      stage_id: input.stageId,
      title: input.title,
      notes: input.notes ?? "",
      priority: input.priority ?? "medium",
      scheduled_for: isBackdated ? null : (input.scheduledFor ?? null),
      checklist: input.checklist ?? [],
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
  const update: Record<string, unknown> = {
    status,
    updated_at: nowIso(),
    completed_at: status === "done" ? nowIso() : null,
  };
  if (status === "done") update.scheduled_for = null;

  const { data, error } = await getSupabase()
    .from("tasks")
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
  const update: Record<string, unknown> = {
    title: patch.title,
    notes: patch.notes,
    priority: patch.priority,
    stage_id: patch.stageId,
    due_date: patch.dueDate,
    status: patch.status,
    scheduled_for: patch.status === "done" ? null : patch.scheduledFor,
    checklist: patch.checklist,
    completed_at: patch.status === "done" ? toCompletedTimestamp(patch.completedDate) : null,
    updated_at: nowIso(),
  };

  const { data, error } = await getSupabase()
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .select("project_id")
    .maybeSingle();
  if (error) throw error;

  if (data) await touchProject((data as { project_id: string }).project_id);
}

export async function toggleToday(taskId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .select("scheduled_for")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const today = todayDateKey();
  const current = (data as { scheduled_for: string | null }).scheduled_for;
  const next = current === today ? null : today;
  const { error: updateError } = await getSupabase()
    .from("tasks")
    .update({ scheduled_for: next, updated_at: nowIso() })
    .eq("id", taskId);
  if (updateError) throw updateError;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await getSupabase().from("tasks").delete().eq("id", taskId);
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
  const { data, error } = await getSupabase().from("tasks").select("project_id, status");
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
    .from("business_profile")
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
    .from("business_profile")
    .upsert({ id: true, company_name: patch.companyName, logo_url: patch.logoUrl, updated_at: nowIso() });
  if (error) throw error;
}
