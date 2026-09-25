"use client";

import Link from "next/link";
import type { Expense, GroupShareItem } from "@/types";
import { formatRelativeDay } from "@/utils/format";
import { CategoryLabel } from "../common/CategoryLabel";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";
import { SkeletonList, SkeletonTableRows } from "../ui/Skeleton";
import { TD, TH, THead, TR, Table } from "../ui/Table";

interface Row {
  key: string;
  date: string;
  name: string;
  category: string;
  color: string;
  source: { label: string; href?: string };
  amount: number;
  onOpen?: () => void;
}

export function mergeActivity(personal: Expense[], shares: GroupShareItem[], onEdit: (e: Expense) => void, limit = 8): Row[] {
  const rows: Row[] = [
    ...personal.map((e) => ({
      key: `p-${e.id}`,
      date: e.date,
      name: e.name,
      category: e.category.name,
      color: e.category.color,
      source: { label: "Personal" },
      amount: e.amount,
      onOpen: () => onEdit(e),
    })),
    ...shares.map((s) => ({
      key: `g-${s.groupExpenseId}`,
      date: s.date,
      name: s.name,
      category: s.category,
      color: s.color,
      source: { label: s.groupName, href: `/groups/${s.groupId}` },
      amount: s.myShare,
    })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Personal expenses and group shares in one chronological feed. */
export function ActivityTable({ rows, loading }: { rows: Row[]; loading: boolean }) {
  return (
    <>
      <div className="hidden md:block">
        <Table label="Recent activity">
          <THead>
            <tr>
              <TH className="w-28">Date</TH>
              <TH>Description</TH>
              <TH className="w-44">Category</TH>
              <TH className="w-40">Source</TH>
              <TH align="right" className="w-32">
                Amount
              </TH>
            </tr>
          </THead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={6} columns={[{ width: "60%" }, { width: "55%" }, { width: "60%" }, { width: "50%" }, { width: "60%", align: "right" }]} />
            ) : (
              rows.map((r) => (
                <TR key={r.key}>
                  <TD className="whitespace-nowrap text-fg-2">{formatRelativeDay(r.date)}</TD>
                  <TD className="max-w-0">
                    {r.onOpen ? (
                      <button type="button" onClick={r.onOpen} className="block max-w-full cursor-pointer truncate text-left hover:underline hover:decoration-line-strong hover:underline-offset-4">
                        {r.name}
                      </button>
                    ) : (
                      <span className="block truncate">{r.name}</span>
                    )}
                  </TD>
                  <TD className="max-w-0 text-fg-2">
                    <CategoryLabel name={r.category} color={r.color} />
                  </TD>
                  <TD className="max-w-0">
                    {r.source.href ? (
                      <Link href={r.source.href} className="block truncate text-fg-2 hover:text-fg hover:underline hover:underline-offset-4">
                        {r.source.label}
                      </Link>
                    ) : (
                      <Badge>Personal</Badge>
                    )}
                  </TD>
                  <TD align="right" className="font-medium">
                    <Money value={r.amount} />
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>
      <div className="md:hidden">
        {loading ? (
          <SkeletonList rows={6} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.key} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-fg">{r.name}</span>
                  <span className="block truncate text-sm text-fg-3">
                    {formatRelativeDay(r.date)} · {r.source.label}
                  </span>
                </span>
                <Money value={r.amount} className="text-base font-medium" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
