import Link from "next/link";
import { ListTodo, FolderKanban, Star, CheckCircle2, ArrowRight, Plus, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import {
  getCompletedTasks,
  getOpenTasks,
  getProjectProgressMap,
  getProjectsForProfile,
  getTasksScheduledOn,
  listAllPayments,
  listPaymentPlans,
  todayDateKey,
} from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { TaskRow } from "@/components/TaskRow";
import { ProjectTypeTabs } from "@/components/ProjectTypeTabs";
import type { ProjectPaymentSummary } from "@/components/ProjectCardClient";
import { currentMonthKey, formatGroupedMoney, groupByCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const [allOpenTasks, projects, allTodayTasks, allCompletedTasks, progress, plans, payments] = await Promise.all([
    getOpenTasks(),
    profile ? getProjectsForProfile(profile) : Promise.resolve([]),
    getTasksScheduledOn(todayDateKey()),
    getCompletedTasks(),
    getProjectProgressMap(),
    isAdmin ? listPaymentPlans() : Promise.resolve([]),
    isAdmin ? listAllPayments() : Promise.resolve([]),
  ]);

  const visibleIds = new Set(projects.map((p) => p.id));
  const openTasks = allOpenTasks.filter((t) => visibleIds.has(t.projectId));
  const todayTasks = allTodayTasks.filter((t) => visibleIds.has(t.projectId));
  const completedTasks = allCompletedTasks.filter((t) => visibleIds.has(t.projectId));

  const activeProjects = projects.filter((p) => !p.archived);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const stageNameById = (projectId: string, stageId: string | null) => {
    if (!stageId) return null;
    return projectById.get(projectId)?.stages.find((s) => s.id === stageId)?.name ?? null;
  };

  const paymentsByProject = new Map<string, typeof payments>();
  for (const payment of payments) {
    const list = paymentsByProject.get(payment.projectId) ?? [];
    list.push(payment);
    paymentsByProject.set(payment.projectId, list);
  }

  const thisMonth = currentMonthKey();
  const paymentByProject: Record<string, ProjectPaymentSummary> = {};
  for (const plan of plans) {
    const projectPayments = paymentsByProject.get(plan.projectId) ?? [];
    const received =
      plan.planType === "monthly_fixed"
        ? projectPayments.filter((p) => p.kind === "monthly" && p.period === thisMonth).reduce((sum, p) => sum + p.amount, 0)
        : projectPayments.reduce((sum, p) => sum + p.amount, 0);
    paymentByProject[plan.projectId] = { currency: plan.currency, received, pending: Math.max(0, plan.amount - received) };
  }

  const collectedThisMonth = groupByCurrency(
    payments.filter((p) => p.kind === "monthly" && p.period === thisMonth),
    (p) => p.amount,
    (p) => p.currency,
  );
  const monthlyRecurring = groupByCurrency(
    plans.filter((p) => p.planType === "monthly_fixed"),
    (p) => p.amount,
    (p) => p.currency,
  );
  const outstandingSummaries = plans
    .filter((p) => p.planType === "one_time")
    .map((p) => paymentByProject[p.projectId])
    .filter((summary): summary is ProjectPaymentSummary => summary !== undefined);
  const outstanding = groupByCurrency(
    outstandingSummaries,
    (summary) => summary.pending,
    (summary) => summary.currency,
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
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
        <ProjectTypeTabs projects={activeProjects} progress={progress} paymentByProject={paymentByProject} />
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open tasks" value={openTasks.length} icon={ListTodo} tone="accent" />
        <StatCard label="Scheduled today" value={todayTasks.length} icon={Star} tone="amber" />
        <StatCard label="Active projects" value={activeProjects.length} icon={FolderKanban} tone="sky" />
        <StatCard label="Completed" value={completedTasks.length} icon={CheckCircle2} tone="accent" />
      </div>

      {isAdmin && plans.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Account Summary</h2>
            <Link href="/finance" className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300">
              Full finance view <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Collected this month" value={formatGroupedMoney(collectedThisMonth)} icon={Wallet} tone="accent" />
            <StatCard label="Monthly recurring" value={formatGroupedMoney(monthlyRecurring)} icon={TrendingUp} tone="amber" />
            <StatCard label="Outstanding (one-time)" value={formatGroupedMoney(outstanding)} icon={AlertCircle} tone="rose" />
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Open Tasks
          </h2>
          <Link href="/today" className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300">
            Plan today <ArrowRight size={12} />
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {openTasks.length === 0 && (
            <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
              Nothing open. You&apos;re fully caught up.
            </p>
          )}
          {openTasks.slice(0, 8).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              stageName={stageNameById(task.projectId, task.stageId)}
              stages={projectById.get(task.projectId)?.stages ?? []}
              showProject
              projectName={projectById.get(task.projectId)?.name}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
