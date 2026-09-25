import { formatMoney } from "@/utils/format";

interface Entry {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
}

/** Shared tooltip: label, one row per series, total when stacked. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  showTotal = true,
}: {
  active?: boolean;
  payload?: Entry[];
  label?: string | number;
  formatLabel?: (label: string) => string;
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) !== 0 || payload.length === 1);
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
  return (
    <div className="min-w-44 border border-line bg-raised px-3 py-2 text-sm shadow-raised">
      <p className="mb-1.5 font-medium text-fg">{formatLabel ? formatLabel(String(label)) : label}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-fg-2">
              <span className="size-2" style={{ background: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="tabular text-fg">{formatMoney(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
      {showTotal && payload.length > 1 && (
        <p className="mt-1.5 flex justify-between gap-4 border-t border-line pt-1.5 font-medium text-fg">
          <span>Total</span>
          <span className="tabular">{formatMoney(total)}</span>
        </p>
      )}
    </div>
  );
}

/** HTML legend – always present for 2+ series. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export const AXIS_TICK = { fill: "var(--fg-muted)", fontSize: 11 };
export const SERIES = { personal: "var(--series-1)", group: "var(--series-2)" };
