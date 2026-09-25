"use client";

import { useAuth } from "@/providers/AuthProvider";
import type { GroupDetail } from "@/types";
import { Avatar } from "../common/Avatar";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";
import { Panel, PanelHeader } from "../ui/Panel";
import { EmptyState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import type { SettleDraft } from "./SettleDialog";

export function GroupBalances({ group, onSettle }: { group: GroupDetail; onSettle: (draft: SettleDraft) => void }) {
  const { user } = useAuth();
  const name = (u: { id: number; name: string }) => (u.id === user?.id ? "You" : u.name);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Panel className="lg:col-span-2">
        <PanelHeader title="Suggested payments" description="The fewest transfers that settle everyone. Whoever pays records it." />
        {group.simplifiedDebts.length === 0 ? (
          <EmptyState compact title="Everyone is settled up" description="New expenses will show who owes whom here." />
        ) : (
          <ul className="divide-y divide-line">
            {group.simplifiedDebts.map((d, i) => (
              <li key={i} className="flex min-h-[60px] items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1 text-base">
                  <span className="font-medium text-fg">{name(d.from)}</span>
                  <span className="text-fg-3"> {d.from.id === user?.id ? "pay" : "pays"} </span>
                  <span className="font-medium text-fg">{name(d.to)}</span>
                  <Money value={d.amount} className="block text-base text-fg-2" />
                </span>
                {d.from.id === user?.id ? (
                  <Button size="sm" onClick={() => onSettle({ to: d.to.id, amount: d.amount })}>
                    Settle
                  </Button>
                ) : d.to.id === user?.id ? (
                  <span className="text-sm text-fg-3">They record it</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="lg:col-span-3">
        <PanelHeader title="Member balances" description="Paid minus share, including recorded payments" />
        <Table label="Member balances">
          <THead>
            <tr>
              <TH>Member</TH>
              <TH align="right">Paid</TH>
              <TH align="right" className="hidden sm:table-cell">
                Share
              </TH>
              <TH align="right">Balance</TH>
            </tr>
          </THead>
          <tbody>
            {group.members.map((m) => (
              <TR key={m.user.id}>
                <TD>
                  <span className="inline-flex items-center gap-2.5">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size="sm" />
                    <span className="text-fg">{name(m.user)}</span>
                  </span>
                  {!m.member && (
                    <Badge className="ml-2" tone="neutral">
                      Left
                    </Badge>
                  )}
                </TD>
                <TD align="right" className="text-fg-2">
                  <Money value={m.paid} />
                </TD>
                <TD align="right" className="hidden text-fg-2 sm:table-cell">
                  <Money value={m.share} />
                </TD>
                <TD align="right">
                  <Money value={m.net} signed className="font-medium" />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        <p className="border-t border-line px-5 py-3 text-sm text-fg-3">+ means the group owes them; − means they owe the group.</p>
      </Panel>
    </div>
  );
}
