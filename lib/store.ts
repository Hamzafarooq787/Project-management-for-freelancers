import { nanoid } from "nanoid";
import type { Project, ProjectType, Stage, Task, TaskPriority, TaskStatus } from "./types";
import { PROJECT_TEMPLATES } from "./templates";

/**
 * In-memory data store. This is a placeholder persistence layer so the UI can be
 * fully designed and exercised before Supabase is wired in. Every function here is
 * async and returns plain objects on purpose, so swapping the internals for
 * Supabase queries later will not require changing any call sites.
 */

function now() {
  return new Date().toISOString();
}

function makeStages(names: string[]): Stage[] {
  return names.map((name, i) => ({ id: nanoid(8), name, order: i }));
}

function seed(): { projects: Project[]; tasks: Task[] } {
  const seoStages = makeStages(PROJECT_TEMPLATES.seo.stages);
  const webStages = makeStages(PROJECT_TEMPLATES.web_dev.stages);
  const dmStages = makeStages(PROJECT_TEMPLATES.digital_marketing.stages);

  const t = now();

  const oneStopTyres: Project = {
    id: nanoid(8),
    name: "One Stop Tyres",
    client: "One Stop Tyres Ltd",
    type: "seo",
    description: "Full SEO overhaul: on-page, technical SEO and backlink building.",
    color: "#33d485",
    archived: false,
    createdAt: t,
    updatedAt: t,
    stages: seoStages,
  };

  const findStage = (project: Project, name: string) =>
    project.stages.find((s) => s.name === name)?.id ?? null;

  const brightWebRedesign: Project = {
    id: nanoid(8),
    name: "Bright & Co Website Redesign",
    client: "Bright & Co",
    type: "web_dev",
    description: "Rebuild the marketing site on Next.js with a booking flow.",
    color: "#4fc3e0",
    archived: false,
    createdAt: t,
    updatedAt: t,
    stages: webStages,
  };

  const summerCampaign: Project = {
    id: nanoid(8),
    name: "Summer Sale Campaign",
    client: "Urban Fit Apparel",
    type: "digital_marketing",
    description: "Paid social + email push for the summer collection launch.",
    color: "#f2b84b",
    archived: false,
    createdAt: t,
    updatedAt: t,
    stages: dmStages,
  };

  const projects = [oneStopTyres, brightWebRedesign, summerCampaign];

  let order = 0;
  const task = (
    project: Project,
    stageName: string,
    title: string,
    status: TaskStatus,
    priority: TaskPriority = "medium",
    scheduledFor: "today" | null = null,
    notes = "",
  ): Task => ({
    id: nanoid(8),
    projectId: project.id,
    stageId: findStage(project, stageName),
    title,
    notes,
    status,
    priority,
    dueDate: null,
    scheduledFor,
    createdAt: t,
    updatedAt: t,
    completedAt: status === "done" ? t : null,
    order: order++,
  });

  const tasks: Task[] = [
    task(oneStopTyres, "Keyword Research", "Compile core keyword list", "done", "high"),
    task(oneStopTyres, "On-Page SEO", "Optimize title tags & meta descriptions", "done", "high"),
    task(oneStopTyres, "On-Page SEO", "Add internal linking to category pages", "in_progress", "high", "today"),
    task(oneStopTyres, "On-Page SEO", "Optimize image alt text site-wide", "todo", "medium"),
    task(oneStopTyres, "Technical SEO", "Fix duplicate title tags", "done", "high"),
    task(oneStopTyres, "Technical SEO", "Submit updated sitemap to Search Console", "todo", "medium", "today"),
    task(oneStopTyres, "Technical SEO", "Improve Core Web Vitals (LCP)", "todo", "high"),
    task(oneStopTyres, "Backlinks", "Outreach to 10 local directories", "done", "medium"),
    task(oneStopTyres, "Backlinks", "Guest post on tyre industry blog", "in_progress", "medium"),
    task(oneStopTyres, "Backlinks", "Follow up with 5 pending link partners", "todo", "low", "today"),
    task(oneStopTyres, "Reporting", "Prepare monthly ranking report", "todo", "medium"),

    task(brightWebRedesign, "Discovery", "Client kickoff call & requirements doc", "done", "high"),
    task(brightWebRedesign, "Design / Wireframes", "Homepage + booking flow wireframes", "done", "high"),
    task(brightWebRedesign, "Design / Wireframes", "Get sign-off on final UI design", "in_progress", "high", "today"),
    task(brightWebRedesign, "Frontend Development", "Build homepage in Next.js", "todo", "high"),
    task(brightWebRedesign, "Frontend Development", "Build booking form component", "todo", "medium"),
    task(brightWebRedesign, "Backend Development", "Set up booking API + email notifications", "todo", "medium"),
    task(brightWebRedesign, "Testing & QA", "Cross-browser & mobile testing", "todo", "low"),
    task(brightWebRedesign, "Deployment", "Deploy to production & connect domain", "todo", "medium"),

    task(summerCampaign, "Strategy", "Define target audience & offer", "done", "high"),
    task(summerCampaign, "Ad Campaign Setup", "Build Meta ad sets", "in_progress", "high", "today"),
    task(summerCampaign, "Content Creation", "Design 6 ad creatives", "todo", "medium"),
    task(summerCampaign, "Email Marketing", "Draft launch email sequence", "todo", "medium"),
    task(summerCampaign, "Analytics & Reporting", "Set up conversion tracking", "todo", "high"),
  ];

  return { projects, tasks };
}

