"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProjectAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function DeleteProjectPanel({ projectId }: { projectId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [keepFinancialData, setKeepFinancialData] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteProjectAction(projectId, keepFinancialData);
        if (result && !result.ok) setError(result.error);
      } catch {
        // redirect() on success throws internally to trigger navigation — that's
        // expected and not an error. Any other failure already came back above
        // as a typed result, so there's nothing left to surface here.
      }
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 rounded-lg border border-base-600 px-3 py-1.5 text-xs text-neutral-400 hover:border-rose-500/50 hover:text-rose-400"
      >
        <Trash2 size={14} />
        Delete
      </button>
    );
  }

  return (
    <div className="flex w-72 flex-col gap-3 rounded-lg border border-rose-700/50 bg-rose-500/5 p-3 text-right">
      <p className="text-left text-xs text-rose-300">
        This permanently deletes the project, its tasks, and its board. This can&apos;t be undone.
      </p>
      <label className="flex items-start gap-2 text-left text-xs text-neutral-300">
        <input
          type="checkbox"
          checked={keepFinancialData}
          onChange={(e) => setKeepFinancialData(e.target.checked)}
          className="mt-0.5 accent-accent-500"
        />
        Keep its payment history (pricing plans still go with the project, but money already recorded as
        received stays counted in Finance totals)
      </label>
      {error && <p className="text-left text-xs text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          disabled={isPending}
          onClick={() => setConfirming(false)}
          className="rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:text-neutral-100 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          disabled={isPending}
          onClick={confirmDelete}
          className={cn(
            "rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-60",
          )}
        >
          {isPending ? "Deleting…" : "Confirm delete"}
        </button>
      </div>
    </div>
  );
}
