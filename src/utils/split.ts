import type { SplitType } from "@/types";
import { currencySymbol } from "./format";

export interface SplitRow {
  userId: number;
  included: boolean;
  value: string;
}

/**
 * Mirrors the server's largest-remainder allocation so the form can preview
 * each person's share before saving. Returns amounts in rupees.
 */
export function previewSplit(total: number, type: SplitType, rows: SplitRow[]): Map<number, number> {
  const out = new Map<number, number>();
  const cents = Math.round(total * 100);
  if (cents <= 0) return out;

  if (type === "EXACT") {
    rows.forEach((r) => r.included && out.set(r.userId, Number(r.value) || 0));
    return out;
  }

  const weights = rows
    .filter((r) => r.included)
    .map((r) => ({ id: r.userId, w: type === "EQUAL" ? 1 : Math.max(Number(r.value) || 0, 0) }))
    .filter((r) => r.w > 0);
  const sum = weights.reduce((s, r) => s + r.w, 0);
  if (sum === 0) return out;

  let assigned = 0;
  const parts = weights.map((r) => {
    const exact = (cents * r.w) / sum;
    const floor = Math.floor(exact);
    assigned += floor;
    return { id: r.id, cents: floor, frac: exact - floor };
  });
  const byFraction = [...parts].sort((a, b) => b.frac - a.frac);
  for (let i = 0; assigned < cents; i = (i + 1) % byFraction.length, assigned++) byFraction[i].cents++;
  parts.forEach((p) => out.set(p.id, p.cents / 100));
  return out;
}

/** Validation message for the split, or null when it is valid. */
export function splitProblem(total: number, type: SplitType, rows: SplitRow[]): string | null {
  const included = rows.filter((r) => r.included);
  if (included.length === 0) return "Choose at least one person to split with.";
  if (type === "EQUAL") return null;
  const values = included.map((r) => Number(r.value) || 0);
  if (values.some((v) => v < 0)) return "Values can't be negative.";
  const sum = values.reduce((s, v) => s + v, 0);
  if (type === "EXACT" && Math.abs(sum - total) >= 0.005) {
    const diff = total - sum;
    return diff > 0 ? `${currencySymbol}${diff.toFixed(2)} left to assign.` : `Over by ${currencySymbol}${Math.abs(diff).toFixed(2)}.`;
  }
  if (type === "PERCENT" && Math.abs(sum - 100) >= 0.01) return `Percentages add up to ${+sum.toFixed(2)}%, not 100%.`;
  if (type === "SHARES" && sum === 0) return "Give at least one person a share.";
  return null;
}
