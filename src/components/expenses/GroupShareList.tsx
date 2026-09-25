"use client";

import Link from "next/link";
import type { GroupShareItem } from "@/types";
import { formatDate } from "@/utils/format";
import { CategoryLabel } from "../common/CategoryLabel";
import { Money } from "../ui/Money";
import { LoadingRegion, SkeletonList, SkeletonTableRows } from "../ui/Skeleton";
import { TD, TH, THead, TR, Table } from "../ui/Table";

/** My share of group expenses, shown alongside personal spending. */
export function GroupShareList({ items, loading, empty }: { items: GroupShareItem[] | undefined; loading: boolean; empty: React.ReactNode }) {
  const rows = items ?? [];
  const showEmpty = !loading && rows.length === 0;
  return (
    <>
      <div className="hidden md:block">
        <Table label="Group shares">
          <THead>
            <tr>
              <TH className="w-28">Date</TH>
              <TH>Description</TH>
              <TH className="w-44">Group</TH>
              <TH className="hidden w-44 lg:table-cell">Category</TH>
              <TH align="right" className="w-32">
                Bill
              </TH>
              <TH align="right" className="w-32">
                Your share
              </TH>
            </tr>
          </THead>
          <tbody>
            {loading ? (
              <SkeletonTableRows
                columns={[
                  { width: "70%" },
                  { width: "55%", subline: true },
                  { width: "60%" },
                  { width: "55%", className: "hidden lg:table-cell" },
                  { width: "60%", align: "right" },
                  { width: "60%", align: "right" },
                ]}
              />
            ) : showEmpty ? (
              <tr>
                <td colSpan={6}>{empty}</td>
              </tr>
            ) : (
              rows.map((s) => (
                <TR key={s.groupExpenseId}>
                  <TD className="tabular whitespace-nowrap text-fg-2">{formatDate(s.date)}</TD>
                  <TD className="max-w-0">
                    <p className="truncate text-fg">{s.name}</p>
                    <p className="truncate text-sm text-fg-3">{s.paidByMe ? "You paid" : `${s.paidBy} paid`}</p>
                  </TD>
                  <TD className="max-w-0">
                    <Link href={`/groups/${s.groupId}`} className="block truncate text-fg-2 hover:text-fg hover:underline hover:underline-offset-4">
                      {s.groupName}
                    </Link>
                  </TD>
                  <TD className="hidden max-w-0 text-fg-2 lg:table-cell">
                    <CategoryLabel name={s.category} color={s.color} />
                  </TD>
                  <TD align="right" className="text-fg-3">
                    <Money value={s.totalAmount} />
                  </TD>
                  <TD align="right" className="font-medium">
                    <Money value={s.myShare} />
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>
      <div className="md:hidden">
        {loading ? (
          <LoadingRegion label="Loading group shares">
            <SkeletonList rows={6} />
          </LoadingRegion>
        ) : showEmpty ? (
          empty
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((s) => (
              <li key={s.groupExpenseId}>
                <Link href={`/groups/${s.groupId}`} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-fg">{s.name}</span>
                    <span className="block truncate text-sm text-fg-3">
                      {s.groupName} · {formatDate(s.date)}
                    </span>
                  </span>
                  <span className="text-right">
                    <Money value={s.myShare} className="block text-base font-medium" />
                    <span className="text-xs text-fg-3">of <Money value={s.totalAmount} /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
