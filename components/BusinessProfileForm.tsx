"use client";

import { useRef, useState } from "react";
import { Pencil, X, Building2 } from "lucide-react";
import type { BusinessProfile } from "@/lib/types";
import { updateBusinessProfileAction } from "@/lib/actions";

export function BusinessProfileForm({ profile }: { profile: BusinessProfile }) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!editing) {
    return (
      <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Your Business Profile</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-base-700/60 hover:text-accent-300"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-base-600 bg-base-900">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoUrl} alt={profile.companyName || "Company logo"} className="h-full w-full object-contain" />
            ) : (
              <Building2 size={22} className="text-neutral-600" />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-neutral-100">
              {profile.companyName || "No company name set"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Shown on generated client reports alongside the client&apos;s own logo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await updateBusinessProfileAction(formData);
        setEditing(false);
        setPreview(null);
      }}
      className="flex flex-col gap-4 rounded-xl2 border border-accent-500/30 bg-base-850 p-5"
    >
      <input type="hidden" name="existingLogoUrl" value={profile.logoUrl} />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Your Business Profile</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setPreview(null);
          }}
          className="text-neutral-500 hover:text-neutral-300"
        >
          <X size={15} />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Company name</label>
        <input
          name="companyName"
          defaultValue={profile.companyName}
          placeholder="e.g. Bright Digital Studio"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Company logo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-base-600 bg-base-900">
            {preview || profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview ?? profile.logoUrl} alt="Logo preview" className="h-full w-full object-contain" />
            ) : (
              <Building2 size={22} className="text-neutral-600" />
            )}
          </div>
          <input
            type="file"
            name="logoFile"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="flex-1 text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-base-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-200 hover:file:bg-base-600"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">PNG or JPG, up to 5MB. Leave empty to keep your current logo.</p>
      </div>

      <button type="submit" className="mt-1 rounded-md bg-accent-500 py-2 text-sm font-medium text-base-950 hover:bg-accent-400">
        Save business profile
      </button>
    </form>
  );
}
