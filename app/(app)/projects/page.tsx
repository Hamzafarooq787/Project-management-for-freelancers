import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getProjectProgressMap, getProjectsForProfile } from "@/lib/store";
import { ProjectTypeTabs } from "@/components/ProjectTypeTabs";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const profile = await getCurrentProfile();
  const [projects, progress] = await Promise.all([
    profile ? getProjectsForProfile(profile) : Promise.resolve([]),
    getProjectProgressMap(),
  ]);
  const active = projects.filter((p) => !p.archived);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">SEO and web development, kept in their own lanes.</p>
        </div>
        {profile?.role === "admin" && (
          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 shadow-glow"
          >
            <Plus size={16} />
            New Project
          </Link>
        )}
      </div>

      <ProjectTypeTabs projects={active} progress={progress} />
    </div>
  );
}
