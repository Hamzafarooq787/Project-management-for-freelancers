import { getCurrentProfile } from "@/lib/auth";
import { getProjectProgressMap, getProjectsForProfile } from "@/lib/store";
import { ProjectTypeTabs } from "@/components/ProjectTypeTabs";

export const dynamic = "force-dynamic";

export default async function ClosedProjectsPage() {
  const profile = await getCurrentProfile();
  const [projects, progress] = await Promise.all([
    profile ? getProjectsForProfile(profile) : Promise.resolve([]),
    getProjectProgressMap(),
  ]);
  const closed = projects.filter((p) => p.archived);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Closed Projects</h1>
        <p className="mt-1 text-sm text-neutral-500">
          SEO, web development, and other projects you&rsquo;ve closed or marked complete. Reopen one from its
          detail page to bring it back to the active list.
        </p>
      </div>

      <ProjectTypeTabs projects={closed} progress={progress} />
    </div>
  );
}
