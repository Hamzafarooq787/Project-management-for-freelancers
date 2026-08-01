import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { listClients } from "@/lib/store";
import { ClientsPanel } from "@/components/ClientsPanel";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const clients = await listClients();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Clients</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Add clients once, then pick them from a dropdown when creating a new project.
        </p>
      </div>

      <ClientsPanel clients={clients} />
    </div>
  );
}
