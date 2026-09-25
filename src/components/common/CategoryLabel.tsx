import { cx } from "@/utils/cx";

/** Category identity: a small colour key next to the name (never colour alone). */
export function CategoryLabel({ name, color, retired, className }: { name: string; color: string; retired?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2", className)}>
      <span className="size-2 shrink-0" style={{ background: color }} aria-hidden />
      <span className="truncate">{name}</span>
      {retired && <span className="text-xs text-fg-3">(retired)</span>}
    </span>
  );
}
