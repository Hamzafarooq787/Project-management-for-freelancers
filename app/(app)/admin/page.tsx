import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getAssignedProjectIds, getProjects, listTeamMembers } from "@/lib/store";
import { AdminTeamPanel } from "@/components/AdminTeamPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") notFound();

  const [members, projects] = await Promise.all([listTeamMembers(), getProjects()]);
  const assignmentsByMember = new Map<string, string[]>();
  for (const member of members) {
    if (member.role === "admin") continue;
    assignmentsByMember.set(member.id, await getAssignedProjectIds(member.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Admin</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Invite team members and control which projects each of them can see and work on.
        </p>
      </div>

      <AdminTeamPanel
        currentUserId={currentProfile.id}
        members={members}
        projects={projects}
        assignmentsByMember={Object.fromEntries(assignmentsByMember)}
      />
    </div>
  );
}
