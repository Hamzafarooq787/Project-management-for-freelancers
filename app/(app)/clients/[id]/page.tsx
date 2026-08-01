import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getClient, getProjectProgressMap, getProjectsForClient } from "@/lib/store";
import { ClientDetailPanel } from "@/components/ClientDetailPanel";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const client = await getClient(params.id);
  if (!client) notFound();

  const [projects, progress] = await Promise.all([
    getProjectsForClient(client.id),
    getProjectProgressMap(),
  ]);

  return <ClientDetailPanel client={client} projects={projects} progress={progress} />;
}
