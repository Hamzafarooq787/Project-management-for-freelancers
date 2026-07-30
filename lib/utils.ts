import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  seo: "SEO",
  web_dev: "Web Development",
  digital_marketing: "Digital Marketing",
  other: "Other",
};
