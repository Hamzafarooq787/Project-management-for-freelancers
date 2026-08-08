"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Search, Trash2, Pencil, Plus, X, Download, Upload, History, ChevronDown, ArrowUp, ArrowDown, Minus, LineChart } from "lucide-react";
import type { Keyword, KeywordGroup, KeywordMonthlyPosition, KeywordPage, KeywordRankHistoryEntry, KeywordStatus } from "@/lib/types";
import {
  createKeywordAction,
  deleteKeywordAction,
  importKeywordsAction,
  setKeywordPageAction,
  setKeywordTrackedAction,
  updateKeywordAction,
} from "@/lib/actions";
import { cn, formatDateKey } from "@/lib/utils";
import { MonthlyPositionTracker } from "@/components/MonthlyPositionTracker";
import { KeywordGroupsCarousel } from "@/components/KeywordGroupsCarousel";

type SortMode = "default" | "rank_asc" | "rank_desc";

const SORT_LABEL: Record<SortMode, string> = {
  default: "Default order",
  rank_asc: "Rank: best (#1) first",
  rank_desc: "Rank: worst first",
};

function sortKeywords(keywords: Keyword[], mode: SortMode): Keyword[] {
  if (mode === "default") return keywords;
  return [...keywords].sort((a, b) => {
    if (a.currentRank === null && b.currentRank === null) return 0;
    if (a.currentRank === null) return 1;
    if (b.currentRank === null) return -1;
    return mode === "rank_asc" ? a.currentRank - b.currentRank : b.currentRank - a.currentRank;
  });
}

const STATUS_LABEL: Record<KeywordStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ranking: "Ranking",
  achieved: "Achieved",
};

const STATUS_STYLE: Record<KeywordStatus, string> = {
  not_started: "bg-base-700/60 text-neutral-400",
  in_progress: "bg-sky-500/15 text-sky-400",
  ranking: "bg-amber-500/15 text-amber-400",
  achieved: "bg-accent-500/15 text-accent-400",
};

const EXPORT_COLUMNS = [
  "Keyword",
  "Target Page",
  "Search Volume",
  "Difficulty",
  "Current Rank",
  "Target Rank",
  "Status",
  "Notes",
] as const;

