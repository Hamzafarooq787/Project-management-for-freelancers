"use client";

import { useMemo, useState, useTransition, type TransitionStartFunction } from "react";
import {
  AppWindow,
  ChevronDown,
  Copy,
  Download,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { SubFeatureStatus, WebAppFeature, WebAppSubFeature } from "@/lib/types";
import {
  bulkCopyWebAppFeaturesAction,
  bulkCopyWebAppSubFeaturesAction,
  bulkDeleteWebAppFeaturesAction,
  bulkDeleteWebAppSubFeaturesAction,
  createWebAppFeatureAction,
  createWebAppSubFeatureAction,
  deleteWebAppFeatureAction,
  deleteWebAppSubFeatureAction,
  setWebAppSubFeatureStatusAction,
  updateWebAppFeatureAction,
  updateWebAppSubFeatureAction,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<SubFeatureStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_STYLE: Record<SubFeatureStatus, string> = {
  not_started: "bg-base-700/60 text-neutral-400",
  in_progress: "bg-sky-500/15 text-sky-400",
  done: "bg-accent-500/15 text-accent-400",
};

const SUGGESTED_FEATURES = [
  "Customer",
  "Authentication",
  "Dashboard",
  "Billing & Payments",
  "Notifications",
  "Reports",
  "Settings",
  "Admin",
];

async function exportFeatures(projectName: string, features: WebAppFeature[], subByFeature: Record<string, WebAppSubFeature[]>) {
  const XLSX = await import("xlsx");
  const rows: Record<string, string>[] = [];
  for (const feature of features) {
    const subs = subByFeature[feature.id] ?? [];
    if (subs.length === 0) {
      rows.push({ Feature: feature.name, "Feature Description": feature.description, "Sub-feature": "", "Sub-feature Description": "", Status: "" });
      continue;
    }
    for (const sub of subs) {
      rows.push({
        Feature: feature.name,
        "Feature Description": feature.description,
        "Sub-feature": sub.name,
        "Sub-feature Description": sub.description,
        Status: STATUS_LABEL[sub.status],
      });
    }
  }
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Feature", "Feature Description", "Sub-feature", "Sub-feature Description", "Status"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Features");
  const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "project";
  XLSX.writeFile(workbook, `${safeName}-features.xlsx`);
}

export function WebAppFeaturesPanel({
  projectId,
  projectName,
  features,
  subFeaturesByFeature,
}: {
  projectId: string;
  projectName: string;
  features: WebAppFeature[];
  subFeaturesByFeature: Record<string, WebAppSubFeature[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const [addingFeature, setAddingFeature] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [openFeatureId, setOpenFeatureId] = useState<string | null>(features[0]?.id ?? null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  function toggleFeatureSelected(id: string) {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFeatures() {
    setSelectedFeatures((prev) => (prev.size === features.length ? new Set() : new Set(features.map((f) => f.id))));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AppWindow size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Features</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => exportFeatures(projectName, features, subFeaturesByFeature)}
              disabled={features.length === 0}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300 disabled:opacity-40 disabled:hover:text-neutral-400"
            >
              <Download size={13} />
              Export all
            </button>
            {!addingFeature && (
              <button
                type="button"
                onClick={() => setAddingFeature(true)}
                className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
              >
                <Plus size={13} />
                Add feature
              </button>
            )}
          </div>
        </div>

        {addingFeature && (
          <div className="mb-3">
            <FeatureForm projectId={projectId} feature={null} onCancel={() => setAddingFeature(false)} onSaved={() => setAddingFeature(false)} />
          </div>
        )}

        {features.length === 0 && !addingFeature ? (
          <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
            No features yet. Add one to start planning this app — e.g. &ldquo;Customer&rdquo; with sub-features like &ldquo;Add customer&rdquo; and
            &ldquo;Export customer list&rdquo;.
          </p>
        ) : (
          <>
            {features.length > 1 && (
              <label className="mb-3 flex w-fit items-center gap-1.5 text-[11px] text-neutral-500">
                <input
                  type="checkbox"
                  checked={selectedFeatures.size === features.length}
                  onChange={toggleSelectAllFeatures}
                  className="accent-accent-500"
                />
                Select all features
              </label>
            )}

            {selectedFeatures.size > 0 && (
              <FeatureBulkActionsBar
                selectedCount={selectedFeatures.size}
                isPending={isPending}
                onExport={() =>
                  exportFeatures(
                    projectName,
                    features.filter((f) => selectedFeatures.has(f.id)),
                    subFeaturesByFeature,
                  )
                }
                onCopy={() => {
                  const ids = [...selectedFeatures];
                  startTransition(async () => {
                    await bulkCopyWebAppFeaturesAction(ids, projectId);
                    setSelectedFeatures(new Set());
                  });
                }}
                onDelete={() => {
                  if (!confirm(`Delete ${selectedFeatures.size} feature${selectedFeatures.size === 1 ? "" : "s"} and all their sub-features? This can't be undone.`))
                    return;
                  const ids = [...selectedFeatures];
                  startTransition(async () => {
                    await bulkDeleteWebAppFeaturesAction(ids, projectId);
                    setSelectedFeatures(new Set());
                  });
                }}
                onClear={() => setSelectedFeatures(new Set())}
              />
            )}

            <div className="flex flex-col gap-3">
              {features.map((feature) =>
                editingFeatureId === feature.id ? (
                  <FeatureForm
                    key={feature.id}
                    projectId={projectId}
                    feature={feature}
                    onCancel={() => setEditingFeatureId(null)}
                    onSaved={() => setEditingFeatureId(null)}
                  />
                ) : (
                  <FeatureCard
                    key={feature.id}
                    projectId={projectId}
                    feature={feature}
                    subFeatures={subFeaturesByFeature[feature.id] ?? []}
                    isOpen={openFeatureId === feature.id}
                    onToggleOpen={() => setOpenFeatureId(openFeatureId === feature.id ? null : feature.id)}
                    selected={selectedFeatures.has(feature.id)}
                    onToggleSelect={() => toggleFeatureSelected(feature.id)}
                    onEdit={() => setEditingFeatureId(feature.id)}
                    onDelete={() => {
                      if (!confirm(`Delete "${feature.name}" and all its sub-features? This can't be undone.`)) return;
                      startTransition(() => deleteWebAppFeatureAction(feature.id, projectId));
                    }}
                    isPending={isPending}
                    startTransition={startTransition}
                  />
                ),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureBulkActionsBar({
  selectedCount,
  isPending,
  onExport,
  onCopy,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  isPending: boolean;
  onExport: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/5 px-3 py-2">
      <span className="text-xs font-medium text-accent-300">
        {selectedCount} feature{selectedCount === 1 ? "" : "s"} selected
      </span>
      <button
        type="button"
        onClick={onExport}
        className="flex items-center gap-1.5 rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300"
      >
        <Download size={13} />
        Export selected
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={onCopy}
        className="flex items-center gap-1.5 rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
      >
        <Copy size={13} />
        Duplicate selected
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={onDelete}
        className="flex items-center gap-1.5 rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
      >
        <Trash2 size={13} />
        Delete selected
      </button>
      <button type="button" onClick={onClear} className="ml-auto text-xs text-neutral-500 hover:text-neutral-300">
        Clear selection
      </button>
    </div>
  );
}

function FeatureCard({
  projectId,
  feature,
  subFeatures,
  isOpen,
  onToggleOpen,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  isPending,
  startTransition,
}: {
  projectId: string;
  feature: WebAppFeature;
  subFeatures: WebAppSubFeature[];
  isOpen: boolean;
  onToggleOpen: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [addingSub, setAddingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());

  function toggleSubSelected(id: string) {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllSubs() {
    setSelectedSubs((prev) => (prev.size === subFeatures.length ? new Set() : new Set(subFeatures.map((s) => s.id))));
  }

  const doneCount = subFeatures.filter((s) => s.status === "done").length;

  return (
    <div
      className={cn(
        "rounded-lg border shadow-md transition-colors",
        selected ? "border-accent-500/60 bg-accent-500/5" : "border-base-600 bg-base-800",
      )}
    >
      <div className="flex items-start gap-2.5 p-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1.5 shrink-0 accent-accent-500"
          aria-label={`Select ${feature.name}`}
        />
        <button type="button" onClick={onToggleOpen} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-base font-semibold text-neutral-100">{feature.name}</p>
              {subFeatures.length > 0 && (
                <span className="rounded-full bg-base-950 px-2 py-0.5 text-xs font-medium text-neutral-300">
                  {doneCount}/{subFeatures.length} done
                </span>
              )}
            </div>
            {feature.description && <p className="mt-1 break-words text-xs text-neutral-500">{feature.description}</p>}
          </div>
          <ChevronDown size={16} className={cn("mt-1 shrink-0 text-neutral-500 transition-transform", isOpen && "rotate-180")} />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onEdit} className="rounded-md p-1.5 text-neutral-400 hover:text-accent-300" title="Edit feature">
            <Pencil size={13} />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onDelete}
            className="rounded-md p-1.5 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
            title="Delete feature"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-base-700/60 p-4 pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sub-features</h3>
            {!addingSub && (
              <button
                type="button"
                onClick={() => setAddingSub(true)}
                className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
              >
                <Plus size={13} />
                Add sub-feature
              </button>
            )}
          </div>

          {addingSub && (
            <div className="mb-3">
              <SubFeatureForm
                projectId={projectId}
                featureId={feature.id}
                subFeature={null}
                onCancel={() => setAddingSub(false)}
                onSaved={() => setAddingSub(false)}
              />
            </div>
          )}

          {subFeatures.length === 0 && !addingSub ? (
            <p className="rounded-lg border border-dashed border-base-700 p-4 text-center text-xs text-neutral-500">
              No sub-features yet. e.g. &ldquo;Add customer&rdquo;, &ldquo;Edit customer&rdquo;, &ldquo;Export customer list&rdquo;.
            </p>
          ) : (
            <>
              {subFeatures.length > 1 && (
                <label className="mb-2 flex w-fit items-center gap-1.5 text-[11px] text-neutral-500">
                  <input
                    type="checkbox"
                    checked={selectedSubs.size === subFeatures.length}
                    onChange={toggleSelectAllSubs}
                    className="accent-accent-500"
                  />
                  Select all
                </label>
              )}

              {selectedSubs.size > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/5 px-3 py-2">
                  <span className="text-xs font-medium text-accent-300">
                    {selectedSubs.size} selected
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const ids = [...selectedSubs];
                      startTransition(async () => {
                        await bulkCopyWebAppSubFeaturesAction(ids, projectId);
                        setSelectedSubs(new Set());
                      });
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-accent-500/50 hover:text-accent-300 disabled:opacity-50"
                  >
                    <Copy size={13} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Delete ${selectedSubs.size} sub-feature${selectedSubs.size === 1 ? "" : "s"}? This can't be undone.`)) return;
                      const ids = [...selectedSubs];
                      startTransition(async () => {
                        await bulkDeleteWebAppSubFeaturesAction(ids, projectId);
                        setSelectedSubs(new Set());
                      });
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-base-600 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                  <button type="button" onClick={() => setSelectedSubs(new Set())} className="ml-auto text-xs text-neutral-500 hover:text-neutral-300">
                    Clear selection
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {subFeatures.map((sub) =>
                  editingSubId === sub.id ? (
                    <SubFeatureForm
                      key={sub.id}
                      projectId={projectId}
                      featureId={feature.id}
                      subFeature={sub}
                      onCancel={() => setEditingSubId(null)}
                      onSaved={() => setEditingSubId(null)}
                    />
                  ) : (
                    <div
                      key={sub.id}
                      className={cn(
                        "flex items-start gap-2.5 rounded-md border p-2.5",
                        selectedSubs.has(sub.id) ? "border-accent-500/60 bg-accent-500/5" : "border-base-700/60 bg-base-900",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubs.has(sub.id)}
                        onChange={() => toggleSubSelected(sub.id)}
                        className="mt-1 shrink-0 accent-accent-500"
                        aria-label={`Select ${sub.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm text-neutral-100">{sub.name}</p>
                        {sub.description && <p className="mt-0.5 break-words text-xs text-neutral-500">{sub.description}</p>}
                      </div>
                      <select
                        value={sub.status}
                        onChange={(e) =>
                          startTransition(() => setWebAppSubFeatureStatusAction(sub.id, projectId, e.target.value))
                        }
                        className={cn("shrink-0 rounded-full border-0 px-2 py-1 text-[11px] font-medium focus:outline-none", STATUS_STYLE[sub.status])}
                      >
                        {(Object.keys(STATUS_LABEL) as SubFeatureStatus[]).map((s) => (
                          <option key={s} value={s} className="bg-base-900 text-neutral-100">
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingSubId(sub.id)}
                          className="rounded-md p-1.5 text-neutral-400 hover:text-accent-300"
                          title="Edit sub-feature"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (!confirm(`Delete "${sub.name}"?`)) return;
                            startTransition(() => deleteWebAppSubFeatureAction(sub.id, projectId));
                          }}
                          className="rounded-md p-1.5 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
                          title="Delete sub-feature"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FeatureForm({
  projectId,
  feature,
  onSaved,
  onCancel,
}: {
  projectId: string;
  feature: WebAppFeature | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const suggestions = useMemo(() => SUGGESTED_FEATURES, []);

  return (
    <form
      action={(formData) => {
        formData.set("projectId", projectId);
        if (feature) formData.set("id", feature.id);
        startTransition(async () => {
          await (feature ? updateWebAppFeatureAction(formData) : createWebAppFeatureAction(formData));
          onSaved();
        });
      }}
      className="flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{feature ? "Edit feature" : "New feature"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      <input
        name="name"
        required
        autoFocus
        placeholder="Feature / tab name, e.g. Customer"
        defaultValue={feature?.name ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      {!feature && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                const input = e.currentTarget.form?.elements.namedItem("name") as HTMLInputElement | null;
                if (input) input.value = s;
              }}
              className="rounded-full border border-base-600 px-2 py-0.5 text-[11px] text-neutral-400 hover:border-accent-500/50 hover:text-accent-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <textarea
        name="description"
        rows={2}
        placeholder="What does this feature/tab cover? (optional)"
        defaultValue={feature?.description ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save feature"}
        </button>
        <button type="button" onClick={onCancel} className="w-fit rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200">
          Cancel
        </button>
      </div>
    </form>
  );
}

function SubFeatureForm({
  projectId,
  featureId,
  subFeature,
  onSaved,
  onCancel,
}: {
  projectId: string;
  featureId: string;
  subFeature: WebAppSubFeature | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        formData.set("projectId", projectId);
        formData.set("featureId", featureId);
        if (subFeature) formData.set("id", subFeature.id);
        startTransition(async () => {
          await (subFeature ? updateWebAppSubFeatureAction(formData) : createWebAppSubFeatureAction(formData));
          onSaved();
        });
      }}
      className="flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-950 p-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-neutral-400">{subFeature ? "Edit sub-feature" : "New sub-feature"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={13} />
        </button>
      </div>
      <input
        name="name"
        required
        autoFocus
        placeholder="e.g. Add customer"
        defaultValue={subFeature?.name ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-900 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      <input
        name="description"
        placeholder="Notes (optional)"
        defaultValue={subFeature?.description ?? ""}
        className="w-full rounded-md border border-base-600 bg-base-900 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
      />
      {subFeature && (
        <select
          name="status"
          defaultValue={subFeature.status}
          className="w-fit rounded-md border border-base-600 bg-base-900 px-2.5 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        >
          {(Object.keys(STATUS_LABEL) as SubFeatureStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="w-fit rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
