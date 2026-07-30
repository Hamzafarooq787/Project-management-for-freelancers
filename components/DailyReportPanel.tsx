"use client";

import { useMemo, useState } from "react";
import { CalendarClock, FileDown } from "lucide-react";
import type { Project, Task } from "@/lib/types";

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

export function DailyReportPanel({ project, tasks }: { project: Project; tasks: Task[] }) {
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
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 48;
      const rightEdge = 548;
      let y = 56;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(20);
      doc.text(project.name, marginX, y);
      y += 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(90);
      const clientLine = project.clientDetails.company || project.clientDetails.name || project.client;
      if (clientLine) {
        doc.text(`Client: ${clientLine}`, marginX, y);
        y += 16;
      }
      doc.text(`SEO Daily Report — ${displayDate}`, marginX, y);
      y += 26;

      doc.setDrawColor(210);
      doc.line(marginX, y, rightEdge, y);
      y += 24;

      if (grouped.size === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(120);
        doc.text("No tasks were completed on this date.", marginX, y);
        y += 20;
      }

      for (const [group, stageTasks] of grouped) {
        if (y > 760) {
          doc.addPage();
          y = 56;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(20, 110, 70);
        doc.text(group, marginX, y);
        y += 18;

        for (const task of stageTasks) {
          if (y > 780) {
            doc.addPage();
            y = 56;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(30);
          const lines = doc.splitTextToSize(`•  ${task.title}`, 480) as string[];
          doc.text(lines, marginX + 8, y);
          y += 16 * lines.length;

          if (task.notes) {
            doc.setTextColor(120);
            const noteLines = doc.splitTextToSize(task.notes, 460) as string[];
            doc.text(noteLines, marginX + 22, y);
            y += 14 * noteLines.length;
          }
        }
        y += 10;
      }

      if (notes.trim()) {
        if (y > 700) {
          doc.addPage();
          y = 56;
        }
        y += 10;
        doc.setDrawColor(230);
        doc.line(marginX, y, rightEdge, y);
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20);
        doc.text("Notes for client", marginX, y);
        y += 18;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(50);
        const noteLines = doc.splitTextToSize(notes.trim(), 480) as string[];
        doc.text(noteLines, marginX, y);
      }

      const safeName = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      doc.save(`${safeName}-seo-report-${date}.pdf`);
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
