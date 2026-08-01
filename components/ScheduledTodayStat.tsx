"use client";

import { Star } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatCard } from "./StatCard";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Counts from the browser's own local date, not the server's, so it's never a day off near midnight. */
export function ScheduledTodayStat({ tasks }: { tasks: Task[] }) {
  const count = tasks.filter((t) => t.scheduledFor === todayKey()).length;
  return <StatCard label="Scheduled today" value={count} icon={Star} tone="amber" />;
}
