import Link from "next/link";
import { Plus } from "lucide-react";
import { getProjects } from "@/lib/store";
import { ProjectCard } from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">SEO, web development and marketing, all in one list.</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 shadow-glow"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Archived</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
            {archived.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
