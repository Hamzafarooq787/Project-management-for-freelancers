import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  PKR: "₨",
  GBP: "£",
  USD: "$",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? `${currency} `;
}

export function formatMoney(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Sums amounts per currency instead of blending different currencies together. */
export function groupByCurrency<T>(items: T[], amount: (item: T) => number, currency: (item: T) => string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const key = currency(item);
    totals[key] = (totals[key] ?? 0) + amount(item);
  }
  return totals;
}

export function formatGroupedMoney(totals: Record<string, number>): string {
  const entries = Object.entries(totals).filter(([, amount]) => amount !== 0);
  if (entries.length === 0) return "—";
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" · ");
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
