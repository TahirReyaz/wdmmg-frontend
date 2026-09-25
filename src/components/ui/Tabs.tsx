"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "@/utils/cx";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Underline tabs with roving focus (arrow keys / Home / End).
 * Pair each panel with id `${idBase}-panel-${value}` and aria-labelledby `${idBase}-tab-${value}`.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  idBase,
  label,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  idBase: string;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].value);
  }

  return (
    <div role="tablist" aria-label={label} className={cx("flex gap-5 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}>
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idBase}-tab-${item.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              "-mb-px inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 pt-1 pb-2.5 text-base transition-colors duration-100",
              selected ? "border-accent font-medium text-fg" : "border-transparent text-fg-3 hover:text-fg-2",
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="tabular text-sm text-fg-3">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, value, children, className }: { idBase: string; value: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-tab-${value}`} className={cx("animate-fade-in", className)}>
      {children}
    </div>
  );
}
