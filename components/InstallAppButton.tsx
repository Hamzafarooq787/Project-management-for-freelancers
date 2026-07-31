"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton({ className, variant = "sidebar" }: { className?: string; variant?: "sidebar" | "mobile" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowIosHelp((v) => !v);
  };

  if (variant === "mobile") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] text-neutral-400 hover:text-accent-300"
        >
          <Download size={18} />
          Install
        </button>
        {showIosHelp && (
          <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-base-700/60 bg-base-850 p-3 text-[11px] text-neutral-300 shadow-card">
            {isIos
              ? "Tap the Share icon, then \"Add to Home Screen\"."
              : "Use your browser's menu and choose \"Install app\" or \"Add to Home Screen\"."}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-base-800 hover:text-accent-300 transition-colors",
          className,
        )}
      >
        <Download size={17} />
        Install app
      </button>
      {showIosHelp && (
        <div className="mt-1 rounded-lg border border-base-700/60 bg-base-850 p-3 text-[11px] text-neutral-400">
          {isIos
            ? "Tap the Share icon, then \"Add to Home Screen\"."
            : "Use your browser's menu and choose \"Install app\" or \"Add to Home Screen\"."}
        </div>
      )}
    </div>
  );
}
