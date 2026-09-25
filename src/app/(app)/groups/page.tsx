"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Metric, MetricStrip } from "@/components/common/Metric";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { LoadingRegion, SkeletonList, SkeletonTableRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useCreateGroup, useGroupsOverview } from "@/hooks/useGroups";
import { formatMoney } from "@/utils/format";

function balanceText(b: number) {
  if (b > 0.004) return "Owes you";
  if (b < -0.004) return "You owe";
  return "Settled up";
}

export default function GroupsPage() {
  const router = useRouter();
  const toast = useToast();
  const overview = useGroupsOverview();
  const create = useCreateGroup();
  const [creating, setCreating] = useState(false);

  // Deep link from elsewhere: /groups?new=1
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setCreating(true);
      window.history.replaceState(null, "", "/groups");
    }
  }, []);

  const d = overview.data;
  const loading = overview.isPending;

  return (
    <>
      <PageHeader
        title="Groups"
        description="Shared costs with friends, flatmates and trips. Your share counts toward your own spending."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            New group
          </Button>
        }
      />

      {overview.isError && !d ? (
        <Panel>
          <ErrorState title="Unable to load your groups" error={overview.error} onRetry={() => overview.refetch()} retrying={overview.isFetching} />
        </Panel>
      ) : (
        <>
          <MetricStrip columns={3} label="Balances across groups" busy={overview.isFetching && !loading}>
            <Metric loading={loading} label="You owe" value={d && formatMoney(d.youOwe)} meta={d && (d.youOwe > 0 ? "Across all groups" : "Nothing outstanding")} />
            <Metric loading={loading} label="You're owed" value={d && formatMoney(d.youAreOwed)} meta={d && (d.youAreOwed > 0 ? "Across all groups" : "Nothing outstanding")} />
            <Metric loading={loading} label="Net position" value={d && <Money value={d.net} signed />} meta={d && `${d.groups.length} ${d.groups.length === 1 ? "group" : "groups"}`} className="max-md:col-span-2 max-md:border-t" />
          </MetricStrip>

          <Panel className="mt-6" busy={overview.isFetching && !loading}>
            {!loading && d && d.groups.length === 0 ? (
              <EmptyState
                title="No groups yet"
                description="Create a group, add people by the email they signed up with, and start splitting bills."
                action={
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    Create a group
                  </Button>
                }
              />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table label="Your groups">
                    <THead>
                      <tr>
                        <TH>Group</TH>
                        <TH className="w-28">Members</TH>
                        <TH align="right" className="w-40">
                          Total spent
                        </TH>
                        <TH align="right" className="w-48">
                          Your balance
                        </TH>
                      </tr>
                    </THead>
                    <tbody>
                      {loading ? (
                        <SkeletonTableRows rows={4} columns={[{ width: "40%", subline: true }, { width: "30%" }, { width: "55%", align: "right" }, { width: "55%", align: "right", subline: true }]} />
                      ) : (
                        d?.groups.map((g) => (
                          <TR key={g.id}>
                            <TD className="max-w-0">
                              <Link href={`/groups/${g.id}`} className="block truncate font-medium text-fg hover:underline hover:underline-offset-4">
                                {g.name}
                              </Link>
                              {g.description && <p className="truncate text-sm text-fg-3">{g.description}</p>}
                            </TD>
                            <TD className="tabular text-fg-2">{g.memberCount}</TD>
                            <TD align="right" className="text-fg-2">
                              <Money value={g.totalSpent} />
                            </TD>
                            <TD align="right">
                              <Money value={g.myBalance} signed className="font-medium" />
                              <p className="text-sm text-fg-3">{balanceText(g.myBalance)}</p>
                            </TD>
                          </TR>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="md:hidden">
                  {loading ? (
                    <LoadingRegion label="Loading groups">
                      <SkeletonList rows={4} />
                    </LoadingRegion>
                  ) : (
                    <ul className="divide-y divide-line">
                      {d?.groups.map((g) => (
                        <li key={g.id}>
                          <Link href={`/groups/${g.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-base font-medium text-fg">{g.name}</span>
                              <span className="block text-sm text-fg-3">
                                {g.memberCount} members · {formatMoney(g.totalSpent)} spent
                              </span>
                            </span>
                            <span className="text-right">
                              <Money value={g.myBalance} signed className="block text-base font-medium" />
                              <span className="text-xs text-fg-3">{balanceText(g.myBalance)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </Panel>
        </>
      )}

      <GroupFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New group"
        submitLabel="Create group"
        onSubmit={async (input) => {
          const g = await create.mutateAsync(input);
          toast.success("Group created", { description: "Add members from the group's Members tab." });
          router.push(`/groups/${g.id}`);
        }}
      />
    </>
  );
}
