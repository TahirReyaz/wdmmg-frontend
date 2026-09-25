"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoneyCompact } from "@/utils/format";
import { AXIS_TICK, ChartLegend, ChartTooltip, SERIES } from "./ChartTooltip";

export interface TimePoint {
  key: string;
  personal: number;
  group: number;
}

/**
 * Spend over time (months or days). Stacks personal and group share when
 * group data is included; otherwise a single series with no legend.
 */
export function TimeBars({
  data,
  includeGroups,
  height = 240,
  formatTick,
  formatLabel,
  title,
  seriesLabel = "Personal",
}: {
  data: TimePoint[];
  includeGroups: boolean;
  height?: number;
  formatTick: (key: string) => string;
  formatLabel: (key: string) => string;
  title: string;
  /** Name of the first series (used alone when groups are excluded). */
  seriesLabel?: string;
}) {
  return (
    <figure aria-label={title}>
      {includeGroups && (
        <div className="mb-3">
          <ChartLegend
            items={[
              { label: seriesLabel, color: SERIES.personal },
              { label: "Your group share", color: SERIES.group },
            ]}
          />
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="key" tickFormatter={formatTick} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--line-strong)" }} minTickGap={16} />
            <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
            <Tooltip cursor={{ fill: "var(--surface-sunken)" }} content={<ChartTooltip formatLabel={formatLabel} />} isAnimationActive={false} />
            <Bar dataKey="personal" name={seriesLabel} stackId="s" fill={SERIES.personal} isAnimationActive={false} />
            {includeGroups && (
              <Bar dataKey="group" name="Your group share" stackId="s" fill={SERIES.group} stroke="var(--surface)" strokeWidth={1} isAnimationActive={false} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
