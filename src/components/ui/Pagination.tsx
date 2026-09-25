import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./Button";

export function Pagination({
  page,
  size,
  total,
  onPageChange,
  noun = "results",
}: {
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const start = total === 0 ? 0 : page * size + 1;
  const end = Math.min(total, (page + 1) * size);
  return (
    <nav aria-label="Pagination" className="flex items-center gap-3">
      <p className="tabular text-sm text-fg-3" aria-live="polite">
        {total === 0 ? `No ${noun}` : `${start}–${end} of ${total.toLocaleString()} ${noun}`}
      </p>
      {pages > 1 && (
        <div className="flex items-center">
          <IconButton label="Previous page" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </IconButton>
          <IconButton label="Next page" size="sm" disabled={page + 1 >= pages} onClick={() => onPageChange(page + 1)} tooltipAlign="end">
            <ChevronRight className="size-4" aria-hidden />
          </IconButton>
        </div>
      )}
    </nav>
  );
}
