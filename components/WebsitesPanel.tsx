"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Domain, DomainClient, Website } from "@/lib/types";
import {
  createWebsiteAction,
  deleteWebsiteAction,
  regenerateWebsiteApiKeyAction,
  updateWebsiteAction,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

function buildSetupPrompt(apiKey: string, configUrl: string): string {
  return `Wire this Next.js site up to pull its live config (contact info, service-area cities, and Google Tag Manager/GA/Pixel head+body scripts) from my Freelance HQ app instead of hardcoding them, so I can update them there without redeploying this site.

1. Add env vars:
   FREELANCE_HQ_CONFIG_URL=${configUrl}
   FREELANCE_HQ_SITE_KEY=${apiKey}
   (keep these server-only — never expose the key to client-side/browser code)

2. In the root layout (Server Component), fetch the config server-side:
   const res = await fetch(process.env.FREELANCE_HQ_CONFIG_URL!, {
     headers: { Authorization: \`Bearer \${process.env.FREELANCE_HQ_SITE_KEY}\` },
     next: { revalidate: 300 },
   });
   const siteConfig = res.ok ? await res.json() : null;
   // siteConfig: { name, contactEmail, contactPhone, contactAddress, cities: string[], headScripts, bodyScripts }

3. Inject siteConfig.headScripts as raw HTML into <head>, and siteConfig.bodyScripts as raw HTML immediately after the opening <body> tag (dangerouslySetInnerHTML on a wrapper is fine — these are trusted scripts I control). Guard for siteConfig being null (fetch failed) so the site still renders without it.

4. Anywhere the site currently hardcodes contact info or the list of service-area cities, read it from siteConfig instead (still falling back sensibly if siteConfig is null).

Ask me if anything about the existing layout structure is unclear before changing it.`;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable (e.g. insecure context) — nothing more we can do.
        }
      }}
      className="flex items-center gap-1 rounded-md border border-base-600 px-2 py-1 text-[11px] text-neutral-300 hover:border-accent-500/50 hover:text-accent-300"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function WebsitesPanel({
  websites,
  domains,
  domainClients,
}: {
  websites: Website[];
  domains: Domain[];
  domainClients: DomainClient[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const domainClientById = new Map(domainClients.map((c) => [c.id, c]));
  const domainById = new Map(domains.map((d) => [d.id, d]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
          >
            <Plus size={13} />
            Add website
          </button>
        )}
      </div>

      {adding && (
        <WebsiteForm
          domains={domains}
          domainClients={domainClients}
          website={null}
          onCancel={() => setAdding(false)}
          onSaved={(newId) => {
            setAdding(false);
            if (newId) setJustCreatedId(newId);
          }}
        />
      )}

      {websites.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
          No websites attached yet. Add one above and link it to a domain in your inventory.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {websites.map((website) =>
            editingId === website.id ? (
              <WebsiteForm
                key={website.id}
                domains={domains}
                domainClients={domainClients}
                website={website}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <WebsiteCard
                key={website.id}
                website={website}
                domain={website.domainId ? domainById.get(website.domainId) : undefined}
                domainClient={
                  website.domainId
                    ? (() => {
                        const d = domainById.get(website.domainId as string);
                        return d?.domainClientId ? domainClientById.get(d.domainClientId) : undefined;
                      })()
                    : undefined
                }
                onEdit={() => setEditingId(website.id)}
                autoOpenSetup={website.id === justCreatedId}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function WebsiteCard({
  website,
  domain,
  domainClient,
  onEdit,
  autoOpenSetup = false,
}: {
  website: Website;
  domain?: Domain;
  domainClient?: DomainClient;
  onEdit: () => void;
  autoOpenSetup?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [keyVisible, setKeyVisible] = useState(false);
  const [setupOpen, setSetupOpen] = useState(autoOpenSetup);
  const [rotateMessage, setRotateMessage] = useState<string | null>(null);

  const configUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api/site-config`;
  }, []);

  const maskedKey = `${website.apiKey.slice(0, 4)}${"•".repeat(24)}${website.apiKey.slice(-4)}`;

  return (
    <div className={cn("rounded-xl2 border bg-base-850 p-4", autoOpenSetup ? "border-accent-500/60" : "border-base-700/60")}>
      {autoOpenSetup && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-accent-500/10 px-2.5 py-1.5 text-xs text-accent-300">
          <Sparkles size={13} />
          Website added — copy the setup instructions below into that site&rsquo;s repo to connect it.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Globe size={15} className="shrink-0 text-sky-400" />
            <p className="truncate text-sm font-medium text-neutral-100">{website.name || "Unnamed website"}</p>
            {domain && (
              <span className="truncate rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300">{domain.name}</span>
            )}
            {domainClient && (
              <span className="truncate rounded-full bg-base-950 px-2 py-0.5 text-[11px] text-neutral-400">{domainClient.name}</span>
            )}
          </div>
          {(website.contactEmail || website.contactPhone) && (
            <p className="mt-1 truncate text-xs text-neutral-500">
              {[website.contactEmail, website.contactPhone].filter(Boolean).join(" · ")}
            </p>
          )}
          {website.cities.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {website.cities.map((city) => (
                <span key={city} className="rounded-full bg-base-950 px-2 py-0.5 text-[11px] text-neutral-400">
                  {city}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onEdit} className="rounded-md p-1.5 text-neutral-400 hover:text-accent-300" title="Edit">
            <Pencil size={14} />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirm(`Delete "${website.name}"? Its API key stops working immediately.`)) return;
              startTransition(() => deleteWebsiteAction(website.id));
            }}
            className="rounded-md p-1.5 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-base-700/60 pt-3">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">API key</span>
        <code className="rounded-md bg-base-950 px-2 py-1 text-[11px] text-neutral-300">
          {keyVisible ? website.apiKey : maskedKey}
        </code>
        <button
          type="button"
          onClick={() => setKeyVisible((v) => !v)}
          className="rounded-md p-1 text-neutral-400 hover:text-neutral-200"
          title={keyVisible ? "Hide key" : "Reveal key"}
        >
          {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <CopyButton value={website.apiKey} label="Copy key" />
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Rotate this site's API key? The old key stops working immediately — update the live site's env var too.")) return;
            startTransition(async () => {
              const result = await regenerateWebsiteApiKeyAction(website.id);
              setRotateMessage(result.ok ? "Key rotated — update the site's env var." : result.error);
            });
          }}
          className="flex items-center gap-1 rounded-md border border-base-600 px-2 py-1 text-[11px] text-neutral-300 hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-50"
        >
          <RefreshCw size={12} />
          Rotate key
        </button>
        <button
          type="button"
          onClick={() => setSetupOpen((v) => !v)}
          className="ml-auto flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300"
        >
          Setup instructions
          <ChevronDown size={12} className={cn("transition-transform", setupOpen && "rotate-180")} />
        </button>
      </div>
      {rotateMessage && <p className="mt-2 text-[11px] text-amber-300">{rotateMessage}</p>}

      {setupOpen && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-neutral-500">
              Paste this into a Claude Code session inside that website&rsquo;s own repo.
            </p>
            <CopyButton value={buildSetupPrompt(website.apiKey, configUrl)} label="Copy prompt" />
          </div>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-base-950 p-3 text-[11px] leading-relaxed text-neutral-300">
            {buildSetupPrompt(website.apiKey, configUrl)}
          </pre>
        </div>
      )}
    </div>
  );
}

function WebsiteForm({
  domains,
  domainClients,
  website,
  onCancel,
  onSaved,
}: {
  domains: Domain[];
  domainClients: DomainClient[];
  website: Website | null;
  onCancel: () => void;
  onSaved: (newId?: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const domainClientById = useMemo(() => new Map(domainClients.map((c) => [c.id, c])), [domainClients]);

  const [domainId, setDomainId] = useState(website?.domainId ?? "");
  const [name, setName] = useState(website?.name ?? "");
  const [contactEmail, setContactEmail] = useState(website?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(website?.contactPhone ?? "");

  function handleSelectDomain(domain: Domain | null) {
    setDomainId(domain?.id ?? "");
    if (!domain) return;
    // Only fill in fields the admin hasn't already typed something into — never clobber existing edits.
    if (!name.trim()) setName(domain.name);
    const client = domain.domainClientId ? domainClientById.get(domain.domainClientId) : undefined;
    if (client?.email && !contactEmail.trim()) setContactEmail(client.email);
    if (client?.phone && !contactPhone.trim()) setContactPhone(client.phone);
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          if (website) {
            await updateWebsiteAction(website.id, formData);
            onSaved();
          } else {
            const result = await createWebsiteAction(formData);
            if (result.ok) {
              formRef.current?.reset();
              onSaved(result.id);
            } else {
              setError(result.error);
            }
          }
        });
      }}
      className="flex flex-col gap-3 rounded-xl2 border border-base-700/60 bg-base-850 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{website ? "Edit website" : "New website"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Website name</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rapid Tyres"
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Domain</label>
          <input type="hidden" name="domainId" value={domainId} />
          <DomainPicker domains={domains} domainClients={domainClients} selectedDomainId={domainId} onSelect={handleSelectDomain} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Contact email</label>
          <input
            name="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Contact phone</label>
          <input
            name="contactPhone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Contact address</label>
          <input
            name="contactAddress"
            defaultValue={website?.contactAddress ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Service-area cities (comma-separated)</label>
        <input
          name="cities"
          defaultValue={website?.cities.join(", ") ?? ""}
          placeholder="e.g. Lahore, Karachi, Islamabad"
          className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Head scripts (GTM/GA/Pixel — pasted into &lt;head&gt;)</label>
          <textarea
            name="headScripts"
            rows={5}
            defaultValue={website?.headScripts ?? ""}
            placeholder="<script>...google tag manager head snippet...</script>"
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 font-mono text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Body scripts (e.g. GTM &lt;noscript&gt; — right after &lt;body&gt;)</label>
          <textarea
            name="bodyScripts"
            rows={5}
            defaultValue={website?.bodyScripts ?? ""}
            placeholder="<noscript>...google tag manager body snippet...</noscript>"
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 font-mono text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Notes</label>
        <input
          name="notes"
          defaultValue={website?.notes ?? ""}
          placeholder="Optional — admin-only, never exposed to the site"
          className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save website"}
        </button>
        <button type="button" onClick={onCancel} className="w-fit rounded-md border border-base-600 px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200">
          Cancel
        </button>
      </div>
    </form>
  );
}

function DomainPicker({
  domains,
  domainClients,
  selectedDomainId,
  onSelect,
}: {
  domains: Domain[];
  domainClients: DomainClient[];
  selectedDomainId: string;
  onSelect: (domain: Domain | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const domainClientById = useMemo(() => new Map(domainClients.map((c) => [c.id, c])), [domainClients]);
  const selected = domains.find((d) => d.id === selectedDomainId);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = domains.filter((d) => !q || d.name.toLowerCase().includes(q));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-left text-sm text-neutral-100 hover:border-accent-500/50 focus:border-accent-500 focus:outline-none"
      >
        <span className={cn("truncate", !selected && "text-neutral-500")}>{selected ? selected.name : "Search your domains…"}</span>
        <ChevronDown size={13} className={cn("shrink-0 text-neutral-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[16rem] overflow-hidden rounded-lg border border-base-600 bg-base-900 shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-base-700 p-2">
            <Search size={13} className="shrink-0 text-neutral-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search domains from your renewable inventory…"
              className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs text-neutral-400 hover:bg-base-800"
            >
              No domain linked
            </button>
            {filtered.length === 0 && <p className="px-2 py-2 text-[11px] text-neutral-600">No domains match &ldquo;{query}&rdquo;.</p>}
            {filtered.map((d) => {
              const client = d.domainClientId ? domainClientById.get(d.domainClientId) : undefined;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onSelect(d);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-base-800",
                    d.id === selectedDomainId ? "bg-accent-500/10 text-accent-300" : "text-neutral-300",
                  )}
                >
                  <span className="truncate">{d.name}</span>
                  {client && <span className="shrink-0 truncate text-neutral-500">{client.name}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
