"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoneyCompact } from "@/utils/format";
import { AXIS_TICK, ChartLegend, ChartTooltip, SERIES } from "./ChartTooltip";

/** Per member: what they paid vs their share of the costs. */
export function PaidVsShare({ data, height = 240 }: { data: { name: string; paid: number; share: number }[]; height?: number }) {
  return (
    <figure aria-label="Paid versus share by member">
      <div className="mb-3">
        <ChartLegend
          items={[
            { label: "Paid", color: SERIES.personal },
            { label: "Share of costs", color: SERIES.group },
          ]}
        />
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--line-strong)" }} interval={0} />
            <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
            <Tooltip cursor={{ fill: "var(--surface-sunken)" }} content={<ChartTooltip showTotal={false} />} isAnimationActive={false} />
            <Bar dataKey="paid" name="Paid" fill={SERIES.personal} isAnimationActive={false} />
            <Bar dataKey="share" name="Share of costs" fill={SERIES.group} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
