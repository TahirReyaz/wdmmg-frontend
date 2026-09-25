"use client";

import Link from "next/link";
import { useGroupsOverview } from "@/hooks/useGroups";
import { formatMoney } from "@/utils/format";
import { Money } from "../ui/Money";
import { Panel, PanelHeader } from "../ui/Panel";
import { LoadingRegion, Skeleton, SkeletonList } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";

/** Where you stand across all groups. */
export function BalanceSummary() {
  const { data, isPending, isError, error, refetch, isFetching } = useGroupsOverview();
  const open = data?.groups.filter((g) => Math.abs(g.myBalance) > 0.004) ?? [];

  return (
    <Panel busy={isFetching && !isPending}>
      <PanelHeader
        title="Group balances"
        actions={
          <Link href="/groups" className="text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
            Groups
          </Link>
        }
      />
      {isPending ? (
        <LoadingRegion label="Loading balances">
          <div className="grid grid-cols-2 border-b border-line">
            {[0, 1].map((i) => (
              <div key={i} className="px-5 py-3.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-4.5 w-24" />
              </div>
            ))}
          </div>
          <SkeletonList rows={3} />
        </LoadingRegion>
      ) : isError ? (
        <ErrorState compact title="Couldn't load balances" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : data && data.groups.length === 0 ? (
        <EmptyState
          compact
          title="No groups yet"
          description="Split trips, rent or dinners with others. Your share counts toward your spending."
          action={
            <Link href="/groups?new=1" className="text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
              Create a group
            </Link>
          }
        />
      ) : data ? (
        <>
          <dl className="grid grid-cols-2 border-b border-line">
            <div className="px-5 py-3.5">
              <dt className="text-sm text-fg-3">You owe</dt>
              <dd className={`tabular mt-0.5 text-lg font-semibold ${data.youOwe > 0 ? "text-danger" : "text-fg"}`}>{formatMoney(data.youOwe)}</dd>
            </div>
            <div className="border-l border-line px-5 py-3.5">
              <dt className="text-sm text-fg-3">You&apos;re owed</dt>
              <dd className={`tabular mt-0.5 text-lg font-semibold ${data.youAreOwed > 0 ? "text-success" : "text-fg"}`}>{formatMoney(data.youAreOwed)}</dd>
            </div>
          </dl>
          {open.length === 0 ? (
            <p className="px-5 py-4 text-base text-fg-3">You&apos;re settled up in every group.</p>
          ) : (
            <ul className="divide-y divide-line">
              {open.slice(0, 5).map((g) => (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-2.5 hover:bg-sunken/60">
                    <span className="min-w-0">
                      <span className="block truncate text-base text-fg">{g.name}</span>
                      <span className="text-sm text-fg-3">{g.myBalance > 0 ? "Owes you" : "You owe"}</span>
                    </span>
                    <Money value={g.myBalance} signed className="text-base font-medium" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Panel>
  );
}
