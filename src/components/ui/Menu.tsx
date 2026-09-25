"use client";

import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/utils/cx";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Draws a separator above this item. */
  separated?: boolean;
}

/**
 * Accessible action menu (WAI-ARIA menu button pattern).
 * Default trigger is a "More actions" button; pass `trigger` for a custom label.
 */
export function Menu({
  items,
  label = "More actions",
  trigger,
  align = "end",
  className,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: (props: { open: boolean }) => ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  function openAt(index: number) {
    setActive(index);
    setOpen(true);
  }

  function onTriggerKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAt(enabled[0] ?? 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAt(enabled[enabled.length - 1] ?? 0);
    }
  }

  function onMenuKey(e: KeyboardEvent) {
    const pos = enabled.indexOf(active);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(enabled[(pos + 1) % enabled.length]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(enabled[(pos - 1 + enabled.length) % enabled.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(enabled[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(enabled[enabled.length - 1]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={rootRef} className={cx("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={trigger ? undefined : label}
        onClick={() => (open ? close() : openAt(enabled[0] ?? 0))}
        onKeyDown={onTriggerKey}
        className={cx(
          "inline-flex cursor-pointer items-center justify-center text-fg-3 transition-colors duration-100 hover:text-fg",
          !trigger && "size-8 hover:bg-sunken",
          open && !trigger && "bg-sunken text-fg",
        )}
      >
        {trigger ? trigger({ open }) : <MoreHorizontal className="size-4" aria-hidden />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cx(
            "absolute top-full z-40 mt-1 min-w-44 animate-pop-in border border-line bg-raised py-1 shadow-raised",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => (
            <div key={item.label}>
              {item.separated && <div role="separator" className="my-1 h-px bg-line" />}
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={i === active ? 0 : -1}
                disabled={item.disabled}
                onMouseEnter={() => !item.disabled && setActive(i)}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cx(
                  "flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-base outline-none",
                  "focus:bg-sunken disabled:cursor-not-allowed disabled:text-fg-disabled",
                  item.tone === "danger" ? "text-danger" : "text-fg",
                )}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
