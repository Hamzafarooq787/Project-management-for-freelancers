import { clsx, type ClassValue } from "clsx";
import type { Domain, DomainClient, Renewal, RenewalServiceType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export interface DomainExpiryTickerItem {
  id: string;
  message: string;
  overdue: boolean;
}

/** Parses a plain 'YYYY-MM-DD' date string as a UTC-midnight timestamp, so day-diff math is never off by one from the server's local timezone. */
function parsePlainDateUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function relativeDayLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

const TICKER_WINDOW_PAST_DAYS = 7;
const TICKER_WINDOW_FUTURE_DAYS = 30;

const RENEWAL_SERVICE_LABEL: Record<RenewalServiceType, string> = {
  domain: "Domain",
  hosting: "Hosting",
  email: "Email Service",
  malware_removal: "Malware Removal",
  other: "Service",
};

interface DatedTickerSource {
  id: string;
  who: string;
  what: string;
  dueUtc: number;
}

/**
 * Builds "<Client>'s Domain & Hosting is Expiring <relative day>" ticker items,
 * merging two sources within a rolling window (7 days in the past — still worth
 * flagging as overdue — through 30 days out):
 *  - Domains inventory, by expiry date (falls back to the domain name if no
 *    Domain Client is linked)
 *  - Pending Renewals, by due date (labeled by their service type(s), e.g.
 *    "Domain & Hosting", "Email Service")
 * Sorted soonest-due first across both sources combined.
 */
export function buildExpiryTickerItems(
  domains: Domain[],
  domainClients: DomainClient[],
  renewals: Renewal[],
): DomainExpiryTickerItem[] {
  const clientNameById = new Map(domainClients.map((c) => [c.id, c.name]));
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = todayUtc - TICKER_WINDOW_PAST_DAYS * 86400000;
  const windowEnd = todayUtc + TICKER_WINDOW_FUTURE_DAYS * 86400000;
  const inWindow = (dueUtc: number) => dueUtc >= windowStart && dueUtc <= windowEnd;

  const domainSources: DatedTickerSource[] = domains
    .filter((d): d is Domain & { expiryDate: string } => Boolean(d.expiryDate))
    .map((d) => ({
      id: `domain-${d.id}`,
      who: (d.domainClientId && clientNameById.get(d.domainClientId)) || d.name,
      what: "Domain & Hosting",
      dueUtc: parsePlainDateUtc(d.expiryDate),
    }))
    .filter((s) => inWindow(s.dueUtc));

  const renewalSources: DatedTickerSource[] = renewals
    .filter((r): r is Renewal & { dueDate: string } => r.status === "pending" && Boolean(r.dueDate))
    .map((r) => ({
      id: `renewal-${r.id}`,
      who: r.clientName || r.itemName || "A client",
      what: r.serviceTypes.length > 0 ? r.serviceTypes.map((t) => RENEWAL_SERVICE_LABEL[t]).join(" & ") : "Renewal",
      dueUtc: parsePlainDateUtc(r.dueDate),
    }))
    .filter((s) => inWindow(s.dueUtc));

  return [...domainSources, ...renewalSources]
    .sort((a, b) => a.dueUtc - b.dueUtc)
    .map((s) => {
      const days = Math.round((s.dueUtc - todayUtc) / 86400000);
      return {
        id: s.id,
        message: `${s.who}'s ${s.what} is Expiring ${relativeDayLabel(days)}`,
        overdue: days < 0,
      };
    });
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
