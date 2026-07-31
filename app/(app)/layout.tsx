import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { getCurrentProfile } from "@/lib/auth";
import { getProjectsForProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const projects = profile ? await getProjectsForProfile(profile) : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar projects={projects} profile={profile} />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <MobileNav profile={profile} />
    </div>
  );
}
