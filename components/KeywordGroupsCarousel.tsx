"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, FolderPlus, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Keyword, KeywordGroup, KeywordGroupColor, KeywordPage, KeywordRankHistoryEntry } from "@/lib/types";
import { KEYWORD_GROUP_COLORS } from "@/lib/types";
import {
  createKeywordGroupAction,
  createKeywordPageAction,
  deleteKeywordGroupAction,
  deleteKeywordPageAction,
  updateKeywordGroupAction,
  updateKeywordPageAction,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import { DragScrollRow } from "@/components/DragScrollRow";

const COLOR_STYLE: Record<KeywordGroupColor, { bg: string; text: string; border: string; ring: string }> = {
  accent: { bg: "bg-accent-500/15", text: "text-accent-400", border: "border-accent-500/30", ring: "ring-accent-500" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30", ring: "ring-sky-500" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", ring: "ring-amber-500" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", ring: "ring-rose-500" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", ring: "ring-violet-500" },
  neutral: { bg: "bg-base-700/60", text: "text-neutral-400", border: "border-base-600", ring: "ring-neutral-500" },
};

interface Metrics {
  avgRank: number | null;
  trend: number | null;
}

function computeMetrics(keywords: Keyword[], rankHistory: Record<string, KeywordRankHistoryEntry[]>): Metrics {
  const ranked = keywords.filter((k) => k.currentRank !== null);
  const avgRank = ranked.length > 0 ? Math.round(ranked.reduce((sum, k) => sum + (k.currentRank ?? 0), 0) / ranked.length) : null;

  const deltas: number[] = [];
  for (const keyword of keywords) {
    const history = rankHistory[keyword.id] ?? [];
    const [latest, previous] = history;
    if (latest?.rank !== null && latest?.rank !== undefined && previous?.rank !== null && previous?.rank !== undefined) {
      deltas.push(previous.rank - latest.rank);
    }
  }
  const trend = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;

  return { avgRank, trend };
}

function MetricBadge({ metrics }: { metrics: Metrics }) {
  if (metrics.avgRank === null) return <span className="text-[11px] text-neutral-600">No rank data</span>;
  return (
    <span className="flex items-center gap-1 text-[11px] text-neutral-400">
      Avg #{metrics.avgRank}
      {metrics.trend !== null && metrics.trend !== 0 && (
        <span className={cn("flex items-center gap-0.5", metrics.trend > 0 ? "text-accent-400" : "text-rose-400")}>
          {metrics.trend > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
          {Math.abs(metrics.trend)}
        </span>
      )}
    </span>
  );
}

export function KeywordGroupsCarousel({
  projectId,
  groups,
  pagesByGroup,
  keywords,
  rankHistory,
  selectedGroupId,
  selectedPageId,
  onSelectGroup,
  onSelectPage,
}: {
  projectId: string;
  groups: KeywordGroup[];
  pagesByGroup: Record<string, KeywordPage[]>;
  keywords: Keyword[];
  rankHistory: Record<string, KeywordRankHistoryEntry[]>;
  selectedGroupId: string | null;
  selectedPageId: string | null;
  onSelectGroup: (id: string | null) => void;
  onSelectPage: (id: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [addingGroup, setAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const pagesInSelectedGroup = selectedGroupId ? pagesByGroup[selectedGroupId] ?? [] : [];

  function keywordsForGroup(group: KeywordGroup): Keyword[] {
    const pageIds = new Set((pagesByGroup[group.id] ?? []).map((p) => p.id));
    return keywords.filter((k) => k.pageId && pageIds.has(k.pageId));
  }

  function keywordsForPage(page: KeywordPage): Keyword[] {
    return keywords.filter((k) => k.pageId === page.id);
  }

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Keyword Groups</h2>
        </div>
        <div className="flex items-center gap-3">
          {(selectedGroupId || selectedPageId) && (
            <button
              type="button"
              onClick={() => {
                onSelectGroup(null);
                onSelectPage(null);
              }}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300"
            >
              <X size={13} />
              Clear filter
            </button>
          )}
          {!addingGroup && (
            <button
              type="button"
              onClick={() => setAddingGroup(true)}
              className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
            >
              <FolderPlus size={13} />
              New group
            </button>
          )}
        </div>
      </div>

      {addingGroup && (
        <GroupForm
          projectId={projectId}
          group={null}
          onCancel={() => setAddingGroup(false)}
          onSaved={() => setAddingGroup(false)}
        />
      )}

      {groups.length === 0 && !addingGroup && (
        <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
          No groups yet. Create one to organize keywords by topic or content silo.
        </p>
      )}

      {groups.length > 0 && (
        <DragScrollRow className="-mx-1 px-1 pb-2">
          {groups.map((group) =>
            editingGroupId === group.id ? (
              <div key={group.id} className="w-64 shrink-0">
                <GroupForm
                  projectId={projectId}
                  group={group}
                  onCancel={() => setEditingGroupId(null)}
                  onSaved={() => setEditingGroupId(null)}
                />
              </div>
            ) : (
              <GroupCard
                key={group.id}
                group={group}
                pageCount={(pagesByGroup[group.id] ?? []).length}
                metrics={computeMetrics(keywordsForGroup(group), rankHistory)}
                selected={selectedGroupId === group.id}
                onSelect={() => {
                  onSelectGroup(selectedGroupId === group.id ? null : group.id);
                  onSelectPage(null);
                }}
                onEdit={() => setEditingGroupId(group.id)}
                onDelete={() => startTransition(() => deleteKeywordGroupAction(group.id, projectId))}
                isPending={isPending}
              />
            ),
          )}
        </DragScrollRow>
      )}

      {selectedGroup && (
        <div className="mt-4 border-t border-base-700/60 pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Pages in &ldquo;{selectedGroup.name}&rdquo;
            </p>
            {!addingPage && (
              <button
                type="button"
                onClick={() => setAddingPage(true)}
                className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
              >
                <Plus size={13} />
                New page
              </button>
            )}
          </div>

          {addingPage && (
            <PageForm
              groupId={selectedGroup.id}
              projectId={projectId}
              page={null}
              onCancel={() => setAddingPage(false)}
              onSaved={() => setAddingPage(false)}
            />
          )}

          {pagesInSelectedGroup.length === 0 && !addingPage && (
            <p className="rounded-lg border border-dashed border-base-700 p-4 text-center text-xs text-neutral-500">
              No pages in this group yet.
            </p>
          )}

          {pagesInSelectedGroup.length > 0 && (
            <DragScrollRow className="-mx-1 px-1 pb-1">
              {pagesInSelectedGroup.map((page) =>
                editingPageId === page.id ? (
                  <div key={page.id} className="w-60 shrink-0">
                    <PageForm
                      groupId={selectedGroup.id}
                      projectId={projectId}
                      page={page}
                      onCancel={() => setEditingPageId(null)}
                      onSaved={() => setEditingPageId(null)}
                    />
                  </div>
                ) : (
                  <PageCard
                    key={page.id}
                    page={page}
                    keywordCount={keywordsForPage(page).length}
                    metrics={computeMetrics(keywordsForPage(page), rankHistory)}
                    selected={selectedPageId === page.id}
                    onSelect={() => onSelectPage(selectedPageId === page.id ? null : page.id)}
                    onEdit={() => setEditingPageId(page.id)}
                    onDelete={() => startTransition(() => deleteKeywordPageAction(page.id, projectId))}
                    isPending={isPending}
                  />
                ),
              )}
            </DragScrollRow>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  pageCount,
  metrics,
  selected,
  onSelect,
  onEdit,
  onDelete,
  isPending,
}: {
  group: KeywordGroup;
  pageCount: number;
  metrics: Metrics;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const style = COLOR_STYLE[group.color];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-64 shrink-0 rounded-lg border p-3 text-left transition-colors",
        selected ? cn(style.border, style.bg, "ring-1", style.ring) : "border-base-700/60 bg-base-900 hover:border-base-600",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("truncate text-sm font-medium", selected ? style.text : "text-neutral-100")}>{group.name}</p>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded p-1 text-neutral-400 hover:text-accent-300"
          >
            <Pencil size={12} />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (!isPending) onDelete();
            }}
            className="rounded p-1 text-neutral-400 hover:text-rose-400"
          >
            <Trash2 size={12} />
          </span>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">
        {pageCount} page{pageCount === 1 ? "" : "s"}
      </p>
      <div className="mt-2">
        <MetricBadge metrics={metrics} />
      </div>
    </button>
  );
}

function PageCard({
  page,
  keywordCount,
  metrics,
  selected,
  onSelect,
  onEdit,
  onDelete,
  isPending,
}: {
  page: KeywordPage;
  keywordCount: number;
  metrics: Metrics;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-60 shrink-0 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-accent-500/30 bg-accent-500/10 ring-1 ring-accent-500" : "border-base-700/60 bg-base-900 hover:border-base-600",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("truncate text-sm font-medium", selected ? "text-accent-400" : "text-neutral-100")}>{page.name}</p>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded p-1 text-neutral-400 hover:text-accent-300"
          >
            <Pencil size={12} />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (!isPending) onDelete();
            }}
            className="rounded p-1 text-neutral-400 hover:text-rose-400"
          >
            <Trash2 size={12} />
          </span>
        </div>
      </div>
      {page.url && <p className="mt-1 truncate text-[11px] text-neutral-500">{page.url}</p>}
      <p className="mt-1 text-[11px] text-neutral-500">
        {keywordCount} keyword{keywordCount === 1 ? "" : "s"}
      </p>
      <div className="mt-2">
        <MetricBadge metrics={metrics} />
      </div>
    </button>
  );
}

function GroupForm({
  projectId,
  group,
  onCancel,
  onSaved,
}: {
  projectId: string;
  group: KeywordGroup | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [color, setColor] = useState<KeywordGroupColor>(group?.color ?? "accent");

  return (
    <form
      action={(formData) => {
        const name = String(formData.get("name") ?? "").trim();
        if (!name) return;
        startTransition(async () => {
          if (group) await updateKeywordGroupAction(group.id, projectId, { name, color });
          else await createKeywordGroupAction(projectId, name, color);
          onSaved();
        });
      }}
      className="mb-3 flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{group ? "Edit group" : "New group"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      <input
        name="name"
        required
        placeholder="Group name (e.g. Blog Content)"
        defaultValue={group?.name ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex items-center gap-1.5">
        {KEYWORD_GROUP_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn(
              "h-6 w-6 rounded-full border-2",
              COLOR_STYLE[c].bg,
              color === c ? COLOR_STYLE[c].border : "border-transparent",
            )}
            aria-label={c}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save group"}
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

function PageForm({
  groupId,
  projectId,
  page,
  onCancel,
  onSaved,
}: {
  groupId: string;
  projectId: string;
  page: KeywordPage | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        const name = String(formData.get("name") ?? "").trim();
        const url = String(formData.get("url") ?? "").trim();
        if (!name) return;
        startTransition(async () => {
          if (page) await updateKeywordPageAction(page.id, projectId, { name, url });
          else await createKeywordPageAction(groupId, projectId, name, url);
          onSaved();
        });
      }}
      className="mb-3 flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{page ? "Edit page" : "New page"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      <input
        name="name"
        required
        placeholder="Page name (e.g. Homepage)"
        defaultValue={page?.name ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <input
        name="url"
        placeholder="URL (optional)"
        defaultValue={page?.url ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save page"}
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
