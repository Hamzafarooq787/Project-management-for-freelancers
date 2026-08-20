import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getDomainSettings, listDomainClients, listDomains } from "@/lib/store";
import { DomainsPanel } from "@/components/DomainsPanel";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const [domains, domainClients, settings] = await Promise.all([
    listDomains(),
    listDomainClients(),
    getDomainSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Domains</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Your domain resale inventory — separate from client projects. Add domains manually or import your whole
          Dynadot portfolio in one click.
        </p>
      </div>

      <DomainsPanel domains={domains} domainClients={domainClients} hasDynadotApiKey={Boolean(settings.dynadotApiKeyEncrypted)} />
    </div>
  );
}
