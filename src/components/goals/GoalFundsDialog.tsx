"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { FundsDirection } from "@/api/goals";
import { errorMessage } from "@/api/client";
import { useMoveFunds } from "@/hooks/useGoals";
import type { Goal } from "@/types";
import { currencySymbol, formatMoney } from "@/utils/format";
import { amountError } from "@/utils/validate";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input } from "../ui/Field";
import { SegmentedControl } from "../ui/SegmentedControl";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

/**
 * Move money between "available" and a goal. Adding more than is available is
 * allowed (the figure just goes negative) but called out before saving.
 */
export function GoalFundsDialog({
  goal,
  direction: initialDirection,
  available,
  onClose,
}: {
  goal: Goal | null;
  direction: FundsDirection;
  available: number | undefined;
  onClose: () => void;
}) {
  const move = useMoveFunds();
  const toast = useToast();
  const [direction, setDirection] = useState<FundsDirection>(initialDirection);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = goal != null;

  useEffect(() => {
    if (!open) return;
    setDirection(initialDirection);
    setAmount("");
    setNote("");
    setSubmitted(false);
    setError(null);
  }, [open, initialDirection, goal?.id]);

  if (!goal) return <Dialog open={false} onClose={onClose} title="" />;

  const adding = direction === "ADD";
  const amountErr = amountError(amount, adding ? {} : { max: goal.savedAmount });
  const value = Number(amount) || 0;
  const availableAfter = available == null ? null : adding ? available - value : available + value;
  const overdraw = adding && availableAfter != null && availableAfter < 0 && !amountErr;

  const quick = adding
    ? goal.remaining > 0 && { label: `Fill the rest · ${formatMoney(goal.remaining)}`, value: goal.remaining }
    : goal.savedAmount > 0 && { label: `Take all · ${formatMoney(goal.savedAmount)}`, value: goal.savedAmount };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (amountErr || move.isPending || !goal) return;
    setError(null);
    try {
      await move.mutateAsync({ goal, direction, amount: value, note: note.trim() || undefined });
      toast.success(adding ? `Set aside for ${goal.name}` : `Moved back from ${goal.name}`, {
        description: `${formatMoney(value)} ${adding ? "is no longer counted as available." : "is available to spend again."}`,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't move the money."));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={goal.name}
      description={`${formatMoney(goal.savedAmount)} of ${formatMoney(goal.targetAmount)} set aside`}
      size="sm"
      dismissible={!move.isPending}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <SegmentedControl
          label="Direction"
          value={direction}
          onChange={(d) => {
            setDirection(d);
            setSubmitted(false);
          }}
          options={[
            { value: "ADD", label: "Set aside" },
            { value: "WITHDRAW", label: "Take back" },
          ]}
          className="self-start"
        />
        <Field
          label={adding ? "Amount to set aside" : "Amount to take back"}
          error={submitted ? amountErr : undefined}
          hint={
            quick ? (
              <button type="button" onClick={() => setAmount(quick.value.toFixed(2))} className="cursor-pointer font-medium text-accent-text hover:underline hover:underline-offset-4">
                {quick.label}
              </button>
            ) : undefined
          }
        >
          <AmountInput prefix={currencySymbol} value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} data-autofocus />
        </Field>
        <Field label="Note" optional>
          <Input value={note} maxLength={255} placeholder={adding ? "e.g. September savings" : "e.g. Paid the deposit"} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {availableAfter != null && (
          <dl className="grid grid-cols-2 border border-line bg-sunken text-sm">
            <div className="px-3 py-2.5">
              <dt className="text-fg-3">Available now</dt>
              <dd className="tabular mt-0.5 font-medium text-fg">{formatMoney(available)}</dd>
            </div>
            <div className="border-l border-line px-3 py-2.5">
              <dt className="text-fg-3">After this</dt>
              <dd className={`tabular mt-0.5 font-medium ${availableAfter < 0 ? "text-danger" : "text-fg"}`}>{formatMoney(availableAfter)}</dd>
            </div>
          </dl>
        )}
        {overdraw && (
          <p role="status" className="border-l-2 border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            This is more than you have available. Your goals would hold more than your bank balance.
          </p>
        )}

        <div className="sticky -bottom-5 z-10 -mx-5 mt-1 -mb-5 flex gap-2 border-t border-line bg-raised px-5 pt-3 pb-5 *:flex-1 sm:justify-end sm:pt-4 sm:*:flex-none">
          <Button onClick={onClose} disabled={move.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={move.isPending} loadingText="Saving…">
            {adding ? "Set aside" : "Take back"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
