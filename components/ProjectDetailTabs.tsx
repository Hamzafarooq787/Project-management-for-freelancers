"use client";

import { useState, type ReactNode } from "react";
import { ListTodo, User } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "board" | "client";

const TABS: { key: TabKey; label: string; icon: typeof ListTodo }[] = [
  { key: "board", label: "Stages & Tasks", icon: ListTodo },
  { key: "client", label: "Client Details", icon: User },
];

export function ProjectDetailTabs({
  board,
  clientDetails,
}: {
  board: ReactNode;
  clientDetails: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("board");
  const content = { board, client: clientDetails } as const;

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
