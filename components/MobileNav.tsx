import Link from "next/link";
import { LayoutDashboard, ListChecks, FolderKanban, Settings, Plus } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/projects/new", label: "New", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-base-700/60 bg-base-900/95 backdrop-blur px-2 py-2">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] text-neutral-400 hover:text-accent-300"
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
