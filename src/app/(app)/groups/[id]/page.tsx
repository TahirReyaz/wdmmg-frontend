"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Metric, MetricStrip } from "@/components/common/Metric";
import { GroupActivity } from "@/components/groups/GroupActivity";
import { GroupBalances } from "@/components/groups/GroupBalances";
import { GroupExpenseDialog } from "@/components/groups/GroupExpenseDialog";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { GroupInsights } from "@/components/groups/GroupInsights";
import { GroupMembers } from "@/components/groups/GroupMembers";
import { SettleDialog, type SettleDraft } from "@/components/groups/SettleDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { LoadingRegion, Skeleton, SkeletonButton, SkeletonList } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useDeleteGroup, useGroup, useUpdateGroup } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import type { GroupExpense } from "@/types";
import { formatMoney } from "@/utils/format";
import { ApiError } from "@/api/client";

type Tab = "activity" | "balances" | "insights" | "members";

function Back() {
  return (
    <Link href="/groups" className="hover:text-fg hover:underline hover:underline-offset-4">
      Groups
    </Link>
  );
}

function GroupSkeleton() {
  return (
    <LoadingRegion label="Loading group">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-3 w-14" />
          <Skeleton className="mt-3 h-6 w-56" />
          <Skeleton className="mt-2.5 h-3.5 w-72" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton width={96} />
          <SkeletonButton width={120} />
        </div>
      </div>
      <div className="grid grid-cols-2 border border-line bg-surface md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-5 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 mb-4 flex gap-5 border-b border-line pb-3">
        {[64, 64, 60, 64].map((w, i) => (
          <Skeleton key={i} className="h-3.5" style={{ width: w }} />
        ))}
      </div>
      <div className="border border-line bg-surface">
        <SkeletonList rows={6} />
      </div>
    </LoadingRegion>
  );
}

export default function GroupPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const group = useGroup(id);
  const update = useUpdateGroup(id);
  const remove = useDeleteGroup(id);

  const [tab, setTab] = useState<Tab>("activity");
  const [expenseDialog, setExpenseDialog] = useState<{ open: boolean; expense?: GroupExpense }>({ open: false });
  const [settleDraft, setSettleDraft] = useState<SettleDraft | null>(null);
  const [renaming, setRenaming] = useState(false);

  if (group.isPending) return <GroupSkeleton />;

  if (group.isError || !group.data) {
    const notFound = group.error instanceof ApiError && group.error.status === 404;
    return (
      <>
        <PageHeader eyebrow={<Back />} title={notFound ? "Group not found" : "Group"} />
        <Panel>
          <ErrorState
            title={notFound ? "This group doesn't exist or you're no longer a member" : "Unable to load this group"}
            error={notFound ? new Error("Ask a member to add you again, or go back to your groups.") : group.error}
            onRetry={notFound ? undefined : () => group.refetch()}
            retrying={group.isFetching}
          />
        </Panel>
      </>
    );
  }

  const g = group.data;
  const members = g.members.filter((m) => m.member).map((m) => m.user);
  const me = g.members.find((m) => m.user.id === user?.id);
  const isOwner = g.createdBy.id === user?.id;
  // Settling is always "I paid someone"; prefill with what I owe, if anything.
  const firstDebt = g.simplifiedDebts.find((d) => d.from.id === user?.id);
  const otherMember = members.find((m) => m.id !== user?.id);

  const menu: MenuItem[] = [
    { label: "Rename group", onSelect: () => setRenaming(true) },
    { label: "Manage members", onSelect: () => setTab("members") },
    ...(isOwner
      ? [
          {
            label: "Delete group",
            tone: "danger" as const,
            separated: true,
            onSelect: () =>
              void confirm({
                title: `Delete “${g.name}”?`,
                description: "All of this group's expenses and payments will be permanently deleted for every member. This can't be undone.",
                confirmLabel: "Delete group",
                pendingLabel: "Deleting…",
                tone: "danger",
                action: async () => {
                  await remove.mutateAsync();
                  toast.success("Group deleted");
                  router.replace("/groups");
                },
              }),
          },
        ]
      : []),
  ];

  const balancePhrase = g.myBalance > 0.004 ? "You're owed" : g.myBalance < -0.004 ? "You owe" : "Your balance";

  return (
    <>
      <PageHeader
        eyebrow={<Back />}
        title={g.name}
        description={g.description ?? `${members.length} members · created by ${g.createdBy.id === user?.id ? "you" : g.createdBy.name}`}
        actions={
          <>
            <Button
              disabled={!otherMember}
              title={otherMember ? undefined : "Add someone to the group first"}
              onClick={() => setSettleDraft(firstDebt ? { to: firstDebt.to.id, amount: firstDebt.amount } : { to: otherMember!.id })}
            >
              Settle up
            </Button>
            <Button variant="primary" onClick={() => setExpenseDialog({ open: true })}>
              Add expense
            </Button>
            <Menu items={menu} label="Group options" />
          </>
        }
      />

      <MetricStrip columns={3} label="Group summary" busy={group.isFetching}>
        <Metric label="Total spent" value={formatMoney(g.totalSpent)} meta="All time, all members" />
        <Metric
          label={balancePhrase}
          value={<Money value={Math.abs(g.myBalance)} className={g.myBalance > 0.004 ? "text-success" : g.myBalance < -0.004 ? "text-danger" : undefined} />}
          meta={Math.abs(g.myBalance) <= 0.004 ? "All settled up" : g.myBalance > 0 ? "Others owe you in this group" : "You owe others in this group"}
        />
        <Metric label="Your share" value={formatMoney(me?.share ?? 0)} meta="Counted in your personal analytics" className="max-md:col-span-2" />
      </MetricStrip>

      <Tabs
        idBase="group"
        label="Group sections"
        className="mt-6 mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "activity", label: "Activity" },
          { value: "balances", label: "Balances", count: g.simplifiedDebts.length || undefined },
          { value: "insights", label: "Insights" },
          { value: "members", label: "Members", count: members.length },
        ]}
      />

      <TabPanel idBase="group" value={tab}>
        {tab === "activity" && <GroupActivity groupId={id} onAdd={() => setExpenseDialog({ open: true })} onEdit={(e) => setExpenseDialog({ open: true, expense: e })} />}
        {tab === "balances" && <GroupBalances group={g} onSettle={setSettleDraft} />}
        {tab === "insights" && <GroupInsights groupId={id} />}
        {tab === "members" && (
          <GroupMembers
            group={g}
            onLeft={() => {
              toast.success(`You left ${g.name}`);
              router.replace("/groups");
            }}
          />
        )}
      </TabPanel>

      <GroupExpenseDialog
        open={expenseDialog.open}
        expense={expenseDialog.expense}
        onClose={() => setExpenseDialog({ open: false })}
        groupId={id}
        members={members}
      />
      <SettleDialog open={!!settleDraft} draft={settleDraft} onClose={() => setSettleDraft(null)} groupId={id} members={members} />
      <GroupFormDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename group"
        submitLabel="Save changes"
        initial={{ name: g.name, description: g.description ?? undefined }}
        onSubmit={async (input) => {
          await update.mutateAsync(input);
          setRenaming(false);
          toast.success("Group updated");
        }}
      />
    </>
  );
}
