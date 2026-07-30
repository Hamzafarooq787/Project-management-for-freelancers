"use client";

import { useState, type ReactNode } from "react";
import { LayoutGrid, ListTodo, FileBarChart } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "board" | "reports";

const TABS: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "board", label: "Stages & Tasks", icon: ListTodo },
  { key: "reports", label: "Reports", icon: FileBarChart },
];

export function ProjectDetailTabs({
  overview,
  board,
  reports,
}: {
  overview: ReactNode;
  board: ReactNode;
  reports: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("overview");
  const content = { overview, board, reports } as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2 border-b border-base-700/60 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-500/15 text-accent-300 shadow-glow"
                  : "text-neutral-400 hover:bg-base-800 hover:text-neutral-200",
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {content[active]}
    </div>
  );
}
