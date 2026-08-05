"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarRange, Download, FileText } from "lucide-react";
import type { Keyword, KeywordMonthlyPosition } from "@/lib/types";
import { setMonthlyPositionAction } from "@/lib/actions";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum) return month;
  return new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

async function exportXlsx(projectName: string, keywords: Keyword[], months: string[], byKeyword: Record<string, Map<string, number | null>>) {
  const XLSX = await import("xlsx");
  const rows = keywords.map((k) => {
    const row: Record<string, string | number> = { Keyword: k.keyword };
    for (const month of months) {
      const rank = byKeyword[k.id]?.get(month) ?? null;
      row[monthLabel(month)] = rank ?? "";
    }
    return row;
  });
  const sheet = XLSX.utils.json_to_sheet(rows, { header: ["Keyword", ...months.map(monthLabel)] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Monthly Positions");
  const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "project";
  XLSX.writeFile(workbook, `${safeName}-monthly-positions.xlsx`);
}

async function exportPdf(projectName: string, keywords: Keyword[], months: string[], byKeyword: Record<string, Map<string, number | null>>) {
  const { jsPDF } = await import("jspdf");
  const PAGE_WIDTH = 841.89;
  const PAGE_HEIGHT = 595.28;
  const MARGIN_X = 40;
  const RIGHT_EDGE = PAGE_WIDTH - MARGIN_X;
  const CONTENT_WIDTH = RIGHT_EDGE - MARGIN_X;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  const columns = ["Keyword", ...months.map(monthLabel)];
  const keywordColWidth = 180;
  const monthColWidth = months.length > 0 ? (CONTENT_WIDTH - keywordColWidth) / months.length : 0;
  const colWidths = [keywordColWidth, ...months.map(() => monthColWidth)];
  const rowHeight = 22;

  let y = 50;

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(`${projectName} — Monthly Keyword Positions`, MARGIN_X, y);
  y += 24;

  function drawRow(values: string[], opts: { header?: boolean } = {}) {
    let x = MARGIN_X;
    if (opts.header) {
      doc.setFillColor(230, 230, 230);
      doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, "F");
    }
    doc.setFontSize(9);
    doc.setTextColor(opts.header ? 20 : 60, opts.header ? 20 : 60, opts.header ? 20 : 60);
    values.forEach((value, i) => {
      doc.text(value, x + 6, y + rowHeight / 2 + 3);
      x += colWidths[i] ?? monthColWidth;
    });
    doc.setDrawColor(210, 210, 210);
    doc.line(MARGIN_X, y + rowHeight, RIGHT_EDGE, y + rowHeight);
    y += rowHeight;
  }

  function ensureSpace() {
    if (y + rowHeight > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = 50;
    }
  }

  drawRow(columns, { header: true });
  for (const keyword of keywords) {
    ensureSpace();
    const values = [keyword.keyword, ...months.map((m) => {
      const rank = byKeyword[keyword.id]?.get(m) ?? null;
      return rank !== null ? `#${rank}` : "—";
    })];
    drawRow(values);
  }

  const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "project";
  doc.save(`${safeName}-monthly-positions.pdf`);
}

export function MonthlyPositionTracker({
  projectId,
  projectName,
  keywords,
  positions,
}: {
  projectId: string;
  projectName: string;
  keywords: Keyword[];
  positions: Record<string, KeywordMonthlyPosition[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set<string>([currentMonthKey()]);
    for (const list of Object.values(positions)) {
      for (const entry of list) set.add(entry.month);
    }
    return Array.from(set).sort();
  }, [positions]);

  const byKeyword = useMemo(() => {
    const map: Record<string, Map<string, number | null>> = {};
    for (const [keywordId, list] of Object.entries(positions)) {
      map[keywordId] = new Map(list.map((entry) => [entry.month, entry.rank]));
    }
    return map;
  }, [positions]);

  function handleChange(keywordId: string, month: string, value: string) {
    const rank = value.trim() === "" ? null : Number(value);
    if (rank !== null && !Number.isFinite(rank)) return;
    setPendingCell(`${keywordId}:${month}`);
    startTransition(async () => {
      await setMonthlyPositionAction(keywordId, projectId, month, rank);
      setPendingCell(null);
    });
  }

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Monthly Position Tracker</h2>
        </div>
        {keywords.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => exportXlsx(projectName, keywords, months, byKeyword)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300"
            >
              <Download size={13} />
              Export XLSX
            </button>
            <button
              type="button"
              onClick={() => exportPdf(projectName, keywords, months, byKeyword)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300"
            >
              <FileText size={13} />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {keywords.length === 0 ? (
        <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
          No keywords in the monthly tracker yet. Use the chart icon on a keyword below to add it here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 border-b border-base-700/60 bg-base-850 px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Keyword
                </th>
                {months.map((month) => (
                  <th
                    key={month}
                    className="border-b border-base-700/60 px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500"
                  >
                    {monthLabel(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keywords.map((keyword) => (
                <tr key={keyword.id} className="border-b border-base-800/60">
                  <td className="sticky left-0 bg-base-850 px-2 py-1.5 text-neutral-200">{keyword.keyword}</td>
                  {months.map((month) => {
                    const cellKey = `${keyword.id}:${month}`;
                    const rank = byKeyword[keyword.id]?.get(month) ?? null;
                    return (
                      <td key={month} className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          defaultValue={rank ?? ""}
                          disabled={isPending && pendingCell === cellKey}
                          onBlur={(e) => {
                            if (e.target.value !== (rank?.toString() ?? "")) handleChange(keyword.id, month, e.target.value);
                          }}
                          className="w-16 rounded-md border border-base-600 bg-base-950 px-2 py-1 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
