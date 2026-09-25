"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMoneyActivity } from "@/hooks/useMoney";
import type { ActivityKind, MoneyActivity } from "@/types";
import { toISODate } from "@/utils/dates";
import { formatDate, formatRelativeDay } from "@/utils/format";
import { IconButton } from "../ui/Button";
import { Money } from "../ui/Money";
import { Panel, PanelHeader } from "../ui/Panel";
import { LoadingRegion, SkeletonList, SkeletonTableRows } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import { monthName } from "./incomeTypes";

const KIND_LABEL: Record<ActivityKind, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  GROUP_BILL: "Group bill",
  PAYMENT_SENT: "Settlement",
  PAYMENT_RECEIVED: "Settlement",
};

const currentMonth = () => toISODate(new Date()).slice(0, 7);

function shift(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
}

function Title({ row }: { row: MoneyActivity }) {
  const cls = "block truncate text-fg";
  return row.link && row.kind !== "INCOME" ? (
    <Link href={row.link} className={`${cls} hover:underline hover:decoration-line-strong hover:underline-offset-4`}>
      {row.title}
    </Link>
  ) : (
    <span className={cls}>{row.title}</span>
  );
}

/** Every movement in and out of the account for one month, with the balance after each. */
export function MoneyLedger({ onAddIncome }: { onAddIncome: () => void }) {
  const [month, setMonth] = useState(currentMonth);
  const { from, to } = useMemo(() => bounds(month), [month]);
  const q = useMoneyActivity(from, to);
  const isCurrent = month >= currentMonth();
  const rows = q.data ?? [];
  const loading = q.isPending;
  const stale = q.isPlaceholderData;

  const nav = (
    <div className="flex items-center gap-1">
      <IconButton label="Previous month" size="sm" onClick={() => setMonth((m) => shift(m, -1))}>
        <ChevronLeft className="size-4" aria-hidden />
      </IconButton>
      <span className="min-w-28 text-center text-sm font-medium text-fg-2 tabular" aria-live="polite">
        {monthName(month)}
      </span>
      <IconButton label="Next month" size="sm" disabled={isCurrent} onClick={() => setMonth((m) => shift(m, 1))}>
        <ChevronRight className="size-4" aria-hidden />
      </IconButton>
    </div>
  );

  return (
    <Panel busy={q.isFetching && !loading}>
      <PanelHeader title="Account activity" description="Money in and out, with your balance after each" actions={nav} />
      {q.isError && !q.data ? (
        <ErrorState title="Couldn't load account activity" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
      ) : !loading && rows.length === 0 ? (
        <EmptyState
          title={`Nothing moved in ${monthName(month)}`}
          description="Income, expenses, group bills you paid and settlements show up here as they affect your balance."
          action={
            isCurrent ? (
              <button type="button" onClick={onAddIncome} className="cursor-pointer text-base font-medium text-accent-text hover:underline hover:underline-offset-4">
                Add money received
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className={stale ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="hidden md:block">
            <Table label={`Account activity, ${monthName(month)}`}>
              <THead>
                <tr>
                  <TH className="w-28">Date</TH>
                  <TH>Description</TH>
                  <TH className="w-32">Type</TH>
                  <TH align="right" className="w-36">
                    Amount
                  </TH>
                  <TH align="right" className="w-36">
                    Balance
                  </TH>
                </tr>
              </THead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows
                    rows={8}
                    columns={[{ width: "60%" }, { width: "55%", subline: true }, { width: "60%" }, { width: "60%", align: "right" }, { width: "60%", align: "right" }]}
                  />
                ) : (
                  rows.map((r) => (
                    <TR key={r.key}>
                      <TD className="tabular text-fg-2">{formatDate(r.date)}</TD>
                      <TD className="max-w-0">
                        <Title row={r} />
                        {r.detail && <span className="block truncate text-sm text-fg-3">{r.detail}</span>}
                      </TD>
                      <TD className="text-fg-2">{KIND_LABEL[r.kind]}</TD>
                      <TD align="right" className="font-medium">
                        <Money value={r.amount} signed />
                      </TD>
                      <TD align="right" className="text-fg-2">
                        <Money value={r.balanceAfter} className={r.balanceAfter < 0 ? "text-danger" : undefined} />
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          <div className="md:hidden">
            {loading ? (
              <LoadingRegion label="Loading account activity">
                <SkeletonList rows={6} />
              </LoadingRegion>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.key} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <Title row={r} />
                      <span className="block truncate text-sm text-fg-3">
                        {formatRelativeDay(r.date)} · {r.detail ?? KIND_LABEL[r.kind]}
                      </span>
                    </span>
                    <span className="text-right">
                      <Money value={r.amount} signed className="block text-base font-medium" />
                      <Money value={r.balanceAfter} muted className="block text-sm" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
