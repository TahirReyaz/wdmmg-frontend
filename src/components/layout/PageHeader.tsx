import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small context line above the title, e.g. a breadcrumb link. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-sm text-fg-3">{eyebrow}</div>}
        <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-base text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Filter/controls row directly under a page header. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center", className)}>{children}</div>;
}