function normalizeStatus(value: unknown): KeywordStatus {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return key in STATUS_LABEL ? (key as KeywordStatus) : "not_started";
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function exportKeywords(projectName: string, keywords: Keyword[]) {
  const XLSX = await import("xlsx");
  const rows = keywords.map((k) => ({
    Keyword: k.keyword,
    "Target Page": k.targetPage,
    "Search Volume": k.searchVolume ?? "",
    Difficulty: k.difficulty ?? "",
    "Current Rank": k.currentRank ?? "",
    "Target Rank": k.targetRank ?? "",
    Status: STATUS_LABEL[k.status],
    Notes: k.notes,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_COLUMNS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Keywords");
  const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "project";
  XLSX.writeFile(workbook, `${safeName}-keywords.xlsx`);
}

/** Reads any sheet column name case-insensitively, tolerating the header variants a keyword-tracker spreadsheet is likely to use. */
function pick(row: Record<string, unknown>, ...names: string[]): unknown {
  const lower = new Map(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const name of names) {
    const value = lower.get(name.toLowerCase());
    if (value !== undefined) return value;
  }
  return undefined;
}

async function parseKeywordFile(file: File) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  return rows.map((row) => ({
    keyword: String(pick(row, "keyword", "keywords") ?? "").trim(),
    targetPage: String(pick(row, "target page", "targetpage", "page", "url") ?? "").trim(),
    searchVolume: toNumberOrNull(pick(row, "search volume", "volume")),
    difficulty: toNumberOrNull(pick(row, "difficulty", "kd")),
    currentRank: toNumberOrNull(pick(row, "current rank", "rank")),
    targetRank: toNumberOrNull(pick(row, "target rank", "goal rank")),
    status: normalizeStatus(pick(row, "status")),
    notes: String(pick(row, "notes", "note") ?? "").trim(),
  }));
}

export function KeywordsPanel({
  projectId,
  projectName,
  keywords,
  rankHistory,
  monthlyPositions,
  groups,
  pagesByGroup,
}: {
  projectId: string;
  projectName: string;
  keywords: Keyword[];
  rankHistory: Record<string, KeywordRankHistoryEntry[]>;
  monthlyPositions: Record<string, KeywordMonthlyPosition[]>;
  groups: KeywordGroup[];
  pagesByGroup: Record<string, KeywordPage[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredKeywords = useMemo(() => {
    if (selectedPageId) return keywords.filter((k) => k.pageId === selectedPageId);
    if (selectedGroupId) {
      const pageIds = new Set((pagesByGroup[selectedGroupId] ?? []).map((p) => p.id));
      return keywords.filter((k) => k.pageId && pageIds.has(k.pageId));
    }
    return keywords;
  }, [keywords, pagesByGroup, selectedGroupId, selectedPageId]);

  const sortedKeywords = useMemo(() => sortKeywords(filteredKeywords, sortMode), [filteredKeywords, sortMode]);
  const trackedKeywords = useMemo(() => filteredKeywords.filter((k) => k.isTracked), [filteredKeywords]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportMessage(null);
    try {
      const rows = await parseKeywordFile(file);
      const withKeyword = rows.filter((r) => r.keyword);
      if (withKeyword.length === 0) {
        setImportMessage("No rows with a keyword found in that file.");
        return;
      }
      startTransition(async () => {
        const count = await importKeywordsAction(projectId, withKeyword);
        setImportMessage(`Imported ${count} keyword${count === 1 ? "" : "s"}.`);
      });
    } catch {
      setImportMessage("Couldn't read that file — make sure it's a .csv or .xlsx export.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <KeywordGroupsCarousel
        projectId={projectId}
        groups={groups}
        pagesByGroup={pagesByGroup}
        keywords={keywords}
        rankHistory={rankHistory}
        selectedGroupId={selectedGroupId}
        selectedPageId={selectedPageId}
        onSelectGroup={setSelectedGroupId}
        onSelectPage={setSelectedPageId}
      />

      <MonthlyPositionTracker
        projectId={projectId}
        projectName={projectName}
        keywords={trackedKeywords}
        positions={monthlyPositions}
      />

    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Keywords</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => exportKeywords(projectName, keywords)}
            disabled={keywords.length === 0}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300 disabled:opacity-40 disabled:hover:text-neutral-400"
          >
            <Download size={13} />
            Export
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300 disabled:opacity-50"
          >
            <Upload size={13} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
            >
              <Plus size={13} />
              Add keyword
            </button>
          )}
        </div>
      </div>

      {keywords.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-[11px] text-neutral-500">Sort</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
          >
            {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {SORT_LABEL[mode]}
              </option>
            ))}
          </select>
        </div>
      )}

      {importMessage && <p className="mb-3 text-xs text-neutral-400">{importMessage}</p>}

      {adding && (
        <div className="mb-3">
          <KeywordForm projectId={projectId} keyword={null} onCancel={() => setAdding(false)} onSaved={() => setAdding(false)} />
        </div>
      )}

      {sortedKeywords.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
          {keywords.length === 0
            ? "No keywords tracked yet. Add one to start tracking its rank over time."
            : "No keywords match the current group/page filter."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sortedKeywords.map((keyword) =>
          editingId === keyword.id ? (
            <KeywordForm
              key={keyword.id}
              projectId={projectId}
              keyword={keyword}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <KeywordRow
              key={keyword.id}
              keyword={keyword}
              history={rankHistory[keyword.id] ?? []}
              groups={groups}
              pagesByGroup={pagesByGroup}
              isPending={isPending}
              historyOpen={historyId === keyword.id}
              onToggleHistory={() => setHistoryId(historyId === keyword.id ? null : keyword.id)}
              onEdit={() => setEditingId(keyword.id)}
              onDelete={() => startTransition(() => deleteKeywordAction(keyword.id, projectId))}
              onPageChange={(pageId) => startTransition(() => setKeywordPageAction(keyword.id, projectId, pageId))}
              onRankChange={(rank) => {
                const formData = new FormData();
                formData.set("id", keyword.id);
                formData.set("projectId", projectId);
                formData.set("keyword", keyword.keyword);
                formData.set("targetPage", keyword.targetPage);
                formData.set("searchVolume", keyword.searchVolume?.toString() ?? "");
                formData.set("difficulty", keyword.difficulty?.toString() ?? "");
                formData.set("currentRank", rank);
                formData.set("targetRank", keyword.targetRank?.toString() ?? "");
                formData.set("status", keyword.status);
                formData.set("notes", keyword.notes);
                startTransition(() => updateKeywordAction(formData));
              }}
              onStatusChange={(status) => {
                const formData = new FormData();
                formData.set("id", keyword.id);
                formData.set("projectId", projectId);
                formData.set("keyword", keyword.keyword);
                formData.set("targetPage", keyword.targetPage);
                formData.set("searchVolume", keyword.searchVolume?.toString() ?? "");
                formData.set("difficulty", keyword.difficulty?.toString() ?? "");
                formData.set("currentRank", keyword.currentRank?.toString() ?? "");
                formData.set("targetRank", keyword.targetRank?.toString() ?? "");
                formData.set("status", status);
                formData.set("notes", keyword.notes);
                startTransition(() => updateKeywordAction(formData));
              }}
              onToggleTracked={() =>
                startTransition(() => setKeywordTrackedAction(keyword.id, projectId, !keyword.isTracked))
              }
            />
          ),
        )}
      </div>
    </div>
    </div>
  );
}

function KeywordRow({
  keyword,
  history,
  groups,
  pagesByGroup,
  historyOpen,
  onToggleHistory,
  isPending,
  onEdit,
  onDelete,
  onRankChange,
  onStatusChange,
  onToggleTracked,
  onPageChange,
}: {
  keyword: Keyword;
  history: KeywordRankHistoryEntry[];
  groups: KeywordGroup[];
  pagesByGroup: Record<string, KeywordPage[]>;
  historyOpen: boolean;
  onToggleHistory: () => void;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRankChange: (rank: string) => void;
  onStatusChange: (status: KeywordStatus) => void;
  onToggleTracked: () => void;
  onPageChange: (pageId: string | null) => void;
}) {
  const assignedPage = keyword.pageId
    ? Object.values(pagesByGroup)
        .flat()
        .find((p) => p.id === keyword.pageId)
    : null;
  const assignedGroup = assignedPage ? groups.find((g) => g.id === assignedPage.groupId) : null;

  return (
    <div className="rounded-lg border border-base-700/60 bg-base-900 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-100">{keyword.keyword}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
            {assignedPage && (
              <span className="truncate text-accent-400">
                {assignedGroup ? `${assignedGroup.name} / ` : ""}
                {assignedPage.name}
              </span>
            )}
            {!assignedPage && keyword.targetPage && <span className="truncate">{keyword.targetPage}</span>}
            {keyword.searchVolume !== null && <span>Vol {keyword.searchVolume.toLocaleString()}</span>}
            {keyword.difficulty !== null && <span>KD {keyword.difficulty}</span>}
            {keyword.targetRank !== null && <span>Target #{keyword.targetRank}</span>}
          </div>
          {keyword.notes && <p className="mt-1 truncate text-xs text-neutral-500">{keyword.notes}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {groups.length > 0 && (
            <select
              value={keyword.pageId ?? ""}
              onChange={(e) => onPageChange(e.target.value || null)}
              className="max-w-[9rem] rounded-md border border-base-600 bg-base-950 px-2 py-1 text-[11px] text-neutral-300 focus:border-accent-500 focus:outline-none"
              title="Assign to page"
            >
              <option value="">Ungrouped</option>
              {groups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {(pagesByGroup[group.id] ?? []).map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            Rank
            <input
              type="number"
              min="0"
              defaultValue={keyword.currentRank ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (keyword.currentRank?.toString() ?? "")) onRankChange(e.target.value);
              }}
              className="w-16 rounded-md border border-base-600 bg-base-950 px-2 py-1 text-xs text-neutral-100 focus:border-accent-500 focus:outline-none"
            />
          </label>
          <select
            value={keyword.status}
            onChange={(e) => onStatusChange(e.target.value as KeywordStatus)}
            className={cn("rounded-full border-0 px-2.5 py-1 text-[11px] font-medium focus:outline-none", STATUS_STYLE[keyword.status])}
          >
            {(Object.keys(STATUS_LABEL) as KeywordStatus[]).map((s) => (
              <option key={s} value={s} className="bg-base-900 text-neutral-100">
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleHistory}
            disabled={history.length === 0}
            className="flex items-center gap-1 rounded-md p-1.5 text-neutral-400 hover:text-accent-300 disabled:opacity-30 disabled:hover:text-neutral-400"
            title="Rank history"
          >
            <History size={13} />
            <ChevronDown size={11} className={cn("transition-transform", historyOpen && "rotate-180")} />
          </button>
          <button
            type="button"
            onClick={onToggleTracked}
            className={cn(
              "flex items-center gap-1 rounded-md p-1.5 hover:text-accent-300",
              keyword.isTracked ? "text-accent-400" : "text-neutral-400",
            )}
            title={keyword.isTracked ? "Remove from monthly tracker" : "Add to monthly tracker"}
          >
            <LineChart size={13} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-neutral-400 hover:text-accent-300"
            title="Edit keyword"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onDelete}
            className="rounded-md p-1.5 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
            title="Delete keyword"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {historyOpen && <RankHistoryList history={history} />}
    </div>
  );
}

function RankHistoryList({ history }: { history: KeywordRankHistoryEntry[] }) {
  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-base-700/60 pt-2.5">
      {history.map((entry, i) => {
        const previous = history[i + 1];
        const delta = previous && entry.rank !== null && previous.rank !== null ? previous.rank - entry.rank : null;
        return (
          <div key={entry.id} className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">{formatDateKey(entry.recordedOn)}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-200">{entry.rank !== null ? `#${entry.rank}` : "Not ranking"}</span>
              {delta !== null && delta !== 0 && (
                <span className={cn("flex items-center gap-0.5", delta > 0 ? "text-accent-400" : "text-rose-400")}>
                  {delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {Math.abs(delta)}
                </span>
              )}
              {delta === 0 && <Minus size={11} className="text-neutral-600" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KeywordForm({
  projectId,
  keyword,
  onSaved,
  onCancel,
}: {
  projectId: string;
  keyword: Keyword | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        formData.set("projectId", projectId);
        if (keyword) formData.set("id", keyword.id);
        startTransition(async () => {
          await (keyword ? updateKeywordAction(formData) : createKeywordAction(formData));
          onSaved();
        });
      }}
      className="flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{keyword ? "Edit keyword" : "New keyword"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name="keyword"
          required
          placeholder="Keyword or phrase"
          defaultValue={keyword?.keyword ?? ""}
          className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
        <input
          name="targetPage"
          placeholder="Target page / URL"
          defaultValue={keyword?.targetPage ?? ""}
          className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField name="searchVolume" label="Volume" defaultValue={keyword?.searchVolume} />
        <NumberField name="difficulty" label="Difficulty" defaultValue={keyword?.difficulty} />
        <NumberField name="currentRank" label="Current rank" defaultValue={keyword?.currentRank} />
        <NumberField name="targetRank" label="Target rank" defaultValue={keyword?.targetRank} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Status</label>
        <select
          name="status"
          defaultValue={keyword?.status ?? "not_started"}
          className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none sm:w-48"
        >
          {(Object.keys(STATUS_LABEL) as KeywordStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="notes"
        rows={2}
        placeholder="Notes (optional)"
        defaultValue={keyword?.notes ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save keyword"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-fit rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: number | null }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-neutral-500">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
      />
    </div>
  );
}
