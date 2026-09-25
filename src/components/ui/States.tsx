import type { ReactNode } from "react";
import { errorMessage } from "@/api/client";
import { cx } from "@/utils/cx";
import { Button } from "./Button";

/** Explains what's empty, why, and what to do next. */
export function EmptyState({
  title,
  description,
  action,
  className,
  compact,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cx("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <p className="text-md font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-base text-fg-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Failed request with a useful message and a retry. */
export function ErrorState({
  title,
  error,
  onRetry,
  retrying,
  className,
  compact,
}: {
  title: string;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div role="alert" className={cx("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <p className="text-md font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-base text-fg-3">{errorMessage(error, "Please try again.")}</p>
      {onRetry && (
        <Button className="mt-4" size="sm" onClick={onRetry} loading={retrying} loadingText="Retrying…">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline form-level error. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-base text-danger">
      {message}
    </p>
  );
}
