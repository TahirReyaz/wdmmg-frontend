"use client";

import { useState } from "react";
import { errorMessage } from "@/api/client";
import { useDeleteRecurring, usePendingOccurrences, useRecurringList, useSetRecurringActive } from "@/hooks/useRecurring";
import type { Occurrence, RecurringExpense } from "@/types";
import { formatDate, formatSchedule } from "@/utils/format";
import { CategoryLabel } from "../common/CategoryLabel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialog";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { Panel, PanelHeader } from "../ui/Panel";
import { LoadingRegion, SkeletonList, SkeletonTableRows } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { ConfirmOccurrenceDialog } from "./ConfirmOccurrenceDialog";
import { DueList } from "./DueList";
import { RecurringDialog } from "./RecurringDialog";

function status(r: RecurringExpense) {
  if (!r.active) return <Badge>Paused</Badge>;
  if (!r.nextDueDate) return <Badge>Ended</Badge>;
  return <Badge tone="success">Active</Badge>;
}

/** Recurring tab: items waiting for confirmation, then the schedules themselves. */
export function RecurringView({ dialog, setDialog }: { dialog: { open: boolean; item?: RecurringExpense }; setDialog: (d: { open: boolean; item?: RecurringExpense }) => void }) {
  const list = useRecurringList();
  const pending = usePendingOccurrences();
  const setActive = useSetRecurringActive();
  const remove = useDeleteRecurring();
  const confirm = useConfirm();
  const toast = useToast();
  const [adjusting, setAdjusting] = useState<Occurrence | null>(null);

  const fail = (title: string) => (err: unknown) => toast.error(title, { description: errorMessage(err) });

  async function onDelete(r: RecurringExpense) {
    const ok = await confirm({
      title: `Delete “${r.name}”?`,
      description:
        r.pendingCount > 0
          ? `No more reminders will be sent, and ${r.pendingCount} waiting ${r.pendingCount === 1 ? "reminder" : "reminders"} will be dismissed. Expenses already added stay.`
          : "No more reminders will be sent. Expenses already added from it stay in your history.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) remove.mutate(r, { onSuccess: () => toast.success("Recurring expense deleted"), onError: fail("Couldn't delete") });
  }

  const rows = list.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {(pending.data?.length ?? 0) > 0 && (
        <Panel busy={pending.isFetching}>
          <PanelHeader title="Waiting for your confirmation" description="These came due. Add them to your expenses or skip this time." />
          <DueList items={pending.data ?? []} onAdjust={setAdjusting} />
        </Panel>
      )}

      <Panel busy={list.isFetching && !list.isPending}>
        <PanelHeader
          title="Recurring expenses"
          description="Rent, subscriptions and bills. You're asked to confirm each one when it's due."
        />
        {list.isError && !list.data ? (
          <ErrorState title="Unable to load recurring expenses" error={list.error} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : !list.isPending && rows.length === 0 ? (
          <EmptyState
            title="No recurring expenses yet"
            description="Add things you pay on a schedule – you'll get a reminder to confirm each payment, so nothing is added without your OK."
            action={
              <Button variant="primary" size="sm" onClick={() => setDialog({ open: true })}>
                Add recurring expense
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table label="Recurring expenses">
                <THead>
                  <tr>
                    <TH>Name</TH>
                    <TH className="w-40">Repeats</TH>
                    <TH className="w-32">Next due</TH>
                    <TH className="w-24">Status</TH>
                    <TH align="right" className="w-32">
                      Amount
                    </TH>
                    <TH className="w-12">
                      <span className="sr-only">Actions</span>
                    </TH>
                  </tr>
                </THead>
                <tbody>
                  {list.isPending ? (
                    <SkeletonTableRows rows={4} columns={[{ width: "50%", subline: true }, { width: "70%" }, { width: "60%" }, { width: "60%" }, { width: "60%", align: "right" }, { width: "0%" }]} />
                  ) : (
                    rows.map((r) => (
                      <TR key={r.id} className={r.active ? undefined : "text-fg-3"}>
                        <TD className="max-w-0">
                          <button type="button" onClick={() => setDialog({ open: true, item: r })} className="block max-w-full cursor-pointer truncate text-left text-fg hover:underline hover:decoration-line-strong hover:underline-offset-4">
                            {r.name}
                          </button>
                          <span className="block text-sm text-fg-3">
                            <CategoryLabel name={r.category.name} color={r.category.color} />
                          </span>
                        </TD>
                        <TD className="text-fg-2">{formatSchedule(r.frequency, r.intervalCount)}</TD>
                        <TD className="tabular text-fg-2">{r.active && r.nextDueDate ? formatDate(r.nextDueDate) : "—"}</TD>
                        <TD>{status(r)}</TD>
                        <TD align="right" className="font-medium">
                          <Money value={r.amount} />
                        </TD>
                        <TD className="pr-2 text-right">
                          <Menu label={`Actions for ${r.name}`} items={menuItems(r)} />
                        </TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            <div className="md:hidden">
              {list.isPending ? (
                <LoadingRegion label="Loading recurring expenses">
                  <SkeletonList rows={4} />
                </LoadingRegion>
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 pr-2 pl-4">
                      <button type="button" onClick={() => setDialog({ open: true, item: r })} className="flex min-h-[64px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 text-left">
                        <span className="min-w-0 flex-1">
                          <span className={r.active ? "block truncate text-base text-fg" : "block truncate text-base text-fg-3"}>{r.name}</span>
                          <span className="block truncate text-sm text-fg-3">
                            {formatSchedule(r.frequency, r.intervalCount)}
                            {r.active && r.nextDueDate ? ` · next ${formatDate(r.nextDueDate)}` : !r.active ? " · paused" : " · ended"}
                          </span>
                        </span>
                        <Money value={r.amount} className="text-base font-medium" />
                      </button>
                      <Menu label={`Actions for ${r.name}`} items={menuItems(r)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Panel>

      <RecurringDialog open={dialog.open} item={dialog.item} onClose={() => setDialog({ open: false })} />
      <ConfirmOccurrenceDialog occurrence={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  );

  function menuItems(r: RecurringExpense) {
    return [
      { label: "Edit", onSelect: () => setDialog({ open: true, item: r }) },
      r.active
        ? { label: "Pause reminders", onSelect: () => setActive.mutate({ item: r, active: false }, { onSuccess: () => toast.success("Paused", { description: r.name }), onError: fail("Couldn't pause") }) }
        : { label: "Resume reminders", onSelect: () => setActive.mutate({ item: r, active: true }, { onSuccess: () => toast.success("Resumed", { description: r.name }), onError: fail("Couldn't resume") }) },
      { label: "Delete", tone: "danger" as const, separated: true, onSelect: () => onDelete(r) },
    ];
  }
}
