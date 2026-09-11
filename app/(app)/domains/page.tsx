import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getDomainSettings, listDomainClients, listDomains, listRenewals, listWebsitesByDomainIds } from "@/lib/store";
import { DomainsPanel } from "@/components/DomainsPanel";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && !profile.canAccessRenewals)) notFound();
  const isAdmin = profile.role === "admin";

  const [renewals, domainClients] = await Promise.all([listRenewals(), listDomainClients()]);
  const [domains, settings] = isAdmin
    ? await Promise.all([listDomains(), getDomainSettings()])
    : [[], { dynadotApiKeyEncrypted: null }];
  const websitesByDomainId = isAdmin ? await listWebsitesByDomainIds(domains.map((d) => d.id)) : {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Domains</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Domain, hosting, email, and malware-removal renewal work. Link a renewal to a domain to manage its Google
          Tag codes, contact info, and offline status.
        </p>
      </div>

      <DomainsPanel
        renewals={renewals}
        domainClients={domainClients}
        domains={domains}
        websitesByDomainId={websitesByDomainId}
        hasDynadotApiKey={Boolean(settings.dynadotApiKeyEncrypted)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
