import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/store";
import { BusinessProfileForm } from "@/components/BusinessProfileForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") notFound();

  const businessProfile = await getBusinessProfile();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Your business details, used to brand PDF reports sent to clients.
        </p>
      </div>

      <BusinessProfileForm profile={businessProfile} />
    </div>
  );
}
