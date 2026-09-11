"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, Plus, RefreshCw, Settings, Trash2, Users } from "lucide-react";
import type { Domain, DomainClient, Renewal, Website } from "@/lib/types";
import {
  clearDynadotApiKeyAction,
  createDomainAction,
  createDomainClientAction,
  deleteDomainClientAction,
  importDomainsFromDynadotAction,
  saveDynadotApiKeyAction,
} from "@/lib/actions";
import { RenewalsPanel } from "@/components/RenewalsPanel";
import { cn } from "@/lib/utils";

export function DomainsPanel({
  renewals,
  domainClients,
  domains,
  websitesByDomainId,
  hasDynadotApiKey,
  isAdmin,
}: {
  renewals: Renewal[];
  domainClients: DomainClient[];
  domains: Domain[];
  websitesByDomainId: Record<string, Website>;
  hasDynadotApiKey: boolean;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"renewals" | "clients" | "inventory">("renewals");

  const tabs = [
    { key: "renewals" as const, label: "Renewals", icon: CalendarClock },
    ...(isAdmin
      ? [
          { key: "clients" as const, label: "Domain Clients", icon: Users },
          { key: "inventory" as const, label: "Domain Inventory", icon: Settings },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {tabs.length > 1 && (
        <div className="flex gap-2 border-b border-base-700/60">
          {tabs.map((t) => (
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
      )}

      {tab === "renewals" && (
        <RenewalsPanel
          renewals={renewals}
          domainClients={domainClients}
          domains={domains}
          websitesByDomainId={websitesByDomainId}
          isAdmin={isAdmin}
        />
      )}
      {tab === "clients" && isAdmin && <DomainClientsTab domainClients={domainClients} />}
      {tab === "inventory" && isAdmin && (
        <DomainInventoryTab domainClients={domainClients} hasDynadotApiKey={hasDynadotApiKey} />
      )}
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

function DomainInventoryTab({ domainClients, hasDynadotApiKey }: { domainClients: DomainClient[]; hasDynadotApiKey: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [keyError, setKeyError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const keyFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl2 border border-base-700/60 bg-base-850 p-4">
        <p className="text-sm text-neutral-400">
          Connect your Dynadot reseller account to import your domain list. Generate a key in Dynadot under Account
          Settings → API, then paste it below. It&rsquo;s encrypted at rest.
        </p>
        <p className="text-xs text-neutral-500">
          Status: {hasDynadotApiKey ? <span className="text-emerald-300">API key saved</span> : <span className="text-neutral-500">No key saved</span>}
        </p>
        {keyError && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{keyError}</p>}
        <form
          ref={keyFormRef}
          action={(formData) => {
            setKeyError(null);
            startTransition(async () => {
              const result = await saveDynadotApiKeyAction(formData);
              if (result.ok) keyFormRef.current?.reset();
              else setKeyError(result.error);
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
        {hasDynadotApiKey && (
          <div className="flex flex-wrap items-center gap-2 border-t border-base-700/60 pt-3">
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
            {importMessage && <span className="text-xs text-neutral-400">{importMessage}</span>}
          </div>
        )}
      </div>

      <NewDomainForm domainClients={domainClients} />
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Register a domain</h2>
      </div>
      <p className="text-xs text-neutral-500">
        Adds a domain to your inventory without a renewal record — you can then link it from any renewal to attach
        Website settings.
      </p>
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
