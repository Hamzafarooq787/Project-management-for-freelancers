export type ProjectType = "seo" | "web_dev" | "digital_marketing" | "other";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "low" | "medium" | "high";

export interface Stage {
  id: string;
  name: string;
  order: number;
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
  scheduledFor: "today" | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  type: ProjectType;
  description: string;
  color: string;
  archived: boolean;
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
