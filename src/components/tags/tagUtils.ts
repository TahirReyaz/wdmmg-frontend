import type { Tag } from "@/types";
import { formatDate } from "@/utils/format";

/** Same palette as categories, so tags sit comfortably next to them. */
export const TAG_COLORS = ["#2a78d6", "#e34948", "#15805d", "#c8741a", "#4a3aa7", "#0e7c86", "#e87ba4", "#eda100", "#9d755d", "#64748b"];

/** A new tag gets the next colour in the palette, so neighbours differ. */
export const nextTagColor = (existing: number) => TAG_COLORS[existing % TAG_COLORS.length];

/** "20 Sep – 22 Sep 2026", "3 Oct", or "No expenses yet". */
export function tagDateSpan(tag: Pick<Tag, "firstDate" | "lastDate">) {
  if (!tag.firstDate || !tag.lastDate) return "No expenses yet";
  if (tag.firstDate === tag.lastDate) return formatDate(tag.firstDate);
  return `${formatDate(tag.firstDate, "short")} – ${formatDate(tag.lastDate)}`;
}
