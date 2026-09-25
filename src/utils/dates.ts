export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISODate(new Date());

export type RangePreset = "this-month" | "last-month" | "last-3" | "last-6" | "this-year" | "last-12" | "all" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3", label: "Last 3 months" },
  { value: "last-6", label: "Last 6 months" },
  { value: "this-year", label: "Year to date" },
  { value: "last-12", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export function resolveRange(preset: RangePreset, custom?: DateRange): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this-month":
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(now) };
    case "last-month":
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case "last-3":
      return { from: toISODate(new Date(y, m - 2, 1)), to: toISODate(now) };
    case "last-6":
      return { from: toISODate(new Date(y, m - 5, 1)), to: toISODate(now) };
    case "this-year":
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(now) };
    case "last-12":
      return { from: toISODate(new Date(y, m - 11, 1)), to: toISODate(now) };
    case "all":
      return { from: "2000-01-01", to: toISODate(now) };
    case "custom":
      return custom ?? { from: toISODate(new Date(y, m, 1)), to: toISODate(now) };
  }
}

export const presetLabel = (p: RangePreset) => RANGE_PRESETS.find((r) => r.value === p)?.label ?? "";

/** "this month", "last 3 months", … for use mid-sentence. */
export const presetPhrase = (p: RangePreset) => (p === "custom" ? "the selected dates" : presetLabel(p).toLowerCase());
