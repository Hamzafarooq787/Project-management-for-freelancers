import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { listDomainClients, listRenewals } from "@/lib/store";
import { RenewalsPanel } from "@/components/RenewalsPanel";

export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const [renewals, domainClients] = await Promise.all([listRenewals(), listDomainClients()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Renewals</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Domain, hosting, email, and malware-removal renewal work — separate from the Domains inventory. Track what
          you charged vs. what it cost you, all on one page.
        </p>
      </div>

      <RenewalsPanel renewals={renewals} domainClients={domainClients} />
    </div>
  );
}
