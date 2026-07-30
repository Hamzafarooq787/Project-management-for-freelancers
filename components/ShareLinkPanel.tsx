"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2, Copy, Check, RefreshCw, X } from "lucide-react";
import { disableSharingAction, enableSharingAction, regenerateShareTokenAction } from "@/lib/actions";

export function ShareLinkPanel({
  projectId,
  shareToken,
}: {
  projectId: string;
  shareToken: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState(shareToken);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = token && origin ? `${origin}/share/${token}` : "";

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Link2 size={16} className="text-accent-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Client Link</h2>
      </div>

      {!token ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-400">
            Generate a link you can send to your client. From it, they can view this project&apos;s tasks, add
            new tasks, and upload images — no account needed.
          </p>
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const newToken = await enableSharingAction(projectId);
                setToken(newToken);
              })
            }
            className="w-fit rounded-md bg-accent-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create client link"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-md border border-base-600 bg-base-900 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs text-neutral-300">{shareUrl}</span>
            <button
              onClick={copyLink}
              title="Copy link"
              className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-base-700/60 hover:text-accent-300"
            >
              {copied ? <Check size={14} className="text-accent-400" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Anyone with this link can add tasks and images to this project. Regenerate it to invalidate the old
            link, or disable sharing entirely.
          </p>
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const newToken = await regenerateShareTokenAction(projectId);
                  setToken(newToken);
                })
              }
              className="flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-60"
            >
              <RefreshCw size={13} />
              Regenerate
            </button>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await disableSharingAction(projectId);
                  setToken(null);
                })
              }
              className="flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-400 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-60"
            >
              <X size={13} />
              Disable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
