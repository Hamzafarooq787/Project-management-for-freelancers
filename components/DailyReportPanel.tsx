"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, FileDown } from "lucide-react";
import type { BusinessProfile, Project, Task } from "@/lib/types";
import { generateSeoDailyReportPdf } from "@/lib/reportPdf";

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return toLocalDateKey(new Date().toISOString());
}

export function DailyReportPanel({
  project,
  tasks,
  businessProfile,
}: {
  project: Project;
  tasks: Task[];
  businessProfile: BusinessProfile;
}) {
  const [date, setDate] = useState(todayKey());
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const stageName = useMemo(() => {
    const map = new Map(project.stages.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? (map.get(id) ?? "Other") : "Other");
  }, [project.stages]);

  const completedOnDate = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt && toLocalDateKey(t.completedAt) === date)
        .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1)),
    [tasks, date],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of completedOnDate) {
      const name = stageName(task.stageId);
      const list = map.get(name) ?? [];
      list.push(task);
      map.set(name, list);
    }
    return map;
  }, [completedOnDate, stageName]);

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function downloadPdf() {
    setGenerating(true);
    try {
      await generateSeoDailyReportPdf({
        project,
        businessProfile,
        date,
        displayDate,
        groups: [...grouped.entries()].map(([name, groupTasks]) => ({ name, tasks: groupTasks })),
        clientNote: notes,
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Daily Report</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
          <button
            onClick={downloadPdf}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
          >
            <FileDown size={14} />
            {generating ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-neutral-500">{displayDate}</p>

      {!businessProfile.companyName && !businessProfile.logoUrl && (
        <p className="mb-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          Add your company name and logo in{" "}
          <Link href="/settings" className="underline hover:text-amber-200">
            Settings
          </Link>{" "}
          so reports are properly branded.
        </p>
      )}

      {grouped.size === 0 ? (
        <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
          No tasks completed on this date yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([group, stageTasks]) => (
            <div key={group}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent-400">{group}</h3>
              <ul className="flex flex-col gap-1">
                {stageTasks.map((task) => (
                  <li key={task.id} className="rounded-md bg-base-900/50 px-3 py-2 text-sm text-neutral-200">
                    {task.title}
                    {task.notes && <p className="mt-0.5 text-xs text-neutral-500">{task.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-neutral-400">
          Notes for client (optional, included in the PDF)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add any context you want to share alongside today's work…"
          className="w-full rounded-md border border-base-600 bg-base-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
