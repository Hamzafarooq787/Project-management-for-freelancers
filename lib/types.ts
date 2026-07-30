export type ProjectType = "seo" | "web_dev" | "digital_marketing" | "other";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type DomainStatus = "purchased" | "pending" | "not_required";

export interface Stage {
  id: string;
  name: string;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  stageId: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  scheduledFor: string | null;
  checklist: ChecklistItem[];
  images: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  order: number;
}

export interface ClientDetails {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  logoUrl: string;
}

export interface BusinessProfile {
  companyName: string;
  logoUrl: string;
}

export interface WebDevDetails {
  websiteName: string;
  websiteUrl: string;
  domainStatus: DomainStatus;
  logoUrl: string;
  siteIconUrl: string;
  openGraphImageUrl: string;
  servicesDetails: string;
  hostingDetails: string;
  contactDetails: string;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  clientDetails: ClientDetails;
  type: ProjectType;
  description: string;
  color: string;
  archived: boolean;
  startDate: string | null;
  endDate: string | null;
  websiteUrl: string;
  webDetails: WebDevDetails | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  stages: Stage[];
}

export interface ProjectTemplate {
  type: ProjectType;
  label: string;
  description: string;
  stages: string[];
}
