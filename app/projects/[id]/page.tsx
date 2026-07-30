import { notFound } from "next/navigation";
import { getBusinessProfile, getProject, getProjectProgress, getTasksByProject } from "@/lib/store";
import { ProgressBar } from "@/components/ProgressBar";
import { StageBoard } from "@/components/StageBoard";
import { SeoStageTabs } from "@/components/SeoStageTabs";
import { TaskRow } from "@/components/TaskRow";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { ClientDetailsCard } from "@/components/ClientDetailsCard";
import { ProjectMetaCard } from "@/components/ProjectMetaCard";
import { WebsiteDetailsCard } from "@/components/WebsiteDetailsCard";
import { DailyReportPanel } from "@/components/DailyReportPanel";
import { PROJECT_THEME } from "@/lib/projectTheme";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const [tasks, progress, businessProfile] = await Promise.all([
    getTasksByProject(project.id),
    getProjectProgress(project.id),
    getBusinessProfile(),
  ]);

  const completed = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1));

  const stageName = (stageId: string | null) =>
    project.stages.find((s) => s.id === stageId)?.name ?? null;

  const theme = PROJECT_THEME[project.type];
  const Icon = theme.icon;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.iconBg} ${theme.iconText}`}>
              <Icon size={18} />
            </span>
            <h1 className="text-2xl font-semibold text-neutral-50">{project.name}</h1>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${theme.iconBg} ${theme.iconText}`}>
              {theme.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <ArchiveToggle projectId={project.id} archived={project.archived} />
          <div className="w-48">
            <ProgressBar done={progress.done} total={progress.total} color={theme.accent} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientDetailsCard projectId={project.id} client={project.clientDetails} />
        <ProjectMetaCard
          projectId={project.id}
          description={project.description}
          startDate={project.startDate}
          endDate={project.endDate}
          websiteUrl={project.websiteUrl}
          showWebsiteUrl={project.type !== "web_dev"}
        />
      </div>

      {project.type === "web_dev" && (
        <WebsiteDetailsCard
          projectId={project.id}
          web={
            project.webDetails ?? {
              websiteName: "",
              websiteUrl: project.websiteUrl,
              domainStatus: "pending",
              logoUrl: "",
              siteIconUrl: "",
              openGraphImageUrl: "",
              servicesDetails: "",
              hostingDetails: "",
              contactDetails: "",
              notes: "",
            }
          }
        />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          {project.type === "seo" ? "SEO Checklist" : "Stages & Tasks"}
        </h2>
        {project.type === "seo" ? (
          <SeoStageTabs project={project} tasks={tasks} />
        ) : (
          <StageBoard project={project} tasks={tasks} />
        )}
      </section>

      {project.type === "seo" && (
        <section>
          <DailyReportPanel project={project} tasks={tasks} businessProfile={businessProfile} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Completed ({completed.length})
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {completed.length === 0 && (
            <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
              No completed tasks yet.
            </p>
          )}
          {completed.map((task) => (
            <TaskRow key={task.id} task={task} stageName={stageName(task.stageId)} stages={project.stages} />
          ))}
        </div>
      </section>
    </div>
  );
}
