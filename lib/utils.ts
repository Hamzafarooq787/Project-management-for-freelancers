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

const CURRENCY_ORDER = ["PKR", "USD", "GBP"];

/** PKR first, then USD/GBP, then anything else alphabetically. */
export function sortCurrencies(currencies: string[]): string[] {
  return [...currencies].sort((a, b) => {
    const ia = CURRENCY_ORDER.indexOf(a);
    const ib = CURRENCY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Picks `requested` if it's one of the available currencies, else the default (first available, PKR if none). */
export function resolveSelectedCurrency(available: string[], requested: string | undefined): string {
  const currencies = available.length > 0 ? available : ["PKR"];
  if (requested && currencies.includes(requested)) return requested;
  return currencies[0] ?? "PKR";
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Formats a "YYYY-MM-DD" date key as e.g. "Aug 1", without the year-shifting a raw `new Date(iso)` local-timezone parse would risk. */
export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
