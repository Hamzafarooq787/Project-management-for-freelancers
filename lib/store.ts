import { randomUUID } from "node:crypto";
import { getSupabase } from "./supabaseClient";
import { PROJECT_TEMPLATES } from "./templates";
import { decryptSecret, encryptSecret, hashVaultPassword, verifyVaultPassword } from "./backlinkCrypto";
import type {
  BacklinkCategory,
  BacklinkEntry,
  BacklinkLink,
  BusinessProfile,
  ChecklistItem,
  Client,
  ClientDetails,
  Keyword,
  KeywordGroup,
  KeywordGroupColor,
  KeywordMonthlyPosition,
  KeywordPage,
  KeywordRankHistoryEntry,
  KeywordStatus,
  ProjectAttachment,
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
 *
 * Covers two distinct error shapes for the same underlying problem: raw
 * Postgres ("42P01", "does not exist") when querying via a direct connection,
 * and PostgREST's own ("PGRST205", "...in the schema cache") when the table
 * is missing (or was just created and PostgREST's cache hasn't refreshed
 * yet) — Supabase's JS client goes through PostgREST, so this second shape is
 * actually the common case in production.
 */
export function isMissingTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (err?.code === "42P01" || err?.code === "PGRST205") return true;
  const message = err?.message ?? "";
  return message.includes("does not exist") || message.includes("schema cache");
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
    const aDate = a.dueDate ?? a.scheduledFor;
    const bDate = b.dueDate ?? b.scheduledFor;
    if (aDate && bDate && aDate !== bDate) return aDate < bDate ? -1 : 1;
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;

    const rank = (s: TaskStatus) => (s === "in_progress" ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    const pr = { high: 0, medium: 1, low: 2 } as const;
    if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
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

export async function toggleToday(taskId: string, today: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_tasks")
    .select("scheduled_for")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

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

interface KeywordRow {
  id: string;
  project_id: string;
  keyword: string;
  target_page: string;
  search_volume: number | null;
  difficulty: number | null;
  current_rank: number | null;
  target_rank: number | null;
  status: KeywordStatus;
  notes: string;
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

function toKeyword(row: KeywordRow, pageIds: string[]): Keyword {
  return {
    id: row.id,
    projectId: row.project_id,
    keyword: row.keyword,
    targetPage: row.target_page,
    searchVolume: row.search_volume,
    difficulty: row.difficulty,
    currentRank: row.current_rank,
    targetRank: row.target_rank,
    status: row.status,
    notes: row.notes,
    isTracked: row.is_tracked ?? false,
    pageIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fails open (empty map) when migration 019 hasn't run yet — keywords still load, just without page assignments. */
async function listKeywordPageIds(keywordIds: string[]): Promise<Record<string, string[]>> {
  if (keywordIds.length === 0) return {};
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_keyword_page_links")
      .select("keyword_id, page_id")
      .in("keyword_id", keywordIds);
    if (error) throw error;
    const map: Record<string, string[]> = {};
    for (const row of (data ?? []) as { keyword_id: string; page_id: string }[]) {
      const list = map[row.keyword_id] ?? [];
      list.push(row.page_id);
      map[row.keyword_id] = list;
    }
    return map;
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

export async function listKeywords(projectId: string): Promise<Keyword[]> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_keywords")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as KeywordRow[];
    const pageIdsByKeyword = await listKeywordPageIds(rows.map((r) => r.id));
    return rows.map((row) => toKeyword(row, pageIdsByKeyword[row.id] ?? []));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

/** Case/whitespace-insensitive identity for a keyword string, used to silently dedupe instead of creating look-alike duplicate rows. */
function normalizeKeywordText(text: string): string {
  return text.trim().toLowerCase();
}

export async function createKeyword(input: {
  projectId: string;
  keyword: string;
  targetPage: string;
  searchVolume: number | null;
  difficulty: number | null;
  currentRank: number | null;
  targetRank: number | null;
  status: KeywordStatus;
  notes: string;
}): Promise<Keyword> {
  const { data: existingRows, error: existingError } = await getSupabase()
    .from("freelance_hq_keywords")
    .select("*")
    .eq("project_id", input.projectId)
    .ilike("keyword", input.keyword.trim());
  if (existingError) throw existingError;
  const existing = (existingRows as KeywordRow[] | null)?.find(
    (row) => normalizeKeywordText(row.keyword) === normalizeKeywordText(input.keyword),
  );
  if (existing) {
    const pageIds = (await listKeywordPageIds([existing.id]))[existing.id] ?? [];
    return toKeyword(existing, pageIds);
  }

  const { data, error } = await getSupabase()
    .from("freelance_hq_keywords")
    .insert({
      project_id: input.projectId,
      keyword: input.keyword,
      target_page: input.targetPage,
      search_volume: input.searchVolume,
      difficulty: input.difficulty,
      current_rank: input.currentRank,
      target_rank: input.targetRank,
      status: input.status,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw error;
  const keyword = toKeyword(data as KeywordRow, []);
  if (keyword.currentRank !== null) await logKeywordRank(keyword.id, keyword.currentRank);
  return keyword;
}

/**
 * Fails open when the history table doesn't exist yet (migration 014 not run):
 * rank history is a nice-to-have on top of a keyword's current rank, so a
 * missing optional table shouldn't break creating or updating a keyword.
 */
async function logKeywordRank(keywordId: string, rank: number | null): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from("freelance_hq_keyword_rank_history")
      .insert({ keyword_id: keywordId, rank });
    if (error) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
}

export async function updateKeyword(
  id: string,
  patch: Partial<
    Pick<
      Keyword,
      "keyword" | "targetPage" | "searchVolume" | "difficulty" | "currentRank" | "targetRank" | "status" | "notes"
    >
  >,
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.keyword !== undefined) update.keyword = patch.keyword;
  if (patch.targetPage !== undefined) update.target_page = patch.targetPage;
  if (patch.searchVolume !== undefined) update.search_volume = patch.searchVolume;
  if (patch.difficulty !== undefined) update.difficulty = patch.difficulty;
  if (patch.currentRank !== undefined) update.current_rank = patch.currentRank;
  if (patch.targetRank !== undefined) update.target_rank = patch.targetRank;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.notes !== undefined) update.notes = patch.notes;

  if (patch.currentRank !== undefined) {
    const { data: existing, error: fetchError } = await getSupabase()
      .from("freelance_hq_keywords")
      .select("current_rank")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    const previousRank = (existing as { current_rank: number | null } | null)?.current_rank ?? null;
    if (previousRank !== patch.currentRank) await logKeywordRank(id, patch.currentRank);
  }

  const { error } = await getSupabase().from("freelance_hq_keywords").update(update).eq("id", id);
  if (error) throw error;
}

interface KeywordRankHistoryRow {
  id: string;
  keyword_id: string;
  rank: number | null;
  recorded_on: string;
}

/** Groups rank-history entries by keyword, newest first, for the keywords given. */
export async function listKeywordRankHistory(keywordIds: string[]): Promise<Record<string, KeywordRankHistoryEntry[]>> {
  if (keywordIds.length === 0) return {};
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_keyword_rank_history")
      .select("*")
      .in("keyword_id", keywordIds)
      .order("recorded_on", { ascending: false });
    if (error) throw error;

    const map: Record<string, KeywordRankHistoryEntry[]> = {};
    for (const row of (data ?? []) as KeywordRankHistoryRow[]) {
      const entry: KeywordRankHistoryEntry = {
        id: row.id,
        keywordId: row.keyword_id,
        rank: row.rank,
        recordedOn: row.recorded_on,
      };
      const list = map[row.keyword_id] ?? [];
      list.push(entry);
      map[row.keyword_id] = list;
    }
    return map;
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

export async function deleteKeyword(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_keywords").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Fails open when the is_tracked column doesn't exist yet (migration 015 not
 * run yet): toggling the monthly-tracking list is optional on top of the
 * core keyword record, so a missing column shouldn't break the page.
 */
export async function setKeywordTracked(id: string, isTracked: boolean): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from("freelance_hq_keywords")
      .update({ is_tracked: isTracked, updated_at: nowIso() })
      .eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
}

/**
 * Fails open when the join table doesn't exist yet (migration 019 not run
 * yet): assigning a keyword to Pages is optional grouping on top of the
 * core keyword record, so a missing table shouldn't break the page.
 */
export async function addKeywordToPage(keywordId: string, pageId: string): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from("freelance_hq_keyword_page_links")
      .upsert({ keyword_id: keywordId, page_id: pageId }, { onConflict: "keyword_id,page_id" });
    if (error) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
}

export async function removeKeywordFromPage(keywordId: string, pageId: string): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from("freelance_hq_keyword_page_links")
      .delete()
      .eq("keyword_id", keywordId)
      .eq("page_id", pageId);
    if (error) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
}

interface KeywordGroupRow {
  id: string;
  project_id: string;
  name: string;
  color: KeywordGroupColor;
  order: number;
  created_at: string;
}

function toKeywordGroup(row: KeywordGroupRow): KeywordGroup {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
    order: row.order,
    createdAt: row.created_at,
  };
}

export async function listKeywordGroups(projectId: string): Promise<KeywordGroup[]> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_keyword_groups")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as KeywordGroupRow[]).map(toKeywordGroup);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function createKeywordGroup(input: {
  projectId: string;
  name: string;
  color: KeywordGroupColor;
}): Promise<KeywordGroup> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_keyword_groups")
    .insert({ project_id: input.projectId, name: input.name, color: input.color })
    .select()
    .single();
  if (error) throw error;
  return toKeywordGroup(data as KeywordGroupRow);
}

