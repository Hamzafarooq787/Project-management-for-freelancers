"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff, Power, RefreshCw, X } from "lucide-react";
import type { Domain, Website } from "@/lib/types";
import {
  regenerateWebsiteApiKeyForDomainAction,
  setWebsiteOfflineForDomainAction,
  upsertWebsiteForDomainAction,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

const CONNECTED_WINDOW_MS = 24 * 60 * 60 * 1000;

type ConnectionStatus = "none" | "offline" | "pending" | "connected" | "stale";

export function getWebsiteConnectionStatus(website?: Website): ConnectionStatus {
  if (!website) return "none";
  if (website.isOffline) return "offline";
  if (!website.lastFetchedAt) return "pending";
  const age = Date.now() - new Date(website.lastFetchedAt).getTime();
  return age < CONNECTED_WINDOW_MS ? "connected" : "stale";
}

export const CONNECTION_BADGE: Record<ConnectionStatus, { label: string; cls: string }> = {
  none: { label: "Not attached", cls: "bg-base-700/60 text-neutral-400" },
  offline: { label: "Offline", cls: "bg-rose-500/15 text-rose-300" },
  pending: { label: "Not connected yet", cls: "bg-amber-500/15 text-amber-300" },
  connected: { label: "Connected", cls: "bg-emerald-500/15 text-emerald-300" },
  stale: { label: "Connection lost", cls: "bg-amber-500/15 text-amber-300" },
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function buildSetupPrompt(apiKey: string, configUrl: string): string {
  return `Wire this Next.js site up to pull its live config (contact info, service-area cities, Google Tag Manager/GA/Pixel head+body scripts, and an offline flag) from my Freelance HQ app instead of hardcoding them, so I can update them there without redeploying this site.

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
   // siteConfig: { name, contactEmail, contactPhone, contactAddress, cities: string[], headScripts, bodyScripts, offline: boolean }

3. Inject siteConfig.headScripts as raw HTML into <head>, and siteConfig.bodyScripts as raw HTML immediately after the opening <body> tag (dangerouslySetInnerHTML on a wrapper is fine — these are trusted scripts I control). Guard for siteConfig being null (fetch failed) so the site still renders without it.

4. If siteConfig.offline is true, render a simple "This site is temporarily offline" page instead of the normal site content.

5. Anywhere the site currently hardcodes contact info or the list of service-area cities, read it from siteConfig instead (still falling back sensibly if siteConfig is null).

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

export function WebsiteConfigModal({ domain, website, onClose }: { domain: Domain; website: Website | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const configUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api/site-config`;
  }, []);

  const status = getWebsiteConnectionStatus(website ?? undefined);
  const badge = CONNECTION_BADGE[status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl2 border border-base-700/60 bg-base-850 p-5 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Website config</p>
            <h3 className="mt-0.5 truncate text-lg font-semibold text-neutral-100">{domain.name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.cls)}>{badge.label}</span>
              {website?.lastFetchedAt && <span className="text-[11px] text-neutral-500">last fetched {formatRelative(website.lastFetchedAt)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-500 hover:bg-base-700/60 hover:text-neutral-300">
            <X size={18} />
          </button>
        </div>

        {error && <p className="mb-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

        <form
          ref={formRef}
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await upsertWebsiteForDomainAction(domain.id, formData);
              if (!result.ok) setError(result.error);
            });
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-neutral-500">Website name</label>
              <input
                name="name"
                required
                defaultValue={website?.name ?? domain.name}
                className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-neutral-500">Contact email</label>
              <input
                name="contactEmail"
                type="email"
                defaultValue={website?.contactEmail ?? ""}
                className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-neutral-500">Contact phone</label>
              <input
                name="contactPhone"
                defaultValue={website?.contactPhone ?? ""}
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
                rows={4}
                defaultValue={website?.headScripts ?? ""}
                placeholder="<script>...google tag manager head snippet...</script>"
                className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 font-mono text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-neutral-500">Body scripts (e.g. GTM &lt;noscript&gt; — right after &lt;body&gt;)</label>
              <textarea
                name="bodyScripts"
                rows={4}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
            >
              {isPending ? "Saving…" : website ? "Save changes" : "Save & attach website"}
            </button>
            {website && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const goingOffline = !website.isOffline;
                  if (goingOffline && !confirm(`Take "${domain.name}" offline? The live site should show an offline page once it sees this.`)) return;
                  startTransition(() => setWebsiteOfflineForDomainAction(domain.id, goingOffline));
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm disabled:opacity-50",
                  website.isOffline
                    ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                    : "border-rose-500/50 text-rose-300 hover:bg-rose-500/10",
                )}
              >
                <Power size={14} />
                {website.isOffline ? "Bring back online" : "Take offline"}
              </button>
            )}
          </div>
        </form>

        {website && (
          <div className="mt-4 flex flex-col gap-2 border-t border-base-700/60 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-neutral-500">API key</span>
              <code className="rounded-md bg-base-950 px-2 py-1 text-[11px] text-neutral-300">
                {keyVisible ? website.apiKey : `${website.apiKey.slice(0, 4)}${"•".repeat(24)}${website.apiKey.slice(-4)}`}
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
                    const result = await regenerateWebsiteApiKeyForDomainAction(domain.id);
                    setKeyMessage(result.ok ? "Key rotated — update the site's env var." : result.error);
                  });
                }}
                className="flex items-center gap-1 rounded-md border border-base-600 px-2 py-1 text-[11px] text-neutral-300 hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Rotate key
              </button>
            </div>
            {keyMessage && <p className="text-[11px] text-amber-300">{keyMessage}</p>}

            <div className="mt-1 flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-neutral-500">
                  Paste this into a Claude Code session inside that website&rsquo;s own repo to attach it.
                </p>
                <CopyButton value={buildSetupPrompt(website.apiKey, configUrl)} label="Copy prompt" />
              </div>
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-base-950 p-3 text-[11px] leading-relaxed text-neutral-300">
                {buildSetupPrompt(website.apiKey, configUrl)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
