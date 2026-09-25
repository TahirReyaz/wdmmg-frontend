"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cx } from "@/utils/cx";

export interface OtpInputHandle {
  focus: () => void;
}

/**
 * One box per digit. Typing advances, Backspace steps back, arrows move, and pasting
 * (or the phone's one-time-code autofill) fills every box at once.
 */
export const OtpInput = forwardRef<
  OtpInputHandle,
  { value: string; onChange: (value: string) => void; length?: number; invalid?: boolean; disabled?: boolean; describedBy?: string }
>(function OtpInput({ value, onChange, length = 6, invalid, disabled, describedBy }, ref) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  // The latest value, readable from focus handlers that run before the parent re-renders.
  const valueRef = useRef(value);
  valueRef.current = value;
  // Where focus should go once the new value has rendered.
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current == null) return;
    const i = pendingFocus.current;
    pendingFocus.current = null;
    refs.current[i]?.focus();
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => refs.current[Math.min(valueRef.current.length, length - 1)]?.focus(),
  }));

  const clamp = (i: number) => Math.max(0, Math.min(length - 1, i));
  const focusAt = (i: number) => refs.current[clamp(i)]?.focus();
  /** Change the value, then move focus once it has rendered (moving it now would hit a stale box). */
  const update = (next: string, focusIndex: number) => {
    pendingFocus.current = clamp(focusIndex);
    if (next === value) {
      // No re-render will happen – focus right away.
      focusAt(focusIndex);
      pendingFocus.current = null;
    }
    onChange(next);
  };

  function write(from: number, typed: string) {
    const clean = typed.replace(/\D/g, "");
    if (!clean) return;
    // Overwrite from `from` onward, keeping any later digits that weren't replaced.
    const next = (value.slice(0, from) + clean + value.slice(from + clean.length)).slice(0, length);
    update(next, from + clean.length);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) update(value.slice(0, i) + value.slice(i + 1), i);
      else if (i > 0) update(value.slice(0, i - 1) + value.slice(i), i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>, i: number) {
    e.preventDefault();
    write(i, e.clipboardData.getData("text"));
  }

  return (
    <div role="group" aria-label="Verification code" aria-describedby={describedBy} className="grid grid-cols-6 gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={i === 0 ? length : 1}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          // Only the next empty box (or the last) is reachable by Tab, like a single field.
          tabIndex={i === Math.min(value.length, length - 1) ? 0 : -1}
          onFocus={(e) => {
            // Keep entry sequential: clicking ahead jumps back to the first empty box.
            const current = valueRef.current.length;
            if (i > current) focusAt(current);
            else e.currentTarget.select();
          }}
          onChange={(e) => write(Math.min(i, value.length), e.target.value.slice(-(i === 0 ? length : 1)))}
          onKeyDown={(e) => onKeyDown(e, i)}
          onPaste={(e) => onPaste(e, i)}
          className={cx(
            "tabular h-12 w-full border bg-surface text-center text-xl font-semibold text-fg caret-accent",
            "transition-[border-color,box-shadow] duration-100 focus:outline-none",
            "focus:border-accent focus:shadow-[0_0_0_1px_var(--accent)] disabled:bg-sunken disabled:text-fg-3",
            invalid ? "border-danger focus:border-danger focus:shadow-[0_0_0_1px_var(--danger)]" : d ? "border-fg-3/60" : "border-line-strong",
          )}
        />
      ))}
    </div>
  );
});
