import Link from "next/link";
import { LayoutDashboard, ListChecks, FolderKanban, Archive, Settings, Plus, Leaf, LogOut, Shield, Wallet, Building2 } from "lucide-react";
import type { Profile, Project } from "@/lib/types";
import { SidebarProjectGroups } from "./SidebarProjectGroups";
import { InstallAppButton } from "./InstallAppButton";
import { logoutAction } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/projects/closed", label: "Closed Projects", icon: Archive },
];

export function Sidebar({ projects, profile }: { projects: Project[]; profile: Profile | null }) {
  const isAdmin = profile?.role === "admin";
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:overflow-y-auto border-r border-base-700/60 bg-base-900/60 backdrop-blur-sm px-4 py-6 gap-6">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
          <Leaf size={18} />
        </span>
        <span className="text-sm font-semibold tracking-wide text-neutral-100">
          Freelance HQ
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800 hover:text-accent-300 transition-colors"
          >
            <Icon size={17} className="text-neutral-500 group-hover:text-accent-400" />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <>
            <Link
              href="/clients"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800 hover:text-accent-300 transition-colors"
            >
              <Building2 size={17} className="text-neutral-500 group-hover:text-accent-400" />
              Clients
            </Link>
            <Link
              href="/finance"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800 hover:text-accent-300 transition-colors"
            >
              <Wallet size={17} className="text-neutral-500 group-hover:text-accent-400" />
              Finance
            </Link>
            <Link
              href="/settings"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800 hover:text-accent-300 transition-colors"
            >
              <Settings size={17} className="text-neutral-500 group-hover:text-accent-400" />
              Settings
            </Link>
            <Link
              href="/admin"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800 hover:text-accent-300 transition-colors"
            >
              <Shield size={17} className="text-neutral-500 group-hover:text-accent-400" />
              Admin
            </Link>
          </>
        )}
      </nav>

      {isAdmin && (
        <Link
          href="/projects/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 transition-colors shadow-glow"
        >
          <Plus size={16} />
          New Project
        </Link>
      )}

      <div>
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Your Projects
        </p>
        <SidebarProjectGroups projects={projects} />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-xl border border-base-700/60 bg-base-850 p-3 text-xs text-neutral-500">
          Set your company name and logo in Settings so client reports are properly
          branded.
        </div>
        <InstallAppButton />
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-400 hover:bg-base-800 hover:text-rose-400 transition-colors"
          >
            <LogOut size={17} />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
