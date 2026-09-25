const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "INR";
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "en-IN";

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyWhole = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const moneyCompact = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

export const formatMoney = (v: number | null | undefined) => money.format(Number(v ?? 0));
/** For headline figures where paise add noise. */
export const formatMoneyWhole = (v: number | null | undefined) => moneyWhole.format(Number(v ?? 0));
export const formatMoneyCompact = (v: number | null | undefined) => moneyCompact.format(Number(v ?? 0));
export const formatPercent = (v: number) => `${percent.format(v)}%`;

export const currencySymbol =
  money.formatToParts(0).find((p) => p.type === "currency")?.value ?? CURRENCY;

function parseISODate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string, style: "short" | "medium" | "long" = "medium") {
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  if (style === "short") return d.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
  if (style === "long") return d.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return d.toLocaleDateString(LOCALE, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonth(ym: string, style: "short" | "long" = "short") {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(LOCALE, style === "long" ? { month: "long", year: "numeric" } : { month: "short" });
}

export function formatRelativeDay(iso: string) {
  const d = parseISODate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDate(iso);
}

export const PAYMENT_METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "NET_BANKING", label: "Net banking" },
  { value: "WALLET", label: "Wallet" },
  { value: "OTHER", label: "Other" },
] as const;

export const paymentMethodLabel = (m: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;

export const splitTypeLabel: Record<string, string> = {
  EQUAL: "Split equally",
  EXACT: "Exact amounts",
  PERCENT: "By percentage",
  SHARES: "By shares",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", then a date. */
export function formatTimeAgo(isoInstant: string, now = Date.now()) {
  const t = new Date(isoInstant).getTime();
  const mins = Math.round((now - t) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const d = new Date(t);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(LOCALE, d.getFullYear() === new Date(now).getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

const FREQ_UNIT: Record<string, [string, string]> = {
  DAILY: ["day", "days"],
  WEEKLY: ["week", "weeks"],
  MONTHLY: ["month", "months"],
  YEARLY: ["year", "years"],
};

/** "Every month", "Every 2 weeks" … */
export function formatSchedule(frequency: string, every: number) {
  const [one, many] = FREQ_UNIT[frequency] ?? ["period", "periods"];
  return every === 1 ? `Every ${one}` : `Every ${every} ${many}`;
}
