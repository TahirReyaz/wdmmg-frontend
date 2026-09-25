"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityTable, mergeActivity } from "@/components/analytics/ActivityTable";
import { CategoryBreakdown } from "@/components/analytics/CategoryBreakdown";
import { SpendMetrics } from "@/components/analytics/SpendMetrics";
import { TimeBars } from "@/components/charts/TimeBars";
import { useExpenseComposer } from "@/components/expenses/ExpenseComposer";
import { MoneyGlance } from "@/components/money/MoneyGlance";
import { DueNotice } from "@/components/recurring/DueNotice";
import { BalanceSummary } from "@/components/groups/BalanceSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { LoadingRegion, SkeletonBars, SkeletonChart } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useGroupShares, useSpendSummary } from "@/hooks/useAnalytics";
import { useExpenses } from "@/hooks/useExpenses";
import { useAuth } from "@/providers/AuthProvider";
import { resolveRange } from "@/utils/dates";
import { formatMonth } from "@/utils/format";

export default function OverviewPage() {
  const { user } = useAuth();
  const composer = useExpenseComposer();
  const MONTH = useMemo(() => resolveRange("this-month"), []);
  const RECENT = useMemo(() => resolveRange("last-3"), []);
  const summary = useSpendSummary(MONTH, true);
  const recent = useExpenses({ size: 8, sort: "date", dir: "desc" });
  const shares = useGroupShares(RECENT);

  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });
  const firstName = user?.name.split(" ")[0];
  const activityLoading = recent.isPending || shares.isPending;
  const activity = mergeActivity(recent.data?.content ?? [], shares.data ?? [], composer.open);

  return (
    <>
      <PageHeader title="Overview" description={`${firstName ? `${firstName}, here's` : "Here's"} where your money went in ${monthName}.`} />

      <DueNotice />

      <MoneyGlance />

      {summary.isError && !summary.data ? (
        <Panel>
          <ErrorState title="Couldn't load this month's summary" error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} compact />
        </Panel>
      ) : (
        <SpendMetrics data={summary.data} loading={summary.isPending} refreshing={summary.isFetching && !summary.isPending} totalLabel={`Spent in ${monthName}`} />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" busy={summary.isFetching && !summary.isPending}>
          <PanelHeader
            title="Monthly spending"
            description="Last 12 months"
            actions={
              <Link href="/analytics" className="text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
                Open analytics
              </Link>
            }
          />
          <PanelBody>
            {summary.isPending ? (
              <LoadingRegion label="Loading chart">
                <div className="mb-3 h-5" />
                <SkeletonChart height={240} />
              </LoadingRegion>
            ) : summary.data ? (
              <TimeBars
                title="Monthly spending"
                data={summary.data.monthly.map((m) => ({ key: m.month, personal: m.personal, group: m.group }))}
                includeGroups
                formatTick={(k) => formatMonth(k)}
                formatLabel={(k) => formatMonth(k, "long")}
              />
            ) : null}
          </PanelBody>
        </Panel>

        <Panel busy={summary.isFetching && !summary.isPending}>
          <PanelHeader title="Top categories" description={`${monthName} so far`} />
          <PanelBody>
            {summary.isPending ? (
              <LoadingRegion label="Loading categories">
                <SkeletonBars rows={5} />
              </LoadingRegion>
            ) : summary.data && summary.data.byCategory.length > 0 ? (
              <CategoryBreakdown data={summary.data.byCategory} limit={6} />
            ) : (
              <EmptyState compact title="Nothing spent yet" description={`Expenses you add in ${monthName} will be broken down here.`} />
            )}
          </PanelBody>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" busy={(recent.isFetching || shares.isFetching) && !activityLoading}>
          <PanelHeader
            title="Recent activity"
            description="Personal expenses and your share of group bills"
            actions={
              <Link href="/expenses" className="text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
                All expenses
              </Link>
            }
          />
          {recent.isError && !recent.data ? (
            <ErrorState compact title="Couldn't load recent activity" error={recent.error} onRetry={() => recent.refetch()} retrying={recent.isFetching} />
          ) : !activityLoading && activity.length === 0 ? (
            <EmptyState
              title="No expenses yet"
              description="Start tracking your spending by adding your first expense."
              action={
                <Button variant="primary" onClick={() => composer.open()}>
                  Add expense
                </Button>
              }
            />
          ) : (
            <ActivityTable rows={activity} loading={activityLoading} />
          )}
        </Panel>

        <BalanceSummary />
      </div>
    </>
  );
}
