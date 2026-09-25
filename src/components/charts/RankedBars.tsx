import type { ReactNode } from "react";
import { formatMoney, formatPercent } from "@/utils/format";

export interface RankedRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Share of total (0–100); shown as a right-aligned percentage. */
  pct?: number;
  color?: string;
  meta?: ReactNode;
}

/**
 * Ranked horizontal bars rendered in HTML. Every row is labelled with its
 * name, amount and share, so it doubles as the accessible table view.
 */
export function RankedBars({ rows, max }: { rows: RankedRow[]; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-base">
            <span className="min-w-0 truncate text-fg">{r.label}</span>
            <span className="flex shrink-0 items-baseline gap-3">
              <span className="tabular text-fg">{formatMoney(r.value)}</span>
              {r.pct !== undefined && <span className="tabular w-11 text-right text-sm text-fg-3">{formatPercent(r.pct)}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 bg-sunken" aria-hidden>
            <div className="h-full transition-[width] duration-300" style={{ width: `${Math.max((r.value / top) * 100, 0.5)}%`, background: r.color ?? "var(--fg-secondary)" }} />
          </div>
          {r.meta && <p className="mt-1 text-sm text-fg-3">{r.meta}</p>}
        </li>
      ))}
    </ul>
  );
}
