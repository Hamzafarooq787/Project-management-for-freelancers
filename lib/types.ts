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
  pageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const KEYWORD_GROUP_COLORS = ["accent", "sky", "amber", "rose", "violet", "neutral"] as const;
export type KeywordGroupColor = (typeof KEYWORD_GROUP_COLORS)[number];

/** A named topic/silo that organizes a project's keywords into Pages. */
export interface KeywordGroup {
  id: string;
  projectId: string;
  name: string;
  color: KeywordGroupColor;
  order: number;
  createdAt: string;
}

/** A page within a Group that one or more keywords can target. */
export interface KeywordPage {
  id: string;
  groupId: string;
  name: string;
  url: string;
  order: number;
  createdAt: string;
}

/** A named grouping of backlink entries within a project (e.g. "Guest Posting"). */
export interface BacklinkCategory {
  id: string;
  projectId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface BacklinkLink {
  url: string;
  label: string;
}

/** A platform/site login and posting record. `hasPassword` never carries the actual value. */
export interface BacklinkEntry {
  id: string;
  categoryId: string;
  projectId: string;
  name: string;
  url: string;
  username: string;
  email: string;
  hasPassword: boolean;
  postsPerMonth: number | null;
  notes: string;
  links: BacklinkLink[];
  createdAt: string;
  updatedAt: string;
}

/** A file attached to a project as a whole (not tied to a single task). */
export interface ProjectAttachment {
  id: string;
  projectId: string;
  url: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
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

/**
 * Domain reselling. A standalone inventory of domains held for resale — separate
 * from the project system's Clients. Domains can optionally be assigned to a
 * DomainClient and can be synced against a Dynadot reseller account.
 */
export type ResaleDomainStatus = "available" | "reserved" | "sold";

export interface DomainClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV";

export interface DomainDnsRecord {
  id: string;
  domainId: string;
  recordType: DnsRecordType;
  host: string;
  value: string;
  priority: number | null;
  ttl: number | null;
}

export interface Domain {
  id: string;
  name: string;
  domainClientId: string | null;
  registrar: string;
  status: ResaleDomainStatus;
  purchasePrice: number | null;
  sellingPrice: number | null;
  expiryDate: string | null;
  autoRenew: boolean;
  locked: boolean;
  nameservers: string[];
  notes: string;
  dynadotSyncedAt: string | null;
  createdAt: string;
}

/** Server-internal shape (store.ts / lib/dynadot.ts only) — never pass to a client component. */
export interface DomainSettings {
  dynadotApiKeyEncrypted: string | null;
}

/** Client-safe view of DomainSettings — never carries the encrypted key. */
export interface DomainSettingsView {
  hasDynadotApiKey: boolean;
}
