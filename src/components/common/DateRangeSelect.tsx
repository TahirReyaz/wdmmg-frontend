"use client";

import { Input, Select } from "../ui/Field";
import { RANGE_PRESETS, type DateRange, type RangePreset } from "@/utils/dates";

export function DateRangeSelect({
  preset,
  custom,
  onChange,
  exclude = [],
}: {
  preset: RangePreset;
  custom: DateRange;
  onChange: (preset: RangePreset, custom: DateRange) => void;
  exclude?: RangePreset[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Date range" className="w-full sm:w-44" value={preset} onChange={(e) => onChange(e.target.value as RangePreset, custom)}>
        {RANGE_PRESETS.filter((p) => !exclude.includes(p.value)).map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
      {preset === "custom" && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input aria-label="From date" type="date" className="flex-1 sm:w-38" value={custom.from} max={custom.to} onChange={(e) => onChange("custom", { ...custom, from: e.target.value })} />
          <span className="text-fg-3" aria-hidden>
            –
          </span>
          <Input aria-label="To date" type="date" className="flex-1 sm:w-38" value={custom.to} min={custom.from} onChange={(e) => onChange("custom", { ...custom, to: e.target.value })} />
        </div>
      )}
    </div>
  );
}
