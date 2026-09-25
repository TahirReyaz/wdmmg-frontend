"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useAddMember, useRemoveMember } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import type { GroupDetail } from "@/types";
import { Avatar } from "../common/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialog";
import { Field, Input } from "../ui/Field";
import { Money } from "../ui/Money";
import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { useToast } from "../ui/Toast";

export function GroupMembers({ group, onLeft }: { group: GroupDetail; onLeft: () => void }) {
  const { user } = useAuth();
  const add = useAddMember(group.id);
  const remove = useRemoveMember(group.id);
  const confirm = useConfirm();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const isOwner = group.createdBy.id === user?.id;
  const current = group.members.filter((m) => m.member);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    try {
      const updated = await add.mutateAsync(value);
      const added = updated.members.find((m) => m.user.email.toLowerCase() === value.toLowerCase());
      setEmail("");
      toast.success("Member added", { description: added?.user.name ?? value });
    } catch (err) {
      setEmailError(errorMessage(err));
    }
  }

  async function removeMember(userId: number, userName: string, net: number) {
    const self = userId === user?.id;
    if (Math.abs(net) > 0.004) {
      toast.error(self ? "Settle up before leaving" : `${userName} isn't settled up`, {
        description: "Members can only leave once their balance is zero.",
      });
      return;
    }
    await confirm({
      title: self ? "Leave this group?" : `Remove ${userName}?`,
      description: self
        ? "You'll lose access to this group's expenses. Past expenses you were part of stay in the record."
        : `${userName} will no longer see this group. Their past expenses stay in the record.`,
      confirmLabel: self ? "Leave group" : "Remove",
      pendingLabel: self ? "Leaving…" : "Removing…",
      tone: "danger",
      action: async () => {
        await remove.mutateAsync(userId);
        if (self) onLeft();
        else toast.success(`${userName} removed`);
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Panel className="lg:col-span-3">
        <PanelHeader title="Members" description={`${current.length} ${current.length === 1 ? "person" : "people"}`} />
        <ul className="divide-y divide-line">
          {current.map((m) => {
            const self = m.user.id === user?.id;
            const owner = m.user.id === group.createdBy.id;
            const canRemove = !owner && (isOwner || self);
            return (
              <li key={m.user.id} className="flex min-h-[60px] items-center gap-3 px-5 py-2.5">
                <Avatar name={m.user.name} src={m.user.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-base text-fg">
                    <span className="truncate">{self ? `${m.user.name} (you)` : m.user.name}</span>
                    {owner && <Badge>Owner</Badge>}
                  </span>
                  <span className="block truncate text-sm text-fg-3">{m.user.email}</span>
                </span>
                <Money value={m.net} signed className="hidden text-base sm:inline" />
                {canRemove && (
                  <Button size="sm" variant="ghost" onClick={() => removeMember(m.user.id, m.user.name, m.net)}>
                    {self ? "Leave" : "Remove"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel className="lg:col-span-2 lg:self-start">
        <PanelHeader title="Add a member" />
        <PanelBody>
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <Field label="Email address" error={emailError} hint="They need to have an account already.">
              <Input
                type="email"
                autoComplete="off"
                value={email}
                placeholder="name@example.com"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
              />
            </Field>
            <div>
              <Button type="submit" variant="primary" loading={add.isPending} loadingText="Adding…">
                Add member
              </Button>
            </div>
          </form>
        </PanelBody>
      </Panel>
    </div>
  );
}
