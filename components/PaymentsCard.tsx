"use client";

import { useState, useTransition } from "react";
import { Wallet, Trash2, Pencil } from "lucide-react";
import type { Payment, PaymentKind, PaymentPlan, PaymentPlanType } from "@/lib/types";
import { addPaymentAction, deletePaymentAction, setPaymentPlanAction } from "@/lib/actions";
import { cn, formatMoney } from "@/lib/utils";

const KIND_LABEL: Record<PaymentKind, string> = {
  monthly: "Monthly fee",
  additional: "Additional charge",
  installment: "Installment",
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PaymentsCard({
  projectId,
  plan,
  payments,
}: {
  projectId: string;
  plan: PaymentPlan | null;
  payments: Payment[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingPlan, setEditingPlan] = useState(!plan);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const currency = plan?.currency ?? "USD";
  const collectedThisMonth = payments
    .filter((p) => p.kind === "monthly" && p.period === monthKey())
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = plan?.planType === "one_time" ? Math.max(0, plan.amount - totalPaid) : null;

  return (
    <div className="rounded-xl2 border border-base-700/60 bg-base-850 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wallet size={16} className="text-accent-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Payments</h2>
      </div>

      {editingPlan ? (
        <form
          action={(formData) => {
            formData.set("projectId", projectId);
            startTransition(async () => {
              await setPaymentPlanAction(formData);
              setEditingPlan(false);
            });
          }}
          className="mb-4 flex flex-col gap-2 rounded-lg border border-base-700/60 bg-base-900 p-3"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              name="planType"
              defaultValue={plan?.planType ?? "monthly_fixed"}
              className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 focus:border-accent-500 focus:outline-none"
            >
              <option value="monthly_fixed">Fixed monthly</option>
              <option value="one_time">One-time project</option>
            </select>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Amount"
              defaultValue={plan?.amount || ""}
              className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
            />
            <input
              name="currency"
              list="currency-options"
              placeholder="Currency"
              defaultValue={plan?.currency ?? "USD"}
              className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
            />
            <datalist id="currency-options">
              <option value="USD" />
              <option value="GBP" />
              <option value="EUR" />
              <option value="PKR" />
              <option value="INR" />
            </datalist>
          </div>
          <textarea
            name="notes"
            rows={2}
            placeholder="Pricing notes (optional)"
            defaultValue={plan?.notes ?? ""}
            className="w-full rounded-md border border-base-600 bg-base-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-fit rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save plan"}
            </button>
            {plan && (
              <button
                type="button"
                onClick={() => setEditingPlan(false)}
                className="w-fit rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        plan && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-700/60 bg-base-900 p-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {plan.planType === "monthly_fixed" ? "Monthly fee" : "Total agreed"}
                </p>
                <p className="font-medium text-neutral-100">{formatMoney(plan.amount, currency)}</p>
              </div>
              {plan.planType === "monthly_fixed" ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Collected this month</p>
                  <p className="font-medium text-accent-300">{formatMoney(collectedThisMonth, currency)}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Paid so far</p>
                    <p className="font-medium text-accent-300">{formatMoney(totalPaid, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Remaining</p>
                    <p className={cn("font-medium", (remaining ?? 0) > 0 ? "text-amber-400" : "text-accent-300")}>
                      {formatMoney(remaining ?? 0, currency)}
                    </p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setEditingPlan(true)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-accent-300"
            >
              <Pencil size={12} />
              Edit plan
            </button>
          </div>
        )
      )}

      {plan && (
        <>
          <RecordPaymentForm projectId={projectId} planType={plan.planType} currency={currency} />

          <div className="mt-3 flex flex-col gap-1.5">
            {payments.length === 0 && (
              <p className="rounded-lg border border-dashed border-base-700 p-4 text-center text-xs text-neutral-500">
                No payments recorded yet.
              </p>
            )}
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-2 rounded-md border border-base-700/50 bg-base-900 px-2.5 py-1.5"
              >
                <span className="rounded-full border border-base-600 px-2 py-0.5 text-[11px] text-neutral-400">
                  {KIND_LABEL[payment.kind]}
                </span>
                <span className="text-xs text-neutral-500">{payment.paidOn}</span>
                {payment.period && <span className="text-xs text-neutral-500">({payment.period})</span>}
                <span className="flex-1 truncate text-xs text-neutral-400">{payment.note}</span>
                <span className="shrink-0 text-sm font-medium text-neutral-100">
                  {formatMoney(payment.amount, payment.currency)}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => deletePaymentAction(payment.id, projectId))}
                  className="shrink-0 rounded-md p-1 text-neutral-500 hover:text-rose-400 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RecordPaymentForm({
  projectId,
  planType,
  currency,
}: {
  projectId: string;
  planType: PaymentPlanType;
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<PaymentKind>(planType === "monthly_fixed" ? "monthly" : "installment");

  return (
    <form
      action={(formData) => {
        formData.set("projectId", projectId);
        startTransition(() => addPaymentAction(formData));
      }}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-base-600 p-3"
    >
      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Type</label>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as PaymentKind)}
          className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        >
          {planType === "monthly_fixed" ? (
            <option value="monthly">Monthly fee</option>
          ) : (
            <option value="installment">Installment</option>
          )}
          <option value="additional">Additional charge</option>
        </select>
      </div>
      {kind === "monthly" && (
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">Month</label>
          <input
            type="month"
            name="period"
            defaultValue={monthKey()}
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Amount ({currency})</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          className="w-28 rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        />
      </div>
      <input type="hidden" name="currency" value={currency} />
      <div>
        <label className="mb-1 block text-[11px] text-neutral-500">Date</label>
        <input
          type="date"
          name="paidOn"
          defaultValue={todayKey()}
          className="rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 focus:border-accent-500 focus:outline-none"
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <label className="mb-1 block text-[11px] text-neutral-500">Note (optional)</label>
        <input
          name="note"
          placeholder="e.g. Extra page added"
          className="w-full rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-base-950 hover:bg-accent-400 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
