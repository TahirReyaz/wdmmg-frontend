import type { IncomeType } from "@/types";
import { LOCALE } from "@/utils/format";

export const INCOME_TYPES: { value: IncomeType; label: string }[] = [
  { value: "SALARY", label: "Salary" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "BUSINESS", label: "Business" },
  { value: "INTEREST", label: "Interest" },
  { value: "REFUND", label: "Refund" },
  { value: "GIFT", label: "Gift" },
  { value: "OTHER", label: "Other" },
];

export const incomeTypeLabel = (t: IncomeType) => INCOME_TYPES.find((x) => x.value === t)?.label ?? t;

/** "2026-09" → "September" (or "September 2025" outside the current year). */
export function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const sameYear = y === new Date().getFullYear();
  return d.toLocaleDateString(LOCALE, sameYear ? { month: "long" } : { month: "long", year: "numeric" });
}
