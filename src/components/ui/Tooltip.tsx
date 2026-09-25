import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

/**
 * Lightweight CSS tooltip. Appears after a short delay on hover or keyboard
 * focus. The trigger must carry its own accessible name (aria-label); the
 * tooltip is visual reinforcement only.
 */
export function Tooltip({
  content,
  side = "top",
  align = "center",
  children,
  className,
}: {
  content: ReactNode;
  side?: "top" | "bottom";
  align?: "center" | "end";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="presentation"
        className={cx(
          "pointer-events-none absolute z-40 whitespace-nowrap bg-fg px-2 py-1 text-xs font-medium text-canvas opacity-0",
          "transition-opacity duration-100 group-hover/tooltip:opacity-100 group-hover/tooltip:delay-300",
          "group-has-[:focus-visible]/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