export async function updateKeywordGroup(id: string, patch: { name?: string; color?: KeywordGroupColor }): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.color !== undefined) update.color = patch.color;
  const { error } = await getSupabase().from("freelance_hq_keyword_groups").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteKeywordGroup(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_keyword_groups").delete().eq("id", id);
  if (error) throw error;
}

interface KeywordPageRow {
  id: string;
  group_id: string;
  name: string;
  url: string;
  order: number;
  created_at: string;
}

function toKeywordPage(row: KeywordPageRow): KeywordPage {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    url: row.url,
    order: row.order,
    createdAt: row.created_at,
  };
}

/** Groups pages by their parent group for the groups given. */
export async function listKeywordPages(groupIds: string[]): Promise<Record<string, KeywordPage[]>> {
  if (groupIds.length === 0) return {};
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_keyword_pages")
      .select("*")
      .in("group_id", groupIds)
      .order("order", { ascending: true });
    if (error) throw error;

    const map: Record<string, KeywordPage[]> = {};
    for (const row of (data ?? []) as KeywordPageRow[]) {
      const page = toKeywordPage(row);
      const list = map[page.groupId] ?? [];
      list.push(page);
      map[page.groupId] = list;
    }
    return map;
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

export async function createKeywordPage(input: { groupId: string; name: string; url: string }): Promise<KeywordPage> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_keyword_pages")
    .insert({ group_id: input.groupId, name: input.name, url: input.url })
    .select()
    .single();
  if (error) throw error;
  return toKeywordPage(data as KeywordPageRow);
}

