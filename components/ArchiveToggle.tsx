"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { archiveProjectAction } from "@/lib/actions";

export function ArchiveToggle({ projectId, archived }: { projectId: string; archived: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => archiveProjectAction(projectId, !archived))}
      className="flex items-center gap-2 rounded-lg border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
    >
      {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
      {archived ? "Unarchive" : "Archive"}
    </button>
  );
}
