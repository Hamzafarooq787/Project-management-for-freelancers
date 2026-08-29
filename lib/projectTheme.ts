import { Search, Globe, AppWindow, Megaphone, Layers, type LucideIcon } from "lucide-react";
import type { ProjectType } from "./types";

export interface ProjectTheme {
  icon: LucideIcon;
  label: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  iconBg: string;
  iconText: string;
  ring: string;
}

export const PROJECT_THEME: Record<ProjectType, ProjectTheme> = {
  seo: {
    icon: Search,
    label: "SEO",
    accent: "#33d485",
    cardBg: "bg-gradient-to-br from-accent-900/30 via-base-850 to-base-850",
    cardBorder: "border-accent-700/40 hover:border-accent-500/60",
    iconBg: "bg-accent-500/15",
    iconText: "text-accent-400",
    ring: "ring-accent-500/30",
  },
  web_dev: {
    icon: Globe,
    label: "Web Development",
    accent: "#4fc3e0",
    cardBg: "bg-gradient-to-br from-sky-500/10 via-base-850 to-base-850",
    cardBorder: "border-sky-700/40 hover:border-sky-400/60",
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-400",
    ring: "ring-sky-500/30",
  },
  web_app: {
    icon: AppWindow,
    label: "Web Application",
    accent: "#818cf8",
    cardBg: "bg-gradient-to-br from-indigo-500/10 via-base-850 to-base-850",
    cardBorder: "border-indigo-700/40 hover:border-indigo-400/60",
    iconBg: "bg-indigo-500/15",
    iconText: "text-indigo-400",
    ring: "ring-indigo-500/30",
  },
  digital_marketing: {
    icon: Megaphone,
    label: "Digital Marketing",
    accent: "#f2b84b",
    cardBg: "bg-gradient-to-br from-amber-500/10 via-base-850 to-base-850",
    cardBorder: "border-amber-700/40 hover:border-amber-400/60",
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-400",
    ring: "ring-amber-500/30",
  },
  other: {
    icon: Layers,
    label: "Other",
    accent: "#a78bfa",
    cardBg: "bg-gradient-to-br from-base-700/20 via-base-850 to-base-850",
    cardBorder: "border-base-600/60 hover:border-neutral-400/40",
    iconBg: "bg-base-700/40",
    iconText: "text-neutral-300",
    ring: "ring-neutral-500/30",
  },
};

export function formatTimeframe(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "No timeframe set";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `Started ${fmt(startDate)}`;
  return `Due ${fmt(endDate as string)}`;
}
