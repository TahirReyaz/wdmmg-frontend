import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx } from "@/utils/cx";

/** Minimal table primitives: row separators only, sticky header, tabular numbers on numeric columns. */
export function Table({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-base" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-sunken">{children}</thead>;
}

export function TH({ children, align = "left", className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      {...rest}
      className={cx(
        "h-9 border-b border-line px-4 text-xs font-medium tracking-wide whitespace-nowrap text-fg-3 uppercase",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TR({ children, className, pending }: { children: ReactNode; className?: string; pending?: boolean }) {
  return (
    <tr
      aria-busy={pending || undefined}
      className={cx(
        "border-b border-line transition-[background-color,opacity] duration-150 last:border-b-0 hover:bg-sunken/60",
        pending && "opacity-60",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({ children, align = "left", className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <td {...rest} className={cx("h-[52px] px-4 py-2 align-middle", align === "right" && "tabular text-right", className)}>
      {children}
    </td>
  );
}
