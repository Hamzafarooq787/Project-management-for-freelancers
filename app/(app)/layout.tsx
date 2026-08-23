import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { MobileTopBar } from "@/components/MobileTopBar";
import { getCurrentProfile } from "@/lib/auth";
import { countUnseenNotes, countUnseenProjects, getProjectsForProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const [projects, unseenProjects, unseenNotes] = await Promise.all([
    profile ? getProjectsForProfile(profile) : Promise.resolve([]),
    profile ? countUnseenProjects(profile.id, isAdmin) : Promise.resolve(0),
    profile ? countUnseenNotes(profile.id) : Promise.resolve(0),
  ]);

  return (
    <div className="flex min-h-screen md:h-screen md:overflow-hidden">
      <Sidebar projects={projects} profile={profile} unseenProjects={unseenProjects} unseenNotes={unseenNotes} />
      <div className="flex-1 md:h-screen md:overflow-y-auto">
        <MobileTopBar />
        <main className="pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
      <MobileNav profile={profile} unseenProjects={unseenProjects} unseenNotes={unseenNotes} />
    </div>
  );
}
