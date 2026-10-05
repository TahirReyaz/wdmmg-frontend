import { Tag as TagIcon } from "lucide-react";
import type { TagRef } from "@/types";
import { cx } from "@/utils/cx";

/** Compact tag label for expense rows. The icon carries the tag's colour; the name says what it is. */
export function TagChip({ tag, className }: { tag: TagRef; className?: string }) {
  return (
    <span
      className={cx("inline-flex h-5 max-w-full min-w-0 items-center gap-1 border border-line bg-surface px-1.5 text-xs text-fg-2", className)}
      title={`Tag: ${tag.name}`}
    >
      <TagIcon className="size-3 shrink-0" style={{ color: tag.color }} aria-hidden />
      <span className="sr-only">Tag: </span>
      <span className="truncate">{tag.name}</span>
    </span>
  );
}
