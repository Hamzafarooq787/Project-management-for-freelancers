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

export interface TaskFile {
  url: string;
  name: string;
  type: string;
  size: number;
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
  files: TaskFile[];
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

/** A reusable client record, picked when creating a project instead of retyping contact details each time. */
export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  logoUrl: string;
  createdAt: string;
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
  clientId: string | null;
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

export type Role = "admin" | "member";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export type PaymentPlanType = "monthly_fixed" | "one_time";

export interface PaymentPlan {
  id: string;
  projectId: string;
  planType: PaymentPlanType;
  amount: number;
  currency: string;
  notes: string;
}

export type PaymentKind = "monthly" | "additional" | "installment";

export interface Payment {
  id: string;
  /** Null once the project it was recorded against has been deleted with its payment history kept. */
  projectId: string | null;
  amount: number;
  currency: string;
  kind: PaymentKind;
  period: string | null;
  note: string;
  paidOn: string;
  createdAt: string;
}

export interface ProjectTemplate {
  type: ProjectType;
  label: string;
  description: string;
  stages: string[];
}

export type KeywordStatus = "not_started" | "in_progress" | "ranking" | "achieved";

export interface Keyword {
  id: string;
  projectId: string;
  keyword: string;
  targetPage: string;
  searchVolume: number | null;
  difficulty: number | null;
  currentRank: number | null;
  targetRank: number | null;
  status: KeywordStatus;
  notes: string;
  isTracked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordRankHistoryEntry {
  id: string;
  keywordId: string;
  rank: number | null;
  recordedOn: string;
}

/** One manually-entered rank for a tracked keyword in a given calendar month ('YYYY-MM'). */
export interface KeywordMonthlyPosition {
  id: string;
  keywordId: string;
  month: string;
  rank: number | null;
}
