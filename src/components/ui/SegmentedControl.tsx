"use client";

import { cx } from "@/utils/cx";

/** Compact mutually exclusive choice (2–4 options). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex border border-line-strong bg-sunken p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-w-0 flex-1 cursor-pointer px-2 whitespace-nowrap transition-colors duration-100 sm:flex-none sm:px-3",
              size === "sm" ? "h-7 text-sm" : "h-8 text-base",
              active ? "bg-surface font-medium text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
