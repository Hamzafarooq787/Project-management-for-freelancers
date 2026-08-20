import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getProjectsForProfile, listNotes, listTeamMembers } from "@/lib/store";
import { NotesPanel } from "@/components/NotesPanel";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const isAdmin = profile.role === "admin";
  const [notes, projects, members] = await Promise.all([
    listNotes(profile.id, isAdmin),
    getProjectsForProfile(profile),
    isAdmin ? listTeamMembers() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Notes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A shared docs space for the team — write articles, tables, and plans right here instead of a separate
          doc tool. Pin the important ones to the dashboard.
        </p>
      </div>

      <NotesPanel notes={notes} projects={projects} members={members} currentUserId={profile.id} isAdmin={isAdmin} />
    </div>
  );
}
