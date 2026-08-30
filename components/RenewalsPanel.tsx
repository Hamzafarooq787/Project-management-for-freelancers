"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { DomainClient, Renewal, RenewalServiceType, RenewalStatus } from "@/lib/types";
import {
  createRenewalAction,
  deleteRenewalAction,
  setRenewalStatusAction,
  updateRenewalAction,
} from "@/lib/actions";
import { StatCard } from "@/components/StatCard";
import { cn, currencySymbol, formatMoney, sortCurrencies } from "@/lib/utils";

const ALL_CURRENCIES = ["PKR", "USD", "GBP"];

const SERVICE_TYPE_LABEL: Record<RenewalServiceType, string> = {
  domain: "Domain",
  hosting: "Hosting",
  email: "Email Service",
  malware_removal: "Malware Removal",
  other: "Other",
};

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABEL) as RenewalServiceType[];

const STATUS_LABEL: Record<RenewalStatus, string> = {
  pending: "Pending",
  completed: "Completed",
};

function money(value: number | null, currency: string): string {
  return formatMoney(value ?? 0, currency);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function dueBadge(dueDate: string | null, status: RenewalStatus) {
  if (!dueDate || status === "completed") return null;
  const days = daysUntil(dueDate);
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, cls: "bg-rose-500/15 text-rose-300" };
  if (days <= 7) return { label: days === 0 ? "Due today" : `Due in ${days}d`, cls: "bg-amber-500/15 text-amber-300" };
  return null;
}

type StatusFilter = "all" | RenewalStatus;