export async function updateKeywordPage(id: string, patch: { name?: string; url?: string }): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.url !== undefined) update.url = patch.url;
  const { error } = await getSupabase().from("freelance_hq_keyword_pages").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteKeywordPage(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_keyword_pages").delete().eq("id", id);
  if (error) throw error;
}

interface KeywordMonthlyPositionRow {
  id: string;
  keyword_id: string;
  month: string;
  rank: number | null;
}

/** Groups monthly positions by keyword for the keywords given, oldest month first. */
export async function listMonthlyPositions(
  keywordIds: string[],
): Promise<Record<string, KeywordMonthlyPosition[]>> {
  if (keywordIds.length === 0) return {};
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_keyword_monthly_positions")
      .select("*")
      .in("keyword_id", keywordIds)
      .order("month", { ascending: true });
    if (error) throw error;

    const map: Record<string, KeywordMonthlyPosition[]> = {};
    for (const row of (data ?? []) as KeywordMonthlyPositionRow[]) {
      const entry: KeywordMonthlyPosition = {
        id: row.id,
        keywordId: row.keyword_id,
        month: row.month,
        rank: row.rank,
      };
      const list = map[row.keyword_id] ?? [];
      list.push(entry);
      map[row.keyword_id] = list;
    }
    return map;
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

/** Upserts a keyword's manually-entered rank for a given month ('YYYY-MM'). */
export async function setMonthlyPosition(keywordId: string, month: string, rank: number | null): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_keyword_monthly_positions")
    .upsert({ keyword_id: keywordId, month, rank, updated_at: nowIso() }, { onConflict: "keyword_id,month" });
  if (error) throw error;
}

export interface KeywordImportRow {
  keyword: string;
  targetPage: string;
  searchVolume: number | null;
  difficulty: number | null;
  currentRank: number | null;
  targetRank: number | null;
  status: KeywordStatus;
  notes: string;
}

