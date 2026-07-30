import type { ProjectTemplate, ProjectType } from "./types";

export const PROJECT_TEMPLATES: Record<ProjectType, ProjectTemplate> = {
  seo: {
    type: "seo",
    label: "SEO",
    description: "Keyword research, on-page, technical SEO and link building.",
    stages: [
      "Keyword Research",
      "On-Page SEO",
      "Technical SEO",
      "Content Optimization",
      "Backlinks",
      "Local SEO",
      "Reporting",
    ],
  },
  web_dev: {
    type: "web_dev",
    label: "Web Development",
    description: "Design, build, test and ship a website or app.",
    stages: [
      "Discovery",
      "Design / Wireframes",
      "Frontend Development",
      "Backend Development",
      "Testing & QA",
      "Deployment",
      "Client Review",
      "Maintenance",
    ],
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
