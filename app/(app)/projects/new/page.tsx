import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewProjectForm } from "@/components/NewProjectForm";
import { getCurrentProfile } from "@/lib/auth";
import { listClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const clients = await listClients();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/projects" className="mb-4 flex w-fit items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300">
        <ArrowLeft size={13} />
        Back
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-50">New Project</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick a project type and we&apos;ll pre-fill the stages for you. You can add or rename
        stages any time from the project page.
      </p>
      <NewProjectForm clients={clients} />
    </div>
  );
}
