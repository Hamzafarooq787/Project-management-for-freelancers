import { Leaf } from "lucide-react";
import { RefreshButton } from "./RefreshButton";

export function MobileTopBar() {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-base-700/60 bg-base-900/95 px-4 pt-[env(safe-area-inset-top)] py-3 backdrop-blur">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
        <Leaf size={17} />
      </span>
      <span className="text-sm font-semibold tracking-wide text-neutral-100">Freelance HQ</span>
      <RefreshButton className="ml-auto" />
    </header>
  );
}