export function RenewalsPanel({ renewals, domainClients }: { renewals: Renewal[]; domainClients: DomainClient[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const currencies = useMemo(() => {
    const present = sortCurrencies(Array.from(new Set(renewals.map((r) => r.currency))));
    return present.length > 0 ? present : ALL_CURRENCIES;
  }, [renewals]);
  const [currency, setCurrency] = useState(currencies[0] ?? "PKR");
  const activeCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? "PKR");

  const byCurrency = renewals.filter((r) => r.currency === activeCurrency);

  const totals = useMemo(() => {
    const earned = byCurrency.reduce((sum, r) => sum + (r.amountCharged ?? 0), 0);
    const paid = byCurrency.reduce((sum, r) => sum + (r.amountPaid ?? 0), 0);
    const dueSoon = byCurrency.filter((r) => dueBadge(r.dueDate, r.status) !== null).length;
    return { earned, paid, profit: earned - paid, dueSoon };
  }, [byCurrency]);

  const filtered = byCurrency.filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {currencies.length > 1 && (
          <div className="flex gap-1 rounded-lg border border-base-700/60 bg-base-850 p-1">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  activeCurrency === c ? "bg-accent-500 text-base-950" : "text-neutral-400 hover:text-neutral-200",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Total earned · ${activeCurrency}`} value={money(totals.earned, activeCurrency)} icon={Wallet} tone="accent" />
        <StatCard label={`Total paid (cost) · ${activeCurrency}`} value={money(totals.paid, activeCurrency)} icon={Receipt} tone="sky" />
        <StatCard
          label={`Net profit · ${activeCurrency}`}
          value={money(totals.profit, activeCurrency)}
          icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
          tone={totals.profit >= 0 ? "accent" : "rose"}
        />
        <StatCard label="Due soon / overdue" value={totals.dueSoon} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-accent-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Renewal records</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-lg border border-base-700/60 bg-base-900 p-1">
              {(["all", "pending", "completed"] as StatusFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === key ? "bg-accent-500 text-base-950" : "text-neutral-400 hover:text-neutral-200",
                  )}
                >
                  {key === "all" ? "All" : STATUS_LABEL[key]}
                </button>
              ))}
            </div>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
              >
                <Plus size={13} />
                Add renewal
              </button>
            )}
          </div>
        </div>

        {adding && (
          <div className="mb-3">
            <RenewalForm
              domainClients={domainClients}
              renewal={null}
              defaultCurrency={activeCurrency}
              onCancel={() => setAdding(false)}
              onSaved={() => setAdding(false)}
            />
          </div>
        )}

        {filtered.length === 0 && !adding ? (
          <p className="rounded-lg border border-dashed border-base-700 p-6 text-center text-sm text-neutral-500">
            {renewals.length === 0
              ? "No renewal records yet. Log a domain/hosting renewal, email service, or malware removal job above."
              : `No ${activeCurrency} renewals match this filter.`}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((renewal) =>
              editingId === renewal.id ? (
                <RenewalForm
                  key={renewal.id}
                  domainClients={domainClients}
                  renewal={renewal}
                  defaultCurrency={renewal.currency}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => setEditingId(null)}
                />
              ) : (
                <RenewalRow key={renewal.id} renewal={renewal} onEdit={() => setEditingId(renewal.id)} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RenewalRow({ renewal, onEdit }: { renewal: Renewal; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const badge = dueBadge(renewal.dueDate, renewal.status);
  const profit = (renewal.amountCharged ?? 0) - (renewal.amountPaid ?? 0);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between",
        renewal.status === "completed" ? "border-base-700/60 bg-base-900/60" : "border-base-600 bg-base-800",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-100">{renewal.clientName || "Unnamed client"}</p>
          {renewal.itemName && <span className="truncate text-xs text-neutral-500">· {renewal.itemName}</span>}
          {badge && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.cls)}>{badge.label}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {renewal.serviceTypes.map((t) => (
            <span key={t} className="rounded-full bg-base-950 px-2 py-0.5 text-[11px] text-neutral-400">
              {SERVICE_TYPE_LABEL[t]}
            </span>
          ))}
          {renewal.dueDate && <span className="text-[11px] text-neutral-500">Due {renewal.dueDate}</span>}
        </div>
        {renewal.notes && <p className="mt-1 truncate text-xs text-neutral-500">{renewal.notes}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-4">
        <div className="text-right text-xs">
          <p className="text-neutral-500">Charged</p>
          <p className="text-accent-300">{money(renewal.amountCharged, renewal.currency)}</p>
        </div>
        <div className="text-right text-xs">
          <p className="text-neutral-500">Paid (cost)</p>
          <p className="text-neutral-300">{money(renewal.amountPaid, renewal.currency)}</p>
        </div>
        <div className="text-right text-xs">
          <p className="text-neutral-500">Profit</p>
          <p className={profit >= 0 ? "text-accent-300" : "text-rose-400"}>{money(profit, renewal.currency)}</p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => setRenewalStatusAction(renewal.id, renewal.status === "pending" ? "completed" : "pending"))
          }
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50",
            renewal.status === "completed" ? "bg-accent-500/15 text-accent-300" : "bg-base-700/60 text-neutral-400 hover:text-accent-300",
          )}
          title={renewal.status === "completed" ? "Mark pending" : "Mark completed"}
        >
          <CheckCircle2 size={13} />
          {STATUS_LABEL[renewal.status]}
        </button>
        <button type="button" onClick={onEdit} className="rounded-md p-1.5 text-neutral-400 hover:text-accent-300" title="Edit">
          <Pencil size={13} />
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete this renewal record for "${renewal.clientName}"?`)) return;
            startTransition(() => deleteRenewalAction(renewal.id));
          }}
          className="rounded-md p-1.5 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function RenewalForm({
  domainClients,
  renewal,
  defaultCurrency,
  onCancel,
  onSaved,
}: {
  domainClients: DomainClient[];
  renewal: Renewal | null;
  defaultCurrency: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState(renewal?.domainClientId ?? "");
  const [manualName, setManualName] = useState(renewal?.domainClientId ? "" : (renewal?.clientName ?? ""));
  const formRef = useRef<HTMLFormElement>(null);

  const selectedClientName = domainClients.find((c) => c.id === selectedClientId)?.name ?? "";

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          if (renewal) {
            await updateRenewalAction(renewal.id, formData);
            onSaved();
          } else {
            const result = await createRenewalAction(formData);
            if (result.ok) {
              formRef.current?.reset();
              onSaved();
            } else {
              setError(result.error);
            }
          }
        });
      }}
      className="flex flex-col gap-3 rounded-lg border border-base-700/60 bg-base-900 p-3.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{renewal ? "Edit renewal" : "New renewal"}</span>
        <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
      {error && <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Client</label>
          <select
            name="domainClientId"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          >
            <option value="">— Type a name below instead —</option>
            {domainClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {selectedClientId ? (
          <input type="hidden" name="clientName" value={selectedClientName} />
        ) : (
          <div>
            <label className="mb-1 block text-[11px] text-neutral-500">Or new client name</label>
            <input
              name="clientName"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Client name"
              className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {!selectedClientId && (
        <label className="flex w-fit items-center gap-2 text-xs text-neutral-400">
          <input type="checkbox" name="saveNewClient" defaultChecked={!renewal} className="accent-accent-500" />
          Save as a client for future renewals
        </label>
      )}

      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Service type(s)</label>
        <div className="flex flex-wrap gap-3">
          {SERVICE_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-xs text-neutral-300">
              <input
                type="checkbox"
                name="serviceTypes"
                value={type}
                defaultChecked={renewal?.serviceTypes.includes(type) ?? false}
                className="accent-accent-500"
              />
              {SERVICE_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Item / domain</label>
          <input
            name="itemName"
            defaultValue={renewal?.itemName ?? ""}
            placeholder="e.g. example.com"
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Currency</label>
          <select
            name="currency"
            defaultValue={renewal?.currency ?? defaultCurrency}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} ({currencySymbol(c)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Charged (earned)</label>
          <input
            name="amountCharged"
            type="number"
            step="0.01"
            defaultValue={renewal?.amountCharged ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Paid (cost)</label>
          <input
            name="amountPaid"
            type="number"
            step="0.01"
            defaultValue={renewal?.amountPaid ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Due date</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={renewal?.dueDate ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto,1fr]">
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={renewal?.status ?? "pending"}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none sm:w-40"
          >
            {(Object.keys(STATUS_LABEL) as RenewalStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Notes</label>
          <input
            name="notes"
            defaultValue={renewal?.notes ?? ""}
            placeholder="Optional notes"
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save renewal"}
        </button>
        <button type="button" onClick={onCancel} className="w-fit rounded-md border border-base-600 px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
