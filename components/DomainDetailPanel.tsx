"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, Lock, Plus, RefreshCw, Trash2, Unlock, UploadCloud } from "lucide-react";
import type { Domain, DomainClient, DomainDnsRecord, DnsRecordType } from "@/lib/types";
import {
  createDomainDnsRecordAction,
  deleteDomainDnsRecordAction,
  pushDomainDnsToDynadotAction,
  setDomainLockedAction,
  syncDomainFromDynadotAction,
  updateDomainAction,
  updateDomainDnsRecordAction,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

const RECORD_TYPES: DnsRecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];

export function DomainDetailPanel({
  domain,
  dnsRecords,
  domainClients,
}: {
  domain: Domain;
  dnsRecords: DomainDnsRecord[];
  domainClients: DomainClient[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/domains" className="flex w-fit items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300">
        <ArrowLeft size={13} />
        Back to Domains
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DomainDetailsCard domain={domain} domainClients={domainClients} />
        <DomainLockCard domain={domain} />
      </div>

      <DnsRecordsCard domain={domain} dnsRecords={dnsRecords} />
    </div>
  );
}

function DomainDetailsCard({ domain, domainClients }: { domain: Domain; domainClients: DomainClient[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => updateDomainAction(domain.id, formData))}
      className="flex flex-col gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Details</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Client
          <select
            name="domainClientId"
            defaultValue={domain.domainClientId ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          >
            <option value="">No client</option>
            {domainClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Status
          <select
            name="status"
            defaultValue={domain.status}
            className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          >
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Registrar
          <input name="registrar" defaultValue={domain.registrar} className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Expiry date
          <input name="expiryDate" type="date" defaultValue={domain.expiryDate ?? ""} className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Cost price
          <input name="purchasePrice" type="number" step="0.01" defaultValue={domain.purchasePrice ?? ""} className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Selling price
          <input name="sellingPrice" type="number" step="0.01" defaultValue={domain.sellingPrice ?? ""} className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" name="autoRenew" defaultChecked={domain.autoRenew} className="accent-accent-500" />
        Auto-renew
      </label>
      <textarea name="notes" placeholder="Notes" defaultValue={domain.notes} rows={2} className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
      <button type="submit" disabled={isPending} className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60">
        {isPending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

function DomainLockCard({ domain }: { domain: Domain }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Registrar status</h2>
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        {domain.locked ? <Lock size={15} className="text-amber-400" /> : <Unlock size={15} className="text-emerald-400" />}
        {domain.locked ? "Locked" : "Unlocked"}
      </div>
      {domain.nameservers.length > 0 && (
        <p className="text-xs text-neutral-500">Nameservers: {domain.nameservers.join(", ")}</p>
      )}
      {domain.dynadotSyncedAt && <p className="text-xs text-neutral-500">Last synced from Dynadot: {new Date(domain.dynadotSyncedAt).toLocaleString()}</p>}
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      {syncMessage && <p className="rounded-md border border-base-600 bg-base-900 px-3 py-2 text-xs text-neutral-300">{syncMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setDomainLockedAction(domain.id, domain.name, domain.registrar, !domain.locked);
              if (!result.ok) setError(result.error);
            });
          }}
          className="flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
        >
          {domain.locked ? <Unlock size={13} /> : <Lock size={13} />}
          {domain.locked ? "Unlock" : "Lock"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setSyncMessage(null);
            startTransition(async () => {
              const result = await syncDomainFromDynadotAction(domain.id, domain.name);
              if (result.ok) setSyncMessage("Synced from Dynadot.");
              else setError(result.error);
            });
          }}
          className="flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
          Sync from Dynadot
        </button>
      </div>
    </div>
  );
}

function DnsRecordsCard({ domain, dnsRecords }: { domain: Domain; dnsRecords: DomainDnsRecord[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4 rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">DNS records</h2>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            setPushMessage(null);
            startTransition(async () => {
              const result = await pushDomainDnsToDynadotAction(domain.id, domain.name);
              if (result.ok) setPushMessage("Pushed to Dynadot.");
              else setError(result.error);
            });
          }}
          className="flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
        >
          <UploadCloud size={13} />
          Push to Dynadot
        </button>
      </div>
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      {pushMessage && <p className="rounded-md border border-base-600 bg-base-900 px-3 py-2 text-xs text-neutral-300">{pushMessage}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-500">
              <th className="pb-2 pr-2">Type</th>
              <th className="pb-2 pr-2">Host</th>
              <th className="pb-2 pr-2">Value</th>
              <th className="pb-2 pr-2">Priority</th>
              <th className="pb-2 pr-2">TTL</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {dnsRecords.map((record) => (
              <DnsRecordRow key={record.id} record={record} />
            ))}
          </tbody>
        </table>
        {dnsRecords.length === 0 && <p className="py-2 text-sm text-neutral-500">No DNS records yet — add one below.</p>}
      </div>

      <form
        ref={formRef}
        action={(formData) => {
          formData.set("domainId", domain.id);
          startTransition(async () => {
            const result = await createDomainDnsRecordAction(formData);
            if (result.ok) formRef.current?.reset();
          });
        }}
        className="grid grid-cols-2 gap-2 border-t border-base-700/60 pt-3 sm:grid-cols-5"
      >
        <select name="recordType" defaultValue="A" className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none">
          {RECORD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input name="host" placeholder="Host (@)" defaultValue="@" className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
        <input name="value" placeholder="Value" required className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
        <input name="priority" type="number" placeholder="Priority" className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
        <div className="flex gap-2">
          <input name="ttl" type="number" placeholder="TTL" className="min-w-0 flex-1 rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
          <button type="submit" disabled={isPending} className="flex items-center gap-1 rounded-md bg-accent-500 px-2.5 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60">
            <Plus size={13} />
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function DnsRecordRow({ record }: { record: DomainDnsRecord }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-t border-base-700/40">
        <td colSpan={6} className="py-2">
          <form
            action={(formData) => {
              startTransition(async () => {
                await updateDomainDnsRecordAction(record.id, record.domainId, formData);
                setEditing(false);
              });
            }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            <select name="recordType" defaultValue={record.recordType} className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none">
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input name="host" defaultValue={record.host} className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none" />
            <input name="value" defaultValue={record.value} className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none" />
            <input name="priority" type="number" defaultValue={record.priority ?? ""} className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none" />
            <div className="flex gap-2">
              <input name="ttl" type="number" defaultValue={record.ttl ?? ""} className="min-w-0 flex-1 rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none" />
              <button type="submit" disabled={isPending} className="rounded-md bg-accent-500 px-2.5 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60">
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-300">
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn("border-t border-base-700/40", isPending && "opacity-50")}>
      <td className="py-2 pr-2 font-mono text-xs text-neutral-300">{record.recordType}</td>
      <td className="py-2 pr-2 text-neutral-300">{record.host}</td>
      <td className="max-w-[220px] truncate py-2 pr-2 text-neutral-300">{record.value}</td>
      <td className="py-2 pr-2 text-neutral-500">{record.priority ?? "—"}</td>
      <td className="py-2 pr-2 text-neutral-500">{record.ttl ?? "—"}</td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:text-accent-300">
            Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteDomainDnsRecordAction(record.id))}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}
