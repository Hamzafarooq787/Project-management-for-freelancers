"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A hard page reload, not router.refresh() — this app is often installed as a
 * PWA/desktop window with no browser chrome, so there's otherwise no way to
 * force a fresh fetch of the latest deployed build (bypassing any stale
 * client-side router cache) without a keyboard shortcut the user may not know.
 */
export function RefreshButton({ className }: { className?: string }) {
  const [spinning, setSpinning] = useState(false);

  return (
    <button
      type="button"
      title="Refresh"
      onClick={() => {
        setSpinning(true);
        window.location.reload();
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-base-800 hover:text-accent-300",
        className,
      )}
    >
      <RotateCw size={15} className={spinning ? "animate-spin" : undefined} />
    </button>
  );
}