const db = seed();

function touch(project: Project) {
  project.updatedAt = now();
}

export async function getProjects(): Promise<Project[]> {
  return [...db.projects].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getProject(id: string): Promise<Project | null> {
  return db.projects.find((p) => p.id === id) ?? null;
}

export async function createProject(input: {
  name: string;
  client: string;
  type: ProjectType;
  description: string;
  color: string;
}): Promise<Project> {
  const stages = makeStages(PROJECT_TEMPLATES[input.type].stages);
  const t = now();
  const project: Project = {
    id: nanoid(8),
    name: input.name,
    client: input.client,
    type: input.type,
    description: input.description,
    color: input.color,
    archived: false,
    createdAt: t,
    updatedAt: t,
    stages,
  };
  db.projects.unshift(project);
  return project;
}

export async function archiveProject(id: string, archived: boolean): Promise<void> {
  const project = await getProject(id);
  if (!project) return;
  project.archived = archived;
  touch(project);
}

export async function addStage(projectId: string, name: string): Promise<Stage | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const stage: Stage = { id: nanoid(8), name, order: project.stages.length };
  project.stages.push(stage);
  touch(project);
  return stage;
}

export async function getTasks(): Promise<Task[]> {
  return [...db.tasks];
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  return db.tasks
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

export async function getOpenTasks(): Promise<Task[]> {
  return db.tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const rank = (s: TaskStatus) => (s === "in_progress" ? 0 : 1);
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      const pr = { high: 0, medium: 1, low: 2 } as const;
      if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
}

export async function getTodayTasks(): Promise<Task[]> {
  const open = await getOpenTasks();
  return open.filter((t) => t.scheduledFor === "today");
}

export async function getCompletedTasks(): Promise<Task[]> {
  return db.tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1));
}

export async function createTask(input: {
  projectId: string;
  stageId: string | null;
  title: string;
  notes?: string;
  priority?: TaskPriority;
  scheduledFor?: "today" | null;
}): Promise<Task> {
  const t = now();
  const siblingCount = db.tasks.filter((x) => x.projectId === input.projectId).length;
  const task: Task = {
    id: nanoid(8),
    projectId: input.projectId,
    stageId: input.stageId,
    title: input.title,
    notes: input.notes ?? "",
    status: "todo",
    priority: input.priority ?? "medium",
    dueDate: null,
    scheduledFor: input.scheduledFor ?? null,
    createdAt: t,
    updatedAt: t,
    completedAt: null,
    order: siblingCount,
  };
  db.tasks.push(task);
  const project = await getProject(input.projectId);
  if (project) touch(project);
  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.status = status;
  task.updatedAt = now();
  task.completedAt = status === "done" ? now() : null;
  if (status === "done") task.scheduledFor = null;
  const project = await getProject(task.projectId);
  if (project) touch(project);
}

export async function toggleToday(taskId: string): Promise<void> {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.scheduledFor = task.scheduledFor === "today" ? null : "today";
  task.updatedAt = now();
}

export async function deleteTask(taskId: string): Promise<void> {
  const idx = db.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return;
  db.tasks.splice(idx, 1);
}

export async function getProjectProgress(projectId: string): Promise<{ done: number; total: number }> {
  const tasks = await getTasksByProject(projectId);
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total: tasks.length };
}
