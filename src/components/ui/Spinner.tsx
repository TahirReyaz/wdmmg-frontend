import { cx } from "@/utils/cx";

/** SVG so it stays round inside the square-cornered system. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("size-3.5 animate-spin", className)} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
