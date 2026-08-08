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

const COLOR_STYLE: Record<KeywordGroupColor, { bg: string; text: string; border: string }> = {
  accent: { bg: "bg-accent-500/15", text: "text-accent-400", border: "border-accent-500/30" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  neutral: { bg: "bg-base-700/60", text: "text-neutral-400", border: "border-base-600" },
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
  onOpenPage,
}: {
  projectId: string;
  groups: KeywordGroup[];
  pagesByGroup: Record<string, KeywordPage[]>;
  keywords: Keyword[];
  rankHistory: Record<string, KeywordRankHistoryEntry[]>;
  onOpenPage: (page: KeywordPage) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [addingGroup, setAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [addingPageForGroupId, setAddingPageForGroupId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  function keywordsForGroup(group: KeywordGroup): Keyword[] {
    const pageIds = new Set((pagesByGroup[group.id] ?? []).map((p) => p.id));
    return keywords.filter((k) => k.pageIds.some((id) => pageIds.has(id)));
  }

  function keywordsForPage(page: KeywordPage): Keyword[] {
    return keywords.filter((k) => k.pageIds.includes(page.id));
  }

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Keyword Groups</h2>
        </div>
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
        <DragScrollRow className="-mx-1 items-start px-1 pb-2">
          {groups.map((group) =>
            editingGroupId === group.id ? (
              <div key={group.id} className="w-72 shrink-0">
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
                pages={pagesByGroup[group.id] ?? []}
                metrics={computeMetrics(keywordsForGroup(group), rankHistory)}
                pageMetrics={(page) => computeMetrics(keywordsForPage(page), rankHistory)}
                pageKeywordCount={(page) => keywordsForPage(page).length}
                onEdit={() => setEditingGroupId(group.id)}
                onDelete={() => startTransition(() => deleteKeywordGroupAction(group.id, projectId))}
                onOpenPage={onOpenPage}
                addingPage={addingPageForGroupId === group.id}
                onStartAddPage={() => setAddingPageForGroupId(group.id)}
                onCancelAddPage={() => setAddingPageForGroupId(null)}
                editingPageId={editingPageId}
                onEditPage={setEditingPageId}
                onCancelEditPage={() => setEditingPageId(null)}
                onDeletePage={(pageId) => startTransition(() => deleteKeywordPageAction(pageId, projectId))}
                projectId={projectId}
                isPending={isPending}
              />
            ),
          )}
        </DragScrollRow>
      )}
    </div>
  );
}

function GroupCard({
  group,
  pages,
  metrics,
  pageMetrics,
  pageKeywordCount,
  onEdit,
  onDelete,
  onOpenPage,
  addingPage,
  onStartAddPage,
  onCancelAddPage,
  editingPageId,
  onEditPage,
  onCancelEditPage,
  onDeletePage,
  projectId,
  isPending,
}: {
  group: KeywordGroup;
  pages: KeywordPage[];
  metrics: Metrics;
  pageMetrics: (page: KeywordPage) => Metrics;
  pageKeywordCount: (page: KeywordPage) => number;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPage: (page: KeywordPage) => void;
  addingPage: boolean;
  onStartAddPage: () => void;
  onCancelAddPage: () => void;
  editingPageId: string | null;
  onEditPage: (id: string) => void;
  onCancelEditPage: () => void;
  onDeletePage: (id: string) => void;
  projectId: string;
  isPending: boolean;
}) {
  const style = COLOR_STYLE[group.color];
  return (
    <div className={cn("group w-72 shrink-0 rounded-lg border p-3", style.border, style.bg)}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("truncate text-sm font-medium", style.text)}>{group.name}</p>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={onEdit} className="rounded p-1 text-neutral-400 hover:text-accent-300">
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={() => !isPending && onDelete()}
            className="rounded p-1 text-neutral-400 hover:text-rose-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-[11px] text-neutral-500">
          {pages.length} page{pages.length === 1 ? "" : "s"}
        </p>
        <MetricBadge metrics={metrics} />
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-base-700/40 pt-2.5">
        {pages.map((page) =>
          editingPageId === page.id ? (
            <PageForm
              key={page.id}
              groupId={group.id}
              projectId={projectId}
              page={page}
              onCancel={onCancelEditPage}
              onSaved={onCancelEditPage}
            />
          ) : (
            <div
              key={page.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenPage(page)}
              className="group/page flex cursor-pointer items-center justify-between gap-2 rounded-md bg-base-900/60 px-2 py-1.5 hover:bg-base-900"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-neutral-200">{page.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500">
                    {pageKeywordCount(page)} kw
                  </span>
                  <MetricBadge metrics={pageMetrics(page)} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/page:opacity-100">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPage(page.id);
                  }}
                  className="rounded p-1 text-neutral-400 hover:text-accent-300"
                >
                  <Pencil size={11} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isPending) onDeletePage(page.id);
                  }}
                  className="rounded p-1 text-neutral-400 hover:text-rose-400"
                >
                  <Trash2 size={11} />
                </span>
              </div>
            </div>
          ),
        )}

        {addingPage ? (
          <PageForm groupId={group.id} projectId={projectId} page={null} onCancel={onCancelAddPage} onSaved={onCancelAddPage} />
        ) : (
          <button
            type="button"
            onClick={onStartAddPage}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-accent-400 hover:text-accent-300"
          >
            <Plus size={12} />
            Add page
          </button>
        )}
      </div>
    </div>
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
      onClick={(e) => e.stopPropagation()}
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
      className="flex flex-col gap-1.5 rounded-md border border-base-700/60 bg-base-900 p-2"
    >
      <input
        name="name"
        required
        placeholder="Page name (e.g. Homepage)"
        defaultValue={page?.name ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <input
        name="url"
        placeholder="URL (optional)"
        defaultValue={page?.url ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-2 py-1 text-[11px] font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-fit rounded-md border border-base-600 px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
