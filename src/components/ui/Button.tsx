import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/utils/cx";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none " +
  "transition-[background-color,border-color,color,box-shadow] duration-100 " +
  "disabled:cursor-not-allowed cursor-pointer border";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent border-accent text-accent-fg hover:bg-accent-hover hover:border-accent-hover active:translate-y-px " +
    "disabled:bg-fg-disabled disabled:border-fg-disabled disabled:text-surface",
  secondary:
    "bg-surface border-line-strong text-fg hover:bg-sunken hover:border-fg-3/50 active:translate-y-px " +
    "disabled:text-fg-disabled disabled:hover:bg-surface",
  ghost:
    "bg-transparent border-transparent text-fg-2 hover:bg-sunken hover:text-fg " +
    "disabled:text-fg-disabled disabled:hover:bg-transparent",
  danger:
    "bg-danger border-danger text-white hover:bg-danger-hover hover:border-danger-hover active:translate-y-px " +
    "disabled:opacity-50 dark:text-canvas",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-3.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner + loadingText in place of the label, without changing width. */
  loading?: boolean;
  loadingText?: ReactNode;
  leading?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, loadingText, leading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(base, variants[variant], sizes[size], className)}
    >
      {/* Both labels share one grid cell so the button keeps the width of the longer one. */}
      <span className="grid items-center">
        <span className={cx("col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5", loading && "invisible")}>
          {leading}
          {children}
        </span>
        <span
          className={cx("col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5", !loading && "invisible")}
          aria-hidden={!loading}
        >
          <Spinner />
          {loadingText ?? children}
        </span>
      </span>
    </button>
  );
});

/** Icon-only action. Always labelled; shows the label as a tooltip. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    size?: Size;
    tone?: "default" | "danger";
    tooltipSide?: "top" | "bottom";
    tooltipAlign?: "center" | "end";
  }
>(function IconButton(
  { label, size = "md", tone = "default", tooltipSide = "top", tooltipAlign = "center", className, children, type = "button", ...rest },
  ref,
) {
  return (
    <Tooltip content={label} side={tooltipSide} align={tooltipAlign}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        {...rest}
        className={cx(
          "inline-flex shrink-0 cursor-pointer items-center justify-center border border-transparent text-fg-3 transition-colors duration-100",
          "hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40",
          tone === "danger" ? "hover:text-danger" : "hover:text-fg",
          size === "sm" ? "size-7" : "size-9",
          className,
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
});
