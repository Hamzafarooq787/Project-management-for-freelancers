"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Project, ProjectType } from "@/lib/types";
import { PROJECT_THEME } from "@/lib/projectTheme";
import { cn } from "@/lib/utils";

const TYPES: ProjectType[] = ["seo", "web_dev", "digital_marketing", "other"];

export function SidebarProjectGroups({ projects }: { projects: Project[] }) {
  const [openType, setOpenType] = useState<ProjectType | null>("seo");

  const active = projects.filter((p) => !p.archived);
  const groups = TYPES.map((type) => ({
    type,
    theme: PROJECT_THEME[type],
    items: active.filter((p) => p.type === type),
  })).filter((g) => g.items.length > 0 || g.type === "seo" || g.type === "web_dev");

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => {
        const Icon = group.theme.icon;
        const isOpen = openType === group.type;
        return (
          <div key={group.type}>
            <button
              onClick={() => setOpenType(isOpen ? null : group.type)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800"
            >
              <Icon size={15} className={group.theme.iconText} />
              <span className="flex-1 text-left">{group.theme.label}</span>
              <span className="text-[11px] text-neutral-500">{group.items.length}</span>
              <ChevronDown
                size={14}
                className={cn("text-neutral-500 transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div className="ml-6 flex flex-col gap-0.5 border-l border-base-700/60 py-1 pl-3">
                {group.items.length === 0 ? (
                  <span className="py-1 text-xs text-neutral-500">No projects yet</span>
                ) : (
                  group.items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="truncate rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-base-800 hover:text-accent-300"
                    >
                      {p.name}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