/** Bulk-inserts imported keywords in a single round trip; rows without a keyword are dropped. */
export async function createKeywordsBulk(projectId: string, rows: KeywordImportRow[]): Promise<number> {
  const withText = rows.filter((r) => r.keyword.trim());
  if (withText.length === 0) return 0;

  const { data: existingRows, error: existingError } = await getSupabase()
    .from("freelance_hq_keywords")
    .select("keyword")
    .eq("project_id", projectId);
  if (existingError) throw existingError;
  const existingTexts = new Set(
    ((existingRows ?? []) as { keyword: string }[]).map((row) => normalizeKeywordText(row.keyword)),
  );

  const seenInBatch = new Set<string>();
  const valid = withText.filter((r) => {
    const normalized = normalizeKeywordText(r.keyword);
    if (existingTexts.has(normalized) || seenInBatch.has(normalized)) return false;
    seenInBatch.add(normalized);
    return true;
  });
  if (valid.length === 0) return 0;

  const { data, error } = await getSupabase()
    .from("freelance_hq_keywords")
    .insert(
      valid.map((r) => ({
        project_id: projectId,
        keyword: r.keyword,
        target_page: r.targetPage,
        search_volume: r.searchVolume,
        difficulty: r.difficulty,
        current_rank: r.currentRank,
        target_rank: r.targetRank,
        status: r.status,
        notes: r.notes,
      })),
    )
    .select("id, current_rank");
  if (error) throw error;

  const inserted = (data ?? []) as { id: string; current_rank: number | null }[];
  const withRank = inserted.filter((row) => row.current_rank !== null);
  if (withRank.length > 0) {
    try {
      const { error: historyError } = await getSupabase()
        .from("freelance_hq_keyword_rank_history")
        .insert(withRank.map((row) => ({ keyword_id: row.id, rank: row.current_rank })));
      if (historyError) throw historyError;
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
    }
  }

  return valid.length;
}

interface ProjectAttachmentRow {
  id: string;
  project_id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  created_at: string;
}

function toProjectAttachment(row: ProjectAttachmentRow): ProjectAttachment {
  return {
    id: row.id,
    projectId: row.project_id,
    url: row.url,
    name: row.name,
    type: row.type,
    size: row.size,
    createdAt: row.created_at,
  };
}

export async function listProjectAttachments(projectId: string): Promise<ProjectAttachment[]> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_project_attachments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as ProjectAttachmentRow[]).map(toProjectAttachment);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function addProjectAttachment(
  projectId: string,
  file: { url: string; name: string; type: string; size: number },
): Promise<void> {
  const { error } = await getSupabase()
    .from("freelance_hq_project_attachments")
    .insert({ project_id: projectId, url: file.url, name: file.name, type: file.type, size: file.size });
  if (error) throw error;
}

export async function removeProjectAttachment(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_project_attachments").delete().eq("id", id);
  if (error) throw error;
}

const DEFAULT_BACKLINK_CATEGORIES = [
  "Social Media Profiles",
  "Local Listing Backlinks",
  "Web 2.0 Backlinks",
  "Guest Posting",
];

interface BacklinkCategoryRow {
  id: string;
  project_id: string;
  name: string;
  order: number;
  created_at: string;
}

function toBacklinkCategory(row: BacklinkCategoryRow): BacklinkCategory {
  return { id: row.id, projectId: row.project_id, name: row.name, order: row.order, createdAt: row.created_at };
}

/** Auto-seeds the four default categories the first time a project has none, so they're always there without a manual setup step. */
export async function listBacklinkCategories(projectId: string): Promise<BacklinkCategory[]> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_backlink_categories")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });
    if (error) throw error;

    let rows = (data ?? []) as BacklinkCategoryRow[];
    if (rows.length === 0) {
      const { data: seeded, error: seedError } = await getSupabase()
        .from("freelance_hq_backlink_categories")
        .insert(DEFAULT_BACKLINK_CATEGORIES.map((name, order) => ({ project_id: projectId, name, order })))
        .select();
      if (seedError) throw seedError;
      rows = (seeded ?? []) as BacklinkCategoryRow[];
    }
    return rows.map(toBacklinkCategory);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function createBacklinkCategory(projectId: string, name: string): Promise<BacklinkCategory> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_backlink_categories")
    .insert({ project_id: projectId, name })
    .select()
    .single();
  if (error) throw error;
  return toBacklinkCategory(data as BacklinkCategoryRow);
}

export async function updateBacklinkCategory(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_backlink_categories").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteBacklinkCategory(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_backlink_categories").delete().eq("id", id);
  if (error) throw error;
}

interface BacklinkEntryRow {
  id: string;
  category_id: string;
  project_id: string;
  name: string;
  url: string;
  username: string;
  email: string;
  password_encrypted: string | null;
  posts_per_month: number | null;
  notes: string;
  links: BacklinkLink[] | null;
  created_at: string;
  updated_at: string;
}

