"use client";

import type { Expense } from "@/types";
import { formatDate, paymentMethodLabel } from "@/utils/format";
import { cx } from "@/utils/cx";
import { CategoryLabel } from "../common/CategoryLabel";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { LoadingRegion, SkeletonList, SkeletonTableRows, type SkeletonColumn } from "../ui/Skeleton";
import { TD, TH, THead, TR, Table } from "../ui/Table";

const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "70%" },
  { width: "55%", subline: true },
  { width: "60%" },
  { width: "50%", className: "hidden lg:table-cell" },
  { width: "60%", align: "right" },
  { width: "0%" },
];

interface Props {
  expenses: Expense[] | undefined;
  /** Initial load or new filter results pending → skeleton rows. */
  loading: boolean;
  pendingIds: Set<number>;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  skeletonRows?: number;
  /** Rendered in place of rows when there's nothing to show. */
  empty: React.ReactNode;
}

/** Personal expenses: a table on wide screens, a compact list on phones. */
export function ExpenseList({ expenses, loading, pendingIds, onEdit, onDelete, skeletonRows = 8, empty }: Props) {
  const rows = expenses ?? [];
  const showEmpty = !loading && rows.length === 0;

  const actions = (e: Expense) => [
    { label: "Edit", onSelect: () => onEdit(e) },
    { label: "Delete", onSelect: () => onDelete(e), tone: "danger" as const, separated: true },
  ];

  return (
    <>
      {/* ≥ md: table */}
      <div className="hidden md:block">
        <Table label="Expenses">
          <THead>
            <tr>
              <TH className="w-28">Date</TH>
              <TH>Description</TH>
              <TH className="w-52">Category</TH>
              <TH className="hidden w-32 lg:table-cell">Paid with</TH>
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
              <SkeletonTableRows columns={SKELETON_COLUMNS} rows={skeletonRows} />
            ) : showEmpty ? (
              <tr>
                <td colSpan={6}>{empty}</td>
              </tr>
            ) : (
              rows.map((e) => {
                const pending = pendingIds.has(e.id);
                return (
                  <TR key={e.id} pending={pending}>
                    <TD className="tabular whitespace-nowrap text-fg-2">{formatDate(e.date)}</TD>
                    <TD className="max-w-0">
                      <button
                        type="button"
                        onClick={() => onEdit(e)}
                        className="block max-w-full cursor-pointer truncate text-left text-fg hover:underline hover:decoration-line-strong hover:underline-offset-4"
                      >
                        {e.name}
                      </button>
                      {e.notes && <p className="truncate text-sm text-fg-3">{e.notes}</p>}
                    </TD>
                    <TD className="max-w-0 text-fg-2">
                      <CategoryLabel name={e.category.name} color={e.category.color} retired={!e.category.active} />
                    </TD>
                    <TD className="hidden text-fg-2 lg:table-cell">{paymentMethodLabel(e.paymentMethod)}</TD>
                    <TD align="right" className={cx("font-medium", pending && "text-fg-3")}>
                      {pending && <span className="sr-only">Saving… </span>}
                      <Money value={e.amount} />
                    </TD>
                    <TD className="pr-2 text-right">
                      <Menu items={actions(e)} label={`Actions for ${e.name}`} />
                    </TD>
                  </TR>
                );
              })
            )}
          </tbody>
        </Table>
        {loading && <span className="sr-only" role="status">Loading expenses</span>}
      </div>

      {/* < md: list */}
      <div className="md:hidden">
        {loading ? (
          <LoadingRegion label="Loading expenses">
            <SkeletonList rows={Math.min(skeletonRows, 8)} />
          </LoadingRegion>
        ) : showEmpty ? (
          empty
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id} className={cx("flex items-center gap-2 pr-2 pl-4 transition-opacity", pendingIds.has(e.id) && "opacity-60")}>
                <button type="button" onClick={() => onEdit(e)} className="flex min-h-[60px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-fg">{e.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-3">
                      <span className="size-1.5 shrink-0" style={{ background: e.category.color }} aria-hidden />
                      <span className="truncate">
                        {e.category.name} · {formatDate(e.date)}
                      </span>
                    </span>
                  </span>
                  <Money value={e.amount} className="text-base font-medium" />
                </button>
                <Menu items={actions(e)} label={`Actions for ${e.name}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
