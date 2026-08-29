import type { ProjectTemplate, ProjectType } from "./types";

export const PROJECT_TEMPLATES: Record<ProjectType, ProjectTemplate> = {
  seo: {
    type: "seo",
    label: "SEO",
    description: "On-page, technical, off-page, social and Google Business Profile management.",
    stages: ["On-Page SEO", "Technical SEO", "Off-Page SEO", "Social Media", "Google Business Profile"],
  },
  web_dev: {
    type: "web_dev",
    label: "Web Development",
    description: "Design, build, test and ship a website or app.",
    stages: ["Create Pages", "Services", "Contact Details", "Hosting Details"],
  },
  web_app: {
    type: "web_app",
    label: "Web Application",
    description: "Plan and build a custom web application, feature by feature.",
    stages: ["Planning", "Design", "Build", "Testing", "Launch"],
  },
  digital_marketing: {
    type: "digital_marketing",
    label: "Digital Marketing",
    description: "Campaigns, ads, social and content across channels.",
    stages: [
      "Strategy",
      "Ad Campaign Setup",
      "Content Creation",
      "Social Media",
      "Email Marketing",
      "Analytics & Reporting",
    ],
  },
  other: {
    type: "other",
    label: "Other / Custom",
    description: "A blank project you can shape however you like.",
    stages: ["To Do", "In Progress", "Review", "Done"],
  },
};

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "seo", label: "SEO" },
  { value: "web_dev", label: "Web Development" },
  { value: "web_app", label: "Web Application" },
  { value: "digital_marketing", label: "Digital Marketing" },
  { value: "other", label: "Other / Custom" },
];

export const PROJECT_COLORS = [
  "#33d485",
  "#4fc3e0",
  "#f2b84b",
  "#f2707a",
  "#a78bfa",
  "#5fe6a2",
];
