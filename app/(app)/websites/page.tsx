import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { listDomainClients, listDomains, listWebsites } from "@/lib/store";
import { WebsitesPanel } from "@/components/WebsitesPanel";

export const dynamic = "force-dynamic";

export default async function WebsitesPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const [websites, domains, domainClients] = await Promise.all([listWebsites(), listDomains(), listDomainClients()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Websites</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Client websites you built, attached to a domain in your inventory. Manage contact info, service-area
          cities, and Google Tag Manager/GA/Pixel scripts here — the live site pulls it all at runtime through a
          secret-keyed API, no redeploy needed.
        </p>
      </div>

      <WebsitesPanel websites={websites} domains={domains} domainClients={domainClients} />
    </div>
  );
}
