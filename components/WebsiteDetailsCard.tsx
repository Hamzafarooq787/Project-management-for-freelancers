"use client";

import { useRef, useState } from "react";
import { Pencil, X, Globe, Image as ImageIcon, CheckCircle2, Clock, MinusCircle } from "lucide-react";
import type { WebDevDetails } from "@/lib/types";
import { updateWebDetailsAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

const DOMAIN_STATUS_META = {
  purchased: { label: "Domain purchased", icon: CheckCircle2, className: "text-accent-400 bg-accent-500/15" },
  pending: { label: "Domain pending", icon: Clock, className: "text-amber-400 bg-amber-500/15" },
  not_required: { label: "Domain n/a", icon: MinusCircle, className: "text-neutral-400 bg-base-700/50" },
} as const;

export function WebsiteDetailsCard({ projectId, web }: { projectId: string; web: WebDevDetails }) {
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const statusMeta = DOMAIN_STATUS_META[web.domainStatus];
  const StatusIcon = statusMeta.icon;

  if (!editing) {
    const hasAny = web.websiteName || web.websiteUrl || web.logoUrl || web.siteIconUrl;
    return (
      <div className="rounded-xl2 border border-sky-700/40 bg-base-850 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            <Globe size={14} className="text-sky-400" />
            Website Details
          </h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-base-700/60 hover:text-sky-300"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        {!hasAny ? (
          <p className="text-sm text-neutral-500">No website details yet. Click edit to add them.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Preview label="Logo" url={web.logoUrl} />
              <Preview label="Site icon" url={web.siteIconUrl} rounded />
              <Preview label="Open Graph" url={web.openGraphImageUrl} wide />
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <InfoRow label="Website name" value={web.websiteName} />
              <InfoRow
                label="Website URL"
                value={web.websiteUrl}
                href={web.websiteUrl || undefined}
              />
            </div>

            <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", statusMeta.className)}>
              <StatusIcon size={13} />
              {statusMeta.label}
            </span>

            {web.servicesDetails && <TextBlock label="Services" value={web.servicesDetails} />}
            {web.hostingDetails && <TextBlock label="Hosting" value={web.hostingDetails} />}
            {web.contactDetails && <TextBlock label="Website contact" value={web.contactDetails} />}
            {web.notes && <TextBlock label="Notes" value={web.notes} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await updateWebDetailsAction(formData);
        setEditing(false);
      }}
      className="flex flex-col gap-3 rounded-xl2 border border-sky-500/40 bg-base-850 p-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          <Globe size={14} className="text-sky-400" />
          Website Details
        </h2>
        <button type="button" onClick={() => setEditing(false)} className="text-neutral-500 hover:text-neutral-300">
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input name="websiteName" label="Website / brand name" defaultValue={web.websiteName} />
        <Input name="websiteUrl" label="Website URL" defaultValue={web.websiteUrl} placeholder="https://example.com" />
        <Input name="logoUrl" label="Logo URL" defaultValue={web.logoUrl} placeholder="https://.../logo.svg" />
        <Input name="siteIconUrl" label="Site icon / favicon URL" defaultValue={web.siteIconUrl} placeholder="https://.../favicon.ico" />
        <Input
          name="openGraphImageUrl"
          label="Open Graph image URL"
          defaultValue={web.openGraphImageUrl}
          placeholder="https://.../og-cover.png"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Domain status</label>
          <select
            name="domainStatus"
            defaultValue={web.domainStatus}
            className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
          >
            <option value="purchased">Purchased</option>
            <option value="pending">Pending purchase</option>
            <option value="not_required">Not required</option>
          </select>
        </div>
      </div>

      <Textarea name="servicesDetails" label="Services details" defaultValue={web.servicesDetails} />
      <Textarea name="hostingDetails" label="Hosting details" defaultValue={web.hostingDetails} />
      <Textarea name="contactDetails" label="Website contact details" defaultValue={web.contactDetails} />
      <Textarea name="webNotes" label="Additional notes" defaultValue={web.notes} />

      <button type="submit" className="mt-1 rounded-md bg-sky-500 py-2 text-sm font-medium text-base-950 hover:bg-sky-400">
        Save website details
      </button>
    </form>
  );
}

function Preview({ label, url, rounded, wide }: { label: string; url: string; rounded?: boolean; wide?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden border border-base-600 bg-base-900",
          rounded ? "h-10 w-10 rounded-full" : wide ? "h-12 w-20 rounded-md" : "h-12 w-12 rounded-md",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon size={16} className="text-neutral-600" />
        )}
      </div>
      <span className="text-[10px] text-neutral-500">{label}</span>
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-base-900/50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="truncate text-sm text-sky-300 hover:underline">
          {value}
        </a>
      ) : (
        <p className="truncate text-sm text-neutral-200">{value}</p>
      )}
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="rounded-lg bg-base-900/50 p-2.5 text-sm text-neutral-300">{value}</p>
    </div>
  );
}

function Input({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
      />
    </div>
  );
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={2}
        className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-sky-400 focus:outline-none"
      />
    </div>
  );
}
