"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryBreakdown } from "@/components/analytics/CategoryBreakdown";
import { InsightsPanel } from "@/components/analytics/InsightsPanel";
import { SpendMetrics } from "@/components/analytics/SpendMetrics";
import { RankedBars } from "@/components/charts/RankedBars";
import { TimeBars } from "@/components/charts/TimeBars";
import { DateRangeSelect } from "@/components/common/DateRangeSelect";
import { PageHeader, Toolbar } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { LoadingRegion, SkeletonBars, SkeletonChart, SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useSpendSummary } from "@/hooks/useAnalytics";
import { useRangeState } from "@/hooks/useRangeState";
import { formatDate, formatMonth, paymentMethodLabel } from "@/utils/format";

export default function AnalyticsPage() {
  const { preset, custom, range, set } = useRangeState("this-month");
  const [includeGroups, setIncludeGroups] = useState(true);
  const summary = useSpendSummary(range, includeGroups);
  const d = summary.data;

  // New range/toggle → skeletons in place; background refetch → thin progress bar.
  const loading = summary.isPending || summary.isPlaceholderData;
  const refreshing = summary.isFetching && !loading;
  const empty = !loading && d?.transactionCount === 0;

  if (summary.isError && !d) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Panel>
          <ErrorState title="Unable to load analytics" error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
        </Panel>
      </>
    );
  }

  const daily = d?.daily.length ? d.daily : null;

  return (
    <>
      <PageHeader title="Analytics" description="What you spend on, how it changes, and where it comes from." />

      <Toolbar className="md:justify-between">
        <DateRangeSelect preset={preset} custom={custom} onChange={set} />
        <Switch checked={includeGroups} onChange={setIncludeGroups} label="Include my share of group expenses" />
      </Toolbar>

      <SpendMetrics data={loading ? undefined : d} loading={loading} refreshing={refreshing} />

      {empty ? (
        <Panel className="mt-6">
          <EmptyState
            title="No spending in this period"
            description="There are no expenses between these dates. Choose a wider range to see trends."
          />
        </Panel>
      ) : (
        <>
          <InsightsPanel range={range} includeGroups={includeGroups} className="mt-6" />

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Panel className="lg:col-span-3" busy={refreshing}>
              <PanelHeader
                title={daily || loading ? "Day by day" : "Month by month"}
                description={d && !loading ? `${formatDate(d.from)} – ${formatDate(d.to)}` : " "}
              />
              <PanelBody>
                {loading ? (
                  <LoadingRegion label="Loading chart">
                    <div className="mb-3 h-5" />
                    <SkeletonChart height={260} bars={daily ? 20 : 12} />
                  </LoadingRegion>
                ) : d && daily ? (
                  <TimeBars
                    title="Daily spending"
                    height={260}
                    includeGroups={includeGroups}
                    data={daily.map((p) => ({ key: p.date, personal: p.personal, group: p.group }))}
                    formatTick={(k) => formatDate(k, "short")}
                    formatLabel={(k) => formatDate(k, "long")}
                  />
                ) : d ? (
                  <TimeBars
                    title="Monthly spending"
                    height={260}
                    includeGroups={includeGroups}
                    data={d.monthly.map((m) => ({ key: m.month, personal: m.personal, group: m.group }))}
                    formatTick={(k) => formatMonth(k)}
                    formatLabel={(k) => formatMonth(k, "long")}
                  />
                ) : null}
              </PanelBody>
            </Panel>

            <Panel className="lg:col-span-2" busy={refreshing}>
              <PanelHeader title="By category" description={d && !loading ? `${d.byCategory.length} categories` : " "} />
              <PanelBody>
                {loading ? (
                  <LoadingRegion label="Loading categories">
                    <SkeletonBars rows={6} />
                  </LoadingRegion>
                ) : d ? (
                  <CategoryBreakdown data={d.byCategory} limit={8} showSplit={includeGroups} />
                ) : null}
              </PanelBody>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel busy={refreshing}>
              <PanelHeader title="Source" description="Personal vs each group" />
              <PanelBody>
                {loading ? (
                  <SkeletonBars rows={3} />
                ) : d ? (
                  <>
                    <RankedBars rows={d.bySource.map((s) => ({ key: String(s.groupId ?? "personal"), label: s.label, value: s.total, meta: `${s.count} ${s.count === 1 ? "item" : "items"}` }))} />
                    {includeGroups && d.bySource.some((s) => s.groupId) && (
                      <p className="mt-4 text-sm text-fg-3">
                        Group rows count only your share. <Link href="/groups" className="text-accent-text hover:underline hover:underline-offset-4">View groups</Link>
                      </p>
                    )}
                  </>
                ) : null}
              </PanelBody>
            </Panel>

            <Panel busy={refreshing}>
              <PanelHeader title="Payment method" description="Personal expenses only" />
              <PanelBody>
                {loading ? (
                  <SkeletonBars rows={4} />
                ) : d && d.byPaymentMethod.length ? (
                  <RankedBars rows={d.byPaymentMethod.map((m) => ({ key: m.method, label: paymentMethodLabel(m.method), value: m.total, meta: `${m.count} payments` }))} />
                ) : (
                  <EmptyState compact title="No personal expenses" description="Only group shares fall in this period." />
                )}
              </PanelBody>
            </Panel>

            <Panel busy={refreshing}>
              <PanelHeader title="Largest expenses" />
              {loading ? (
                <SkeletonList rows={5} />
              ) : d ? (
                <ol className="divide-y divide-line">
                  {d.topExpenses.map((t, i) => (
                    <li key={`${t.name}-${i}`} className="flex min-h-[56px] items-center gap-3 px-5 py-2.5">
                      <span className="tabular w-4 text-sm text-fg-3">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-fg">{t.name}</span>
                        <span className="block truncate text-sm text-fg-3">
                          {t.category} · {t.source} · {formatDate(t.date, "short")}
                        </span>
                      </span>
                      <Money value={t.amount} className="text-base font-medium" />
                    </li>
                  ))}
                </ol>
              ) : null}
            </Panel>
          </div>

          {daily && d && (
            <Panel className="mt-6" busy={refreshing}>
              <PanelHeader title="12-month trend" description={`Through ${formatMonth(d.to.slice(0, 7), "long")}`} />
              <PanelBody>
                <TimeBars
                  title="12-month trend"
                  includeGroups={includeGroups}
                  data={d.monthly.map((m) => ({ key: m.month, personal: m.personal, group: m.group }))}
                  formatTick={(k) => formatMonth(k)}
                  formatLabel={(k) => formatMonth(k, "long")}
                />
              </PanelBody>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
