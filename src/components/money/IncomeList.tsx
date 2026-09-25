"use client";

import { useState } from "react";
import { errorMessage } from "@/api/client";
import { useDeleteIncome, useIncome } from "@/hooks/useMoney";
import type { Income } from "@/types";
import { formatDate, formatRelativeDay } from "@/utils/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialog";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { Pagination } from "../ui/Pagination";
import { Panel, PanelFooter, PanelHeader } from "../ui/Panel";
import { LoadingRegion, SkeletonList, SkeletonTableRows } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { incomeTypeLabel } from "./incomeTypes";

const SIZE = 20;

/** Everything recorded as money received, newest first. */
export function IncomeList({ onAdd, onEdit }: { onAdd: () => void; onEdit: (item: Income) => void }) {
  const [page, setPage] = useState(0);
  const q = useIncome(page);
  const remove = useDeleteIncome();
  const confirm = useConfirm();
  const toast = useToast();
  const rows = q.data?.content ?? [];
  const loading = q.isPending;

  async function onDelete(item: Income) {
    const ok = await confirm({
      title: `Delete “${item.name}”?`,
      description: "Your bank balance will go down by this amount. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(item, {
      onSuccess: () => toast.success("Income deleted"),
      onError: (err) => toast.error("Couldn't delete", { description: errorMessage(err) }),
    });
  }

  const menu = (i: Income) => [
    { label: "Edit", onSelect: () => onEdit(i) },
    { label: "Delete", tone: "danger" as const, separated: true, onSelect: () => onDelete(i) },
  ];

  return (
    <Panel busy={q.isFetching && !loading}>
      <PanelHeader title="Money received" description="Salary and anything else that came into your account" />
      {q.isError && !q.data ? (
        <ErrorState title="Couldn't load income" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
      ) : !loading && rows.length === 0 && page === 0 ? (
        <EmptyState
          title="No income recorded"
          description="Add your salary or other money you receive so your balance reflects what's really in your account."
          action={
            <Button variant="primary" size="sm" onClick={onAdd}>
              Add money received
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table label="Money received">
              <THead>
                <tr>
                  <TH className="w-28">Date</TH>
                  <TH>Description</TH>
                  <TH className="w-32">Type</TH>
                  <TH align="right" className="w-36">
                    Amount
                  </TH>
                  <TH className="w-12">
                    <span className="sr-only">Actions</span>
                  </TH>
                </tr>
              </THead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows rows={6} columns={[{ width: "60%" }, { width: "50%" }, { width: "60%" }, { width: "60%", align: "right" }, { width: "0%" }]} />
                ) : (
                  rows.map((i) => (
                    <TR key={i.id}>
                      <TD className="tabular text-fg-2">{formatDate(i.date)}</TD>
                      <TD className="max-w-0">
                        <button type="button" onClick={() => onEdit(i)} className="block max-w-full cursor-pointer truncate text-left text-fg hover:underline hover:decoration-line-strong hover:underline-offset-4">
                          {i.name}
                        </button>
                        {i.notes && <span className="block truncate text-sm text-fg-3">{i.notes}</span>}
                      </TD>
                      <TD>
                        <Badge tone={i.type === "SALARY" ? "accent" : "neutral"}>{incomeTypeLabel(i.type)}</Badge>
                      </TD>
                      <TD align="right" className="font-medium">
                        <Money value={i.amount} className="text-success" />
                      </TD>
                      <TD className="pr-2 text-right">
                        <Menu label={`Actions for ${i.name}`} items={menu(i)} />
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden">
            {loading ? (
              <LoadingRegion label="Loading income">
                <SkeletonList rows={5} />
              </LoadingRegion>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 pr-2 pl-4">
                    <button type="button" onClick={() => onEdit(i)} className="flex min-h-[60px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-fg">{i.name}</span>
                        <span className="block truncate text-sm text-fg-3">
                          {formatRelativeDay(i.date)} · {incomeTypeLabel(i.type)}
                        </span>
                      </span>
                      <Money value={i.amount} className="text-base font-medium text-success" />
                    </button>
                    <Menu label={`Actions for ${i.name}`} items={menu(i)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {q.data && q.data.totalPages > 1 && (
            <PanelFooter>
              <Pagination page={page} size={SIZE} total={q.data.totalElements} onPageChange={setPage} noun="entries" />
            </PanelFooter>
          )}
        </>
      )}
    </Panel>
  );
}
