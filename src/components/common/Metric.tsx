import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { SkeletonMetric } from "../ui/Skeleton";

/** A single headline figure. Laid out in a MetricStrip rather than individual cards. */
export function Metric({
  label,
  value,
  meta,
  loading,
  className,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  if (loading) return <SkeletonMetric className={cx("px-5 py-4", className)} />;
  return (
    <div className={cx("px-5 py-4", className)}>
      <dt className="text-sm text-fg-3">{label}</dt>
      <dd className="tabular mt-1 text-metric font-semibold tracking-tight text-fg">{value}</dd>
      {meta && <dd className="mt-0.5 min-h-5 text-sm text-fg-3">{meta}</dd>}
    </div>
  );
}

/**
 * Row of related metrics sharing one surface, separated by hairlines.
 * 2 columns on phones, `columns` from md up.
 */
export function MetricStrip({ children, columns = 4, busy, label }: { children: ReactNode; columns?: 3 | 4; busy?: boolean; label: string }) {
  return (
    <section aria-label={label} aria-busy={busy || undefined} className="relative border border-line bg-surface">
      {busy && <div className="refresh-bar" aria-hidden />}
      <dl
        className={cx(
          "grid grid-cols-2 [&>*]:border-line max-md:[&>*:nth-child(n+3)]:border-t max-md:[&>*:nth-child(even)]:border-l md:[&>*+*]:border-l",
          columns === 4 ? "md:grid-cols-4" : "md:grid-cols-3",
        )}
      >
        {children}
      </dl>
    </section>
  );
}

/** Direction of change vs a previous period, with arrow + words (not colour alone). */
export function Change({ pct, invert = true }: { pct: number | null | undefined; invert?: boolean }) {
  if (pct == null) return <span>No earlier data to compare</span>;
  if (Math.abs(pct) < 0.05) return <span>Same as previous period</span>;
  const up = pct > 0;
  // For spending, "up" is bad by default.
  const good = invert ? !up : up;
  return (
    <span className={good ? "text-success" : "text-danger"}>
      {up ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}% <span className="text-fg-3">vs previous period</span>
    </span>
  );
}
