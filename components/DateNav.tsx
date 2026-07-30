"use client";

import { useRouter } from "next/navigation";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateNav({ date, basePath }: { date: string; basePath: string }) {
  const router = useRouter();
  const isToday = date === todayKey();

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => router.push(`${basePath}?date=${e.target.value}`)}
        className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
      />
      {!isToday && (
        <button
          onClick={() => router.push(basePath)}
          className="rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-accent-500/50 hover:text-accent-300"
        >
          Today
        </button>
      )}
    </div>
  );
}
