"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewKind = "image" | "pdf" | "sheet";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg", "gif"];
const SHEET_EXTENSIONS = ["xlsx", "xls", "csv"];

export function getPreviewKind(name: string, type: string): PreviewKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.includes(ext) || type.startsWith("image/")) return "image";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  if (SHEET_EXTENSIONS.includes(ext)) return "sheet";
  return null;
}

interface SheetTab {
  name: string;
  rows: string[][];
  truncated: boolean;
}

const MAX_PREVIEW_ROWS = 500;

async function parseSheetFile(url: string): Promise<SheetTab[]> {
  const [XLSX, response] = await Promise.all([import("xlsx"), fetch(url)]);
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const allRows = (sheet ? XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false }) : []).map(
      (row) => row.map((cell) => String(cell ?? "")),
    );
    return { name, rows: allRows.slice(0, MAX_PREVIEW_ROWS), truncated: allRows.length > MAX_PREVIEW_ROWS };
  });
}

export function AttachmentPreviewModal({
  file,
  onClose,
}: {
  file: { url: string; name: string; type: string };
  onClose: () => void;
}) {
  const kind = getPreviewKind(file.name, file.type);
  const [sheets, setSheets] = useState<SheetTab[] | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "sheet") return;
    let cancelled = false;
    setSheets(null);
    setError(null);
    parseSheetFile(file.url)
      .then((result) => {
        if (!cancelled) setSheets(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't read this file.");
      });
    return () => {
      cancelled = true;
    };
  }, [kind, file.url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl2 border border-base-700/60 bg-base-850 p-5 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium text-neutral-100">{file.name}</p>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={file.url}
              download={file.name}
              target="_blank"
              rel="noreferrer"
              title="Download"
              className="rounded-md p-1.5 text-neutral-400 hover:text-accent-300"
            >
              <Download size={16} />
            </a>
            <button onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-base-700/60 hover:text-neutral-300">
              <X size={18} />
            </button>
          </div>
        </div>

        {kind === "image" && (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.url} alt={file.name} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
          </div>
        )}

        {kind === "pdf" && <iframe src={file.url} title={file.name} className="h-[80vh] w-full rounded-lg border border-base-700/60" />}

        {kind === "sheet" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {!error && !sheets && <p className="text-sm text-neutral-500">Loading…</p>}
            {!error && sheets && (
              <>
                {sheets.length > 1 && (
                  <div className="mb-3 flex flex-wrap gap-1.5 border-b border-base-700/60 pb-2">
                    {sheets.map((sheet, i) => (
                      <button
                        key={sheet.name}
                        type="button"
                        onClick={() => setActiveSheet(i)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium",
                          activeSheet === i
                            ? "bg-accent-500/15 text-accent-300"
                            : "text-neutral-400 hover:bg-base-800 hover:text-neutral-200",
                        )}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-base-700/60">
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {sheets[activeSheet]?.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex === 0 ? "bg-base-800" : "odd:bg-base-900 even:bg-base-900/60"}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={cn(
                                "whitespace-nowrap border border-base-700/60 px-2.5 py-1.5 text-neutral-200",
                                rowIndex === 0 && "font-medium text-neutral-100",
                              )}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sheets[activeSheet]?.rows.length === 0 && (
                    <p className="p-4 text-center text-sm text-neutral-500">This sheet is empty.</p>
                  )}
                </div>
                {sheets[activeSheet]?.truncated && (
                  <p className="mt-2 text-[11px] text-neutral-500">
                    Showing the first {MAX_PREVIEW_ROWS} rows — download the file to see the rest.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {kind === null && (
          <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
            Preview isn&rsquo;t available for this file type. Use the download button above.
          </p>
        )}
      </div>
    </div>
  );
}