function toBacklinkEntry(row: BacklinkEntryRow): BacklinkEntry {
  return {
    id: row.id,
    categoryId: row.category_id,
    projectId: row.project_id,
    name: row.name,
    url: row.url,
    username: row.username,
    email: row.email,
    hasPassword: Boolean(row.password_encrypted),
    postsPerMonth: row.posts_per_month,
    notes: row.notes,
    links: row.links ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Groups entries by category for the categories given. Never returns the encrypted password itself, only `hasPassword`. */
export async function listBacklinkEntries(categoryIds: string[]): Promise<Record<string, BacklinkEntry[]>> {
  if (categoryIds.length === 0) return {};
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_backlink_entries")
      .select("*")
      .in("category_id", categoryIds)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const map: Record<string, BacklinkEntry[]> = {};
    for (const row of (data ?? []) as BacklinkEntryRow[]) {
      const entry = toBacklinkEntry(row);
      const list = map[entry.categoryId] ?? [];
      list.push(entry);
      map[entry.categoryId] = list;
    }
    return map;
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

export interface BacklinkEntryInput {
  categoryId: string;
  projectId: string;
  name: string;
  url: string;
  username: string;
  email: string;
  password: string | null;
  postsPerMonth: number | null;
  notes: string;
  links: BacklinkLink[];
}

export async function createBacklinkEntry(input: BacklinkEntryInput): Promise<BacklinkEntry> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_backlink_entries")
    .insert({
      category_id: input.categoryId,
      project_id: input.projectId,
      name: input.name,
      url: input.url,
      username: input.username,
      email: input.email,
      password_encrypted: input.password ? encryptSecret(input.password) : null,
      posts_per_month: input.postsPerMonth,
      notes: input.notes,
      links: input.links,
    })
    .select()
    .single();
  if (error) throw error;
  return toBacklinkEntry(data as BacklinkEntryRow);
}

export async function updateBacklinkEntry(
  id: string,
  patch: Partial<Omit<BacklinkEntryInput, "categoryId" | "projectId">> & { clearPassword?: boolean },
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.url !== undefined) update.url = patch.url;
  if (patch.username !== undefined) update.username = patch.username;
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.postsPerMonth !== undefined) update.posts_per_month = patch.postsPerMonth;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.links !== undefined) update.links = patch.links;
  if (patch.clearPassword) update.password_encrypted = null;
  else if (patch.password) update.password_encrypted = encryptSecret(patch.password);

  const { error } = await getSupabase().from("freelance_hq_backlink_entries").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteBacklinkEntry(id: string): Promise<void> {
  const { error } = await getSupabase().from("freelance_hq_backlink_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function hasVaultPassword(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase()
      .from("freelance_hq_profiles")
      .select("vault_password_hash")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean((data as { vault_password_hash: string | null } | null)?.vault_password_hash);
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
}

/** Sets or changes a user's security (reveal) password. If one is already set, `currentPassword` must match it. */
export async function setVaultPassword(
  userId: string,
  newPassword: string,
  currentPassword: string | null,
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("freelance_hq_profiles")
    .select("vault_password_hash")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  const existingHash = (data as { vault_password_hash: string | null } | null)?.vault_password_hash ?? null;
  if (existingHash) {
    if (!currentPassword || !verifyVaultPassword(currentPassword, existingHash)) {
      throw new Error("WRONG_VAULT_PASSWORD");
    }
  }

  const { error: updateError } = await getSupabase()
    .from("freelance_hq_profiles")
    .update({ vault_password_hash: hashVaultPassword(newPassword), updated_at: nowIso() })
    .eq("id", userId);
  if (updateError) throw updateError;
}

/** Verifies the user's security password and decrypts the entry's saved password. Throws typed errors the caller maps to a message. */
export async function revealBacklinkPassword(
  entryId: string,
  userId: string,
  vaultPassword: string,
): Promise<string> {
  const { data: profileRow, error: profileError } = await getSupabase()
    .from("freelance_hq_profiles")
    .select("vault_password_hash")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const hash = (profileRow as { vault_password_hash: string | null } | null)?.vault_password_hash ?? null;
  if (!hash) throw new Error("NO_VAULT_PASSWORD");
  if (!verifyVaultPassword(vaultPassword, hash)) throw new Error("WRONG_VAULT_PASSWORD");

  const { data, error } = await getSupabase()
    .from("freelance_hq_backlink_entries")
    .select("password_encrypted")
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw error;

  const encrypted = (data as { password_encrypted: string | null } | null)?.password_encrypted ?? null;
  if (!encrypted) throw new Error("NO_PASSWORD_SET");
  return decryptSecret(encrypted);
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
