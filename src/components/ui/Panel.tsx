import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

/**
 * The one surface container. Use for a distinct unit of content; don't nest
 * panels – use sections/dividers inside instead.
 */
export function Panel({
  children,
  className,
  busy,
  as: Tag = "section",
  "aria-labelledby": labelledBy,
}: {
  children: ReactNode;
  className?: string;
  /** Data is refreshing in place: thin progress bar + aria-busy, content stays usable. */
  busy?: boolean;
  as?: "section" | "div";
  "aria-labelledby"?: string;
}) {
  return (
    <Tag aria-busy={busy || undefined} aria-labelledby={labelledBy} className={cx("relative border border-line bg-surface", className)}>
      {busy && <div className="refresh-bar" aria-hidden />}
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  id,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <header className={cx("flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-5 py-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-md font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="text-sm text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("px-5 py-4", className)}>{children}</div>;
}

export function PanelFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <footer className={cx("flex items-center justify-between gap-3 border-t border-line px-5 py-3", className)}>{children}</footer>;
}

/** Heading for a group of content that isn't boxed. */
export function SectionHeading({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-md font-semibold text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-3">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
