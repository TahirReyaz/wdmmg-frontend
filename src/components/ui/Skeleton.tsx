import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/utils/cx";

/*
 * Skeleton system. Every placeholder uses the single `.skeleton` shimmer
 * defined in globals.css so loading feels the same everywhere, and each
 * composite mirrors the dimensions of the real component it stands in for.
 */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cx("skeleton block", className)} style={style} />;
}

/** Wraps placeholders so screen readers hear one "Loading …" message. */
export function LoadingRegion({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({ lines = 1, widths, className }: { lines?: number; widths?: string[]; className?: string }) {
  return (
    <span className={cx("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: widths?.[i % widths.length] ?? (i === lines - 1 && lines > 1 ? "60%" : "100%") }} />
      ))}
    </span>
  );
}

export function SkeletonAvatar({ size = 32 }: { size?: number }) {
  return <Skeleton className="shrink-0" style={{ width: size, height: size }} />;
}

export function SkeletonButton({ width = 96, size = "md" }: { width?: number; size?: "sm" | "md" }) {
  return <Skeleton className={size === "sm" ? "h-8" : "h-9"} style={{ width }} />;
}

/** Matches <Metric>. */
export function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div className={cx("flex flex-col", className)} aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2.5 h-3 w-20" />
    </div>
  );
}

/** Matches a <Panel> with a header and a few text lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("border border-line bg-surface", className)} aria-hidden>
      <div className="border-b border-line px-5 py-3.5">
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="px-5 py-4">
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

export interface SkeletonColumn {
  /** CSS width of the placeholder bar within the cell */
  width: string;
  align?: "left" | "right";
  /** Second, shorter line (e.g. notes under a name) */
  subline?: boolean;
  className?: string;
}

/** Table body rows that keep the real table's columns and row height. */
export function SkeletonTableRows({ columns, rows = 8 }: { columns: SkeletonColumn[]; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden className="border-b border-line last:border-b-0">
          {columns.map((c, i) => (
            <td key={i} className={cx("h-[52px] px-4 py-2", c.className)}>
              <span className={cx("flex flex-col gap-1.5", c.align === "right" && "items-end")}>
                <Skeleton className="h-3" style={{ width: jitter(c.width, r + i) }} />
                {c.subline && <Skeleton className="h-2.5" style={{ width: "40%" }} />}
              </span>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** List rows: optional avatar, title + meta, trailing value/action. */
export function SkeletonList({ rows = 5, avatar = false, trailing = true }: { rows?: number; avatar?: boolean; trailing?: boolean }) {
  return (
    <ul aria-hidden className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex h-[60px] items-center gap-3 px-5">
          {avatar && <SkeletonAvatar size={32} />}
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3" style={{ width: jitter("45%", i) }} />
            <Skeleton className="h-2.5" style={{ width: jitter("28%", i + 3) }} />
          </span>
          {trailing && <Skeleton className="h-3 w-16" />}
        </li>
      ))}
    </ul>
  );
}

/** Chart placeholder: baseline, faint gridlines and bars at the real height. */
export function SkeletonChart({ height = 240, bars = 12 }: { height?: number; bars?: number }) {
  const heights = [42, 58, 35, 66, 50, 72, 48, 60, 38, 70, 55, 64, 45, 52, 61, 40];
  return (
    <div aria-hidden className="relative flex items-end gap-[3%] pb-6 pl-12" style={{ height }}>
      <div className="absolute inset-x-0 top-0 bottom-6 left-12 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-[var(--grid)]" />
        ))}
      </div>
      <div className="absolute top-0 bottom-6 left-0 flex w-10 flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
      {Array.from({ length: bars }, (_, i) => (
        <Skeleton key={i} className="relative flex-1" style={{ height: `${heights[i % heights.length]}%` }} />
      ))}
    </div>
  );
}

/** Horizontal ranked bars (category breakdown). */
export function SkeletonBars({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <div className="mb-2 flex justify-between">
            <Skeleton className="h-3" style={{ width: jitter("34%", i) }} />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-1.5" style={{ width: `${90 - i * 14}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Deterministic width variation so rows don't look stamped. */
function jitter(width: string, seed: number): string {
  const m = /^(\d+(?:\.\d+)?)%$/.exec(width);
  if (!m) return width;
  const offsets = [0, -8, 6, -4, 10, -10, 3];
  const v = Math.max(12, Math.min(100, Number(m[1]) + offsets[seed % offsets.length]));
  return `${v}%`;
}
