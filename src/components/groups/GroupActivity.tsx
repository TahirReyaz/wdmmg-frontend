"use client";

import { useState } from "react";
import { errorMessage } from "@/api/client";
import { useDeleteGroupExpense, useDeleteSettlement, useGroupExpenses, useSettlements } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import type { GroupExpense, Settlement } from "@/types";
import { formatDate, splitTypeLabel } from "@/utils/format";
import { useConfirm } from "../ui/ConfirmDialog";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { Pagination } from "../ui/Pagination";
import { Panel, PanelFooter, PanelHeader } from "../ui/Panel";
import { LoadingRegion, SkeletonList } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { useToast } from "../ui/Toast";

const PAGE_SIZE = 20;

function MyPosition({ e, meId }: { e: GroupExpense; meId?: number }) {
  if (e.paidBy.id === meId) {
    const lent = e.amount - e.myShare;
    return lent > 0.004 ? (
      <>
        <Money value={lent} className="block text-base font-medium text-success" />
        <span className="text-xs text-fg-3">you lent</span>
      </>
    ) : (
      <span className="text-sm text-fg-3">your own share</span>
    );
  }
  if (e.myShare > 0) {
    return (
      <>
        <Money value={e.myShare} className="block text-base font-medium text-danger" />
        <span className="text-xs text-fg-3">you owe</span>
      </>
    );
  }
  return <span className="text-sm text-fg-3">not involved</span>;
}

export function GroupActivity({ groupId, onAdd, onEdit }: { groupId: number; onAdd: () => void; onEdit: (e: GroupExpense) => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const expenses = useGroupExpenses(groupId, page);
  const settlements = useSettlements(groupId);
  const removeExpense = useDeleteGroupExpense(groupId);
  const removeSettlement = useDeleteSettlement(groupId);
  const confirm = useConfirm();
  const toast = useToast();
  const name = (u: { id: number; name: string }) => (u.id === user?.id ? "You" : u.name);

  async function deleteExpense(e: GroupExpense) {
    const ok = await confirm({
      title: "Delete shared expense?",
      description: `“${e.name}” will be removed for everyone in the group and balances will be recalculated.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    removeExpense.mutate(e, {
      onSuccess: () => toast.success("Expense deleted"),
      onError: (err) => toast.error("Couldn't delete expense", { description: errorMessage(err) }),
    });
  }

  async function deleteSettlement(s: Settlement) {
    const ok = await confirm({
      title: "Delete payment?",
      description: `The record of ${name(s.from)} paying ${name(s.to)} will be removed and balances recalculated.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    removeSettlement.mutate(s, {
      onSuccess: () => toast.success("Payment deleted"),
      onError: (err) => toast.error("Couldn't delete payment", { description: errorMessage(err) }),
    });
  }

  const loading = expenses.isPending || expenses.isPlaceholderData;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="lg:col-span-2" busy={expenses.isFetching && !loading}>
        <PanelHeader title="Expenses" />
        {expenses.isError && !expenses.data ? (
          <ErrorState compact title="Couldn't load expenses" error={expenses.error} onRetry={() => expenses.refetch()} retrying={expenses.isFetching} />
        ) : loading ? (
          <LoadingRegion label="Loading expenses">
            <SkeletonList rows={6} />
          </LoadingRegion>
        ) : expenses.data?.content.length === 0 ? (
          <EmptyState
            title="No shared expenses yet"
            description="Add a bill and choose how to split it – equally, by amount, percentage or shares."
            action={
              <button type="button" onClick={onAdd} className="cursor-pointer text-base font-medium text-accent-text hover:underline hover:underline-offset-4">
                Add the first expense
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {expenses.data?.content.map((e) => (
              <li key={e.id} className="flex items-center gap-2 pr-2 pl-5">
                <button type="button" onClick={() => onEdit(e)} className="flex min-h-[64px] min-w-0 flex-1 cursor-pointer items-center gap-4 py-2.5 text-left">
                  <span className="tabular hidden w-14 shrink-0 text-sm text-fg-3 sm:block">{formatDate(e.date, "short")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-fg">{e.name}</span>
                    <span className="block truncate text-sm text-fg-3">
                      {name(e.paidBy)} paid <Money value={e.amount} /> · {splitTypeLabel[e.splitType].toLowerCase()} · {e.category.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <MyPosition e={e} meId={user?.id} />
                  </span>
                </button>
                <Menu
                  label={`Actions for ${e.name}`}
                  items={[
                    { label: "Edit", onSelect: () => onEdit(e) },
                    { label: "Delete", onSelect: () => deleteExpense(e), tone: "danger", separated: true },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
        {expenses.data && expenses.data.totalElements > PAGE_SIZE && (
          <PanelFooter>
            <Pagination page={page} size={PAGE_SIZE} total={expenses.data.totalElements} onPageChange={setPage} noun="expenses" />
          </PanelFooter>
        )}
      </Panel>

      <Panel busy={settlements.isFetching && !settlements.isPending}>
        <PanelHeader title="Payments" description="Money paid back between members" />
        {settlements.isPending ? (
          <SkeletonList rows={3} />
        ) : settlements.isError ? (
          <ErrorState compact title="Couldn't load payments" error={settlements.error} onRetry={() => settlements.refetch()} retrying={settlements.isFetching} />
        ) : settlements.data?.length === 0 ? (
          <EmptyState compact title="No payments recorded" description="Use Settle up when someone pays someone back." />
        ) : (
          <ul className="divide-y divide-line">
            {settlements.data?.map((s) => (
              <li key={s.id} className="flex min-h-[56px] items-center gap-2 pr-2 pl-5">
                <span className="min-w-0 flex-1 py-2">
                  <span className="block truncate text-base text-fg">
                    {name(s.from)} → {name(s.to)}
                  </span>
                  <span className="block truncate text-sm text-fg-3">
                    {formatDate(s.date)}
                    {s.note ? ` · ${s.note}` : ""}
                  </span>
                </span>
                <Money value={s.amount} className="text-base font-medium" />
                <Menu label={`Actions for payment on ${formatDate(s.date)}`} items={[{ label: "Delete payment", onSelect: () => deleteSettlement(s), tone: "danger" }]} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
