import type { PersonalAnalytics } from "@/types";
import { formatMoneyWhole } from "@/utils/format";
import { Change, Metric, MetricStrip } from "../common/Metric";

/** Headline figures for a period; shared by Overview and Analytics. */
export function SpendMetrics({
  data,
  loading,
  refreshing,
  totalLabel = "Total spent",
}: {
  data: PersonalAnalytics | undefined;
  loading: boolean;
  refreshing?: boolean;
  totalLabel?: string;
}) {
  const d = data;
  return (
    <MetricStrip label="Spending summary" busy={refreshing}>
      <Metric loading={loading} label={totalLabel} value={d && formatMoneyWhole(d.total)} meta={d && <Change pct={d.changePct} />} />
      <Metric loading={loading} label="Daily average" value={d && formatMoneyWhole(d.dailyAverage)} meta={d && `${d.transactionCount} transactions`} />
      <Metric loading={loading} label="Personal" value={d && formatMoneyWhole(d.personalTotal)} meta={d && d.total > 0 ? `${Math.round((d.personalTotal / d.total) * 100)}% of total` : "—"} />
      <Metric
        loading={loading}
        label="Your group share"
        value={d && (d.includeGroups ? formatMoneyWhole(d.groupShareTotal) : "—")}
        meta={d && (d.includeGroups ? "Your portion of shared bills" : "Excluded from these figures")}
      />
    </MetricStrip>
  );
}
