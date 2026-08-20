import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getNote, getProjectsForProfile, listTeamMembers } from "@/lib/store";
import { NoteEditor } from "@/components/NoteEditor";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const note = await getNote(params.id);
  if (!note) notFound();

  const isAdmin = profile.role === "admin";
  const canView = isAdmin || note.authorId === profile.id || note.assignedToUserId === profile.id;
  if (!canView) notFound();

  const canEdit = isAdmin || note.authorId === profile.id || (note.assignedToUserId === profile.id && note.editableByAssignee);

  const [projects, members] = await Promise.all([
    getProjectsForProfile(profile),
    isAdmin ? listTeamMembers() : Promise.resolve([]),
  ]);

  return <NoteEditor note={note} projects={projects} members={members} isAdmin={isAdmin} canEdit={canEdit} currentUserId={profile.id} />;
}
