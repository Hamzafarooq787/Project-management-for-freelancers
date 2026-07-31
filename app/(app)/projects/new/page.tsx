import { notFound } from "next/navigation";
import { NewProjectForm } from "@/components/NewProjectForm";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-neutral-50">New Project</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick a project type and we&apos;ll pre-fill the stages for you. You can add or rename
        stages any time from the project page.
      </p>
      <NewProjectForm />
    </div>
  );
}
