import { formatMoney } from "@/utils/format";
import { cx } from "@/utils/cx";

/**
 * Currency figure with tabular digits.
 * `signed` shows direction for balances: owed to you (+, success) vs you owe (−, danger);
 * the sign carries meaning so it never depends on colour alone.
 */
export function Money({ value, signed, muted, className }: { value: number; signed?: boolean; muted?: boolean; className?: string }) {
  const tone = signed ? (value > 0.004 ? "text-success" : value < -0.004 ? "text-danger" : "text-fg-3") : muted ? "text-fg-3" : undefined;
  const text = signed && value > 0.004 ? `+${formatMoney(value)}` : signed && value < -0.004 ? `−${formatMoney(Math.abs(value))}` : formatMoney(value);
  return <span className={cx("tabular whitespace-nowrap", tone, className)}>{text}</span>;
}
