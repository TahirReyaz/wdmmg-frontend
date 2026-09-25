"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useSettle } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import type { UserSummary } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol, formatMoney } from "@/utils/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input, Select } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

export interface SettleDraft {
  /** Member the signed-in user paid. */
  to: number;
  amount?: number;
}

/** Records a payment the signed-in user made to another member. */
export function SettleDialog({
  open,
  onClose,
  groupId,
  members,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  groupId: number;
  members: UserSummary[];
  draft: SettleDraft | null;
}) {
  const { user } = useAuth();
  const settle = useSettle(groupId);
  const toast = useToast();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !draft) return;
    setTo(String(draft.to));
    setAmount(draft.amount ? draft.amount.toFixed(2) : "");
    setDate(todayISO());
    setNote("");
    setSubmitted(false);
    setError(null);
  }, [open, draft]);

  const recipients = members.filter((m) => m.id !== user?.id);
  const recipientName = recipients.find((m) => String(m.id) === to)?.name ?? "";
  const value = Number(amount);
  const errors = {
    to: !to ? "Choose who you paid." : undefined,
    amount: !(value > 0) ? "Enter an amount greater than zero." : undefined,
  };
  const valid = !errors.to && !errors.amount;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || settle.isPending) return;
    setError(null);
    try {
      await settle.mutateAsync({ toUserId: Number(to), amount: value, date, note: note.trim() || undefined });
      toast.success("Payment recorded", { description: `You paid ${recipientName} ${formatMoney(value)}` });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record a payment" description="Log money you paid back to someone in this group. They’ll be notified and balances update right away." size="sm" dismissible={!settle.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="You paid" error={submitted ? errors.to : undefined}>
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="" disabled>
              Select a member
            </option>
            {recipients.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={submitted ? errors.amount : undefined}>
            <AmountInput prefix={currencySymbol} value={amount} onChange={(e) => setAmount(e.target.value)} data-autofocus />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" optional>
          <Input value={note} maxLength={255} placeholder="e.g. UPI transfer" onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={settle.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={settle.isPending} loadingText="Recording…">
            Record payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
