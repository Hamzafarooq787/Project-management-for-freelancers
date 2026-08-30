"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DomainExpiryTickerItem } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DomainExpiryTicker({ items }: { items: DomainExpiryTickerItem[] }) {
  if (items.length === 0) return null;

  const loopItems = [...items, ...items];

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-amber-500/30 bg-base-900/95 backdrop-blur-sm md:bottom-0">
      <Link
        href="/domains"
        className="flex items-center gap-2.5 overflow-hidden px-3 py-2"
        aria-label="Domains expiring soon — open Domains"
      >
        <AlertTriangle size={14} className="shrink-0 text-amber-400" />
        <div className="ticker-viewport min-w-0 flex-1 overflow-hidden">
          <div
            className={cn("ticker-track flex w-max items-center gap-10 whitespace-nowrap text-xs animate-ticker-scroll")}
            style={{ "--ticker-duration": `${Math.max(15, items.length * 6)}s` } as CSSProperties}
          >
            {loopItems.map((item, i) => (
              <span key={`${item.id}-${i}`} className={item.overdue ? "text-rose-300" : "text-amber-200"}>
                {item.message}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
