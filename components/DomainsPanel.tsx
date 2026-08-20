"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Globe, Plus, RefreshCw, Settings, Trash2, Users } from "lucide-react";
import type { Domain, DomainClient, ResaleDomainStatus } from "@/lib/types";
import {
  clearDynadotApiKeyAction,
  createDomainAction,
  createDomainClientAction,
  deleteDomainAction,
  deleteDomainClientAction,
  importDomainsFromDynadotAction,
  saveDynadotApiKeyAction,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ResaleDomainStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-300",
  reserved: "bg-amber-500/15 text-amber-300",
  sold: "bg-neutral-500/15 text-neutral-400",
};

export function DomainsPanel({
  domains,
  domainClients,
  hasDynadotApiKey,
}: {
  domains: Domain[];
  domainClients: DomainClient[];
  hasDynadotApiKey: boolean;
}) {
  const [tab, setTab] = useState<"domains" | "clients" | "settings">("domains");
  const clientById = new Map(domainClients.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-base-700/60">
        {(
          [
            { key: "domains", label: "Domains", icon: Globe },
            { key: "clients", label: "Domain Clients", icon: Users },
            { key: "settings", label: "Dynadot Settings", icon: Settings },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "border-accent-500 text-accent-300" : "border-transparent text-neutral-400 hover:text-neutral-200",
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "domains" && <DomainsTab domains={domains} clientById={clientById} domainClients={domainClients} hasDynadotApiKey={hasDynadotApiKey} />}
      {tab === "clients" && <DomainClientsTab domainClients={domainClients} />}
      {tab === "settings" && <DynadotSettingsTab hasDynadotApiKey={hasDynadotApiKey} />}
    </div>
  );
}

function DomainsTab({
  domains,
  clientById,
  domainClients,
  hasDynadotApiKey,
}: {
  domains: Domain[];
  clientById: Map<string, DomainClient>;
  domainClients: DomainClient[];
  hasDynadotApiKey: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{domains.length} domain{domains.length === 1 ? "" : "s"} in inventory</p>
        {hasDynadotApiKey && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await importDomainsFromDynadotAction();
                setImportMessage(result.ok ? `Imported ${result.added} new domain${result.added === 1 ? "" : "s"} from Dynadot.` : result.error);
              })
            }
            className="flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
            Import from Dynadot
          </button>
        )}
      </div>
      {importMessage && (
        <p className="rounded-md border border-base-600 bg-base-850 px-3 py-2 text-xs text-neutral-300">{importMessage}</p>
      )}

      <NewDomainForm domainClients={domainClients} />

      <div className="flex flex-col gap-2">
        {domains.map((domain) => (
          <DomainRow key={domain.id} domain={domain} client={domain.domainClientId ? clientById.get(domain.domainClientId) : undefined} />
        ))}
        {domains.length === 0 && <p className="text-sm text-neutral-500">No domains yet — add one above.</p>}
      </div>
    </div>
  );
}

function NewDomainForm({ domainClients }: { domainClients: DomainClient[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createDomainAction(formData);
          if (result.ok) formRef.current?.reset();
          else setError(result.error);
        });
      }}
      className="flex flex-col gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4"
    >
      <div className="flex items-center gap-2">
        <Plus size={16} className="text-accent-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Add domain</h2>
      </div>
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          name="name"
          placeholder="example.com"
          required
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
        <select
          name="domainClientId"
          defaultValue=""
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
        >
          <option value="">No client</option>
          {domainClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue="available"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
        >
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
        </select>
        <input
          name="registrar"
          placeholder="Registrar (default Dynadot)"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          name="purchasePrice"
          type="number"
          step="0.01"
          placeholder="Cost price"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          name="sellingPrice"
          type="number"
          step="0.01"
          placeholder="Selling price"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          name="expiryDate"
          type="date"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="autoRenew" className="accent-accent-500" />
          Auto-renew
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add domain"}
      </button>
    </form>
  );
}

function DomainRow({ domain, client }: { domain: Domain; client?: DomainClient }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/domains/${domain.id}`} className="truncate text-sm font-medium text-neutral-100 hover:text-accent-300">
            {domain.name}
          </Link>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] capitalize", STATUS_STYLE[domain.status])}>{domain.status}</span>
          {domain.locked && <span className="rounded-full bg-base-700 px-2 py-0.5 text-[11px] text-neutral-300">Locked</span>}
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          {domain.registrar}
          {client && ` · ${client.name}`}
          {domain.expiryDate && ` · expires ${domain.expiryDate}`}
          {domain.sellingPrice != null && ` · $${domain.sellingPrice}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/domains/${domain.id}`} className="rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300">
          Manage
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Remove ${domain.name} from your inventory? This won't affect the domain at the registrar.`)) {
              startTransition(() => deleteDomainAction(domain.id));
            }
          }}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
          title="Remove"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function DomainClientsTab({ domainClients }: { domainClients: DomainClient[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await createDomainClientAction(formData);
            if (result.ok) formRef.current?.reset();
            else setError(result.error);
          });
        }}
        className="flex flex-col gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4"
      >
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Add domain client</h2>
        </div>
        {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="name" placeholder="Name" required className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
          <input name="email" type="email" placeholder="Email" className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
          <input name="phone" placeholder="Phone" className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
        </div>
        <textarea name="notes" placeholder="Notes" rows={2} className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none" />
        <button type="submit" disabled={isPending} className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60">
          {isPending ? "Adding…" : "Add client"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {domainClients.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4">
            <div>
              <p className="text-sm font-medium text-neutral-100">{c.name}</p>
              <p className="text-xs text-neutral-500">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove ${c.name}? Domains assigned to them will become unassigned.`)) {
                  startTransition(() => deleteDomainClientAction(c.id));
                }
              }}
              className="rounded-md p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400"
              title="Remove"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {domainClients.length === 0 && <p className="text-sm text-neutral-500">No domain clients yet.</p>}
      </div>
    </div>
  );
}

function DynadotSettingsTab({ hasDynadotApiKey }: { hasDynadotApiKey: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4 rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <p className="text-sm text-neutral-400">
        Connect your Dynadot reseller account to import your domain list and manage lock status / DNS from here.
        Generate a key in Dynadot under Account Settings → API, then paste it below. It&rsquo;s encrypted at rest.
      </p>
      <p className="text-xs text-neutral-500">
        Status: {hasDynadotApiKey ? <span className="text-emerald-300">API key saved</span> : <span className="text-neutral-500">No key saved</span>}
      </p>
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      <form
        ref={formRef}
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await saveDynadotApiKeyAction(formData);
            if (result.ok) formRef.current?.reset();
            else setError(result.error);
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          name="apiKey"
          type="password"
          placeholder="Dynadot API key"
          required
          className="min-w-[240px] flex-1 rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
        <button type="submit" disabled={isPending} className="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60">
          {isPending ? "Saving…" : "Save key"}
        </button>
        {hasDynadotApiKey && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("Remove the saved Dynadot API key?")) startTransition(() => clearDynadotApiKeyAction());
            }}
            className="rounded-md border border-base-600 px-3 py-2 text-sm text-neutral-300 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
          >
            Remove key
          </button>
        )}
      </form>
    </div>
  );
}
