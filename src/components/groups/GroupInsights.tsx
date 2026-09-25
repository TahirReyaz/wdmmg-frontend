"use client";

import { useGroupAnalytics } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import { formatMonth } from "@/utils/format";
import { CategoryBreakdown } from "../analytics/CategoryBreakdown";
import { PaidVsShare } from "../charts/PaidVsShare";
import { TimeBars } from "../charts/TimeBars";
import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { SkeletonBars, SkeletonChart } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";

export function GroupInsights({ groupId }: { groupId: number }) {
  const { user } = useAuth();
  const q = useGroupAnalytics(groupId);
  const d = q.data;

  if (q.isError && !d) {
    return (
      <Panel>
        <ErrorState title="Couldn't load group insights" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
      </Panel>
    );
  }
  if (d && d.count === 0) {
    return (
      <Panel>
        <EmptyState title="Nothing to analyse yet" description="Insights appear once the group has shared expenses." />
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy={q.isPending || undefined}>
      {q.isPending && (
        <span role="status" className="sr-only">
          Loading insights
        </span>
      )}
      <Panel busy={q.isFetching && !q.isPending}>
        <PanelHeader title="By category" />
        <PanelBody>{q.isPending ? <SkeletonBars rows={5} /> : d && <CategoryBreakdown data={d.byCategory} limit={8} />}</PanelBody>
      </Panel>
      <Panel busy={q.isFetching && !q.isPending}>
        <PanelHeader title="Paid vs share" description="Who fronted the money and who used it" />
        <PanelBody>
          {q.isPending ? (
            <>
              <div className="mb-3 h-5" />
              <SkeletonChart height={240} bars={4} />
            </>
          ) : (
            d && <PaidVsShare data={d.byMember.map((m) => ({ name: m.user.id === user?.id ? "You" : m.user.name.split(" ")[0], paid: m.paid, share: m.share }))} />
          )}
        </PanelBody>
      </Panel>
      <Panel className="lg:col-span-2" busy={q.isFetching && !q.isPending}>
        <PanelHeader title="By month" />
        <PanelBody>
          {q.isPending ? (
            <SkeletonChart height={220} />
          ) : (
            d && (
              <TimeBars
                title="Group spending by month"
                height={220}
                includeGroups={false}
                seriesLabel="Spent"
                data={d.monthly.map((m) => ({ key: m.month, personal: m.total, group: 0 }))}
                formatTick={(k) => formatMonth(k)}
                formatLabel={(k) => formatMonth(k, "long")}
              />
            )
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
