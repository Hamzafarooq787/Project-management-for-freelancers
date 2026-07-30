import { nanoid } from "nanoid";
import type {
  ClientDetails,
  Project,
  ProjectType,
  Stage,
  Task,
  TaskPriority,
  TaskStatus,
  WebDevDetails,
} from "./types";
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

function emptyClientDetails(): ClientDetails {
  return { name: "", company: "", email: "", phone: "", notes: "" };
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

function seed(): { projects: Project[]; tasks: Task[] } {
  const seoStages = makeStages(PROJECT_TEMPLATES.seo.stages);
  const webStages = makeStages(PROJECT_TEMPLATES.web_dev.stages);
  const dmStages = makeStages(PROJECT_TEMPLATES.digital_marketing.stages);

  const t = now();

  const oneStopTyres: Project = {
    id: nanoid(8),
    name: "One Stop Tyres",
    client: "One Stop Tyres Ltd",
    clientDetails: {
      name: "James Carter",
      company: "One Stop Tyres Ltd",
      email: "james@onestoptyres.co.uk",
      phone: "+44 7700 900123",
      notes: "Prefers weekly ranking updates over email.",
    },
    type: "seo",
    description: "Full SEO overhaul: on-page, technical SEO and off-page link building.",
    color: "#33d485",
    archived: false,
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    websiteUrl: "https://www.onestoptyres.co.uk",
    webDetails: null,
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
    clientDetails: {
      name: "Alicia Bright",
      company: "Bright & Co",
      email: "alicia@brightandco.com",
      phone: "+1 415 555 0148",
      notes: "Wants a staging link before every milestone review.",
    },
    type: "web_dev",
    description: "Rebuild the marketing site on Next.js with a booking flow.",
    color: "#4fc3e0",
    archived: false,
    startDate: "2026-07-01",
    endDate: "2026-08-20",
    websiteUrl: "https://www.brightandco.com",
    webDetails: {
      websiteName: "Bright & Co",
      websiteUrl: "https://www.brightandco.com",
      domainStatus: "purchased",
      logoUrl: "https://www.brightandco.com/logo.svg",
      siteIconUrl: "https://www.brightandco.com/favicon.ico",
      openGraphImageUrl: "https://www.brightandco.com/og-cover.png",
      servicesDetails: "Marketing site + online booking flow + payment integration.",
      hostingDetails: "Vercel (Pro plan), domain via Namecheap.",
      contactDetails: "Alicia Bright — alicia@brightandco.com — +1 415 555 0148",
      notes: "Client owns the domain already; we manage hosting and deploys.",
    },
    createdAt: t,
    updatedAt: t,
    stages: webStages,
  };

  const summerCampaign: Project = {
    id: nanoid(8),
    name: "Summer Sale Campaign",
    client: "Urban Fit Apparel",
    clientDetails: {
      name: "Priya Nair",
      company: "Urban Fit Apparel",
      email: "priya@urbanfitapparel.com",
      phone: "+1 212 555 0199",
      notes: "",
    },
    type: "digital_marketing",
    description: "Paid social + email push for the summer collection launch.",
    color: "#f2b84b",
    archived: false,
    startDate: "2026-07-10",
    endDate: "2026-08-10",
    websiteUrl: "https://www.urbanfitapparel.com",
    webDetails: null,
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
    task(oneStopTyres, "On-Page SEO", "Compile core keyword list", "done", "high"),
    task(oneStopTyres, "On-Page SEO", "Optimize title tags & meta descriptions", "done", "high"),
    task(oneStopTyres, "On-Page SEO", "Add internal linking to category pages", "in_progress", "high", "today"),
    task(oneStopTyres, "On-Page SEO", "Optimize image alt text site-wide", "todo", "medium"),
    task(oneStopTyres, "Technical SEO", "Fix duplicate title tags", "done", "high"),
    task(oneStopTyres, "Technical SEO", "Submit updated sitemap to Search Console", "todo", "medium", "today"),
    task(oneStopTyres, "Technical SEO", "Improve Core Web Vitals (LCP)", "todo", "high"),
    task(oneStopTyres, "Off-Page SEO", "Outreach to 10 local directories", "done", "medium"),
    task(oneStopTyres, "Off-Page SEO", "Guest post on tyre industry blog", "in_progress", "medium"),
    task(oneStopTyres, "Off-Page SEO", "Follow up with 5 pending link partners", "todo", "low", "today"),
    task(oneStopTyres, "Social Media", "Post monthly tyre-care tips on Facebook", "todo", "low"),
    task(oneStopTyres, "Google Business Profile", "Update opening hours & add new photos", "todo", "medium"),
    task(oneStopTyres, "Google Business Profile", "Respond to 3 pending customer reviews", "in_progress", "medium", "today"),

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

export async function getProjectsByType(type: ProjectType): Promise<Project[]> {
  const all = await getProjects();
  return all.filter((p) => p.type === type);
}

export async function getProject(id: string): Promise<Project | null> {
  return db.projects.find((p) => p.id === id) ?? null;
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
  const stages = makeStages(PROJECT_TEMPLATES[input.type].stages);
  const t = now();
  const project: Project = {
    id: nanoid(8),
    name: input.name,
    client: input.clientDetails.company || input.clientDetails.name,
    clientDetails: input.clientDetails,
    type: input.type,
    description: input.description,
    color: input.color,
    archived: false,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    websiteUrl: input.websiteUrl ?? "",
    webDetails:
      input.type === "web_dev"
        ? { ...emptyWebDetails(), ...(input.webDetails ?? {}) }
        : null,
    createdAt: t,
    updatedAt: t,
    stages,
  };
  db.projects.unshift(project);
  return project;
}

export async function updateProjectDetails(
  id: string,
  patch: Partial<
    Pick<Project, "description" | "startDate" | "endDate" | "websiteUrl" | "clientDetails" | "webDetails">
  >,
): Promise<void> {
  const project = await getProject(id);
  if (!project) return;
  Object.assign(project, patch);
  touch(project);
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
