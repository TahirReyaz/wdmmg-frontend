import type { CategoryStat } from "@/types";
import { formatMoney } from "@/utils/format";
import { RankedBars } from "../charts/RankedBars";

/** Categories ranked by spend. Folds the tail into "Other categories" when limited. */
export function CategoryBreakdown({ data, limit, showSplit }: { data: CategoryStat[]; limit?: number; showSplit?: boolean }) {
  let rows = data;
  if (limit && data.length > limit) {
    const head = data.slice(0, limit - 1);
    const tail = data.slice(limit - 1);
    const total = tail.reduce((s, c) => s + c.total, 0);
    const pct = tail.reduce((s, c) => s + c.pct, 0);
    rows = [
      ...head,
      { categoryId: -1, name: `${tail.length} other categories`, color: "var(--fg-muted)", total, personal: 0, group: 0, count: 0, pct },
    ];
  }
  return (
    <RankedBars
      rows={rows.map((c) => ({
        key: String(c.categoryId),
        label: (
          <span className="inline-flex items-center gap-2">
            <span className="size-2 shrink-0" style={{ background: c.color }} aria-hidden />
            {c.name}
          </span>
        ),
        value: c.total,
        pct: c.pct,
        color: c.color,
        meta: showSplit && c.group > 0 ? `${formatMoney(c.personal)} personal · ${formatMoney(c.group)} group share` : undefined,
      }))}
    />
  );
}
