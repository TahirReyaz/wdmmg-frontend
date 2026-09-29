"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useSaveGoal } from "@/hooks/useGoals";
import type { Goal } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol, formatMoney } from "@/utils/format";
import { amountError } from "@/utils/validate";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

function monthsUntil(date: string) {
  const [y, m] = date.split("-").map(Number);
  const now = new Date();
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}

/** Create or edit a savings goal. Money is set aside separately, from the goal card. */
export function GoalDialog({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal }) {
  const save = useSaveGoal();
  const toast = useToast();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setTarget(goal ? goal.targetAmount.toFixed(2) : "");
    setDate(goal?.targetDate ?? "");
    setSubmitted(false);
    setError(null);
  }, [open, goal]);

  const errors = {
    name: !name.trim() ? "Name the goal, e.g. Emergency fund or New laptop." : undefined,
    target: amountError(target),
    date: date && date <= todayISO() ? "Pick a date in the future, or leave it empty." : undefined,
  };

  const saved = goal?.savedAmount ?? 0;
  const targetNum = Number(target);
  const plan =
    !errors.target && !errors.date && date && targetNum > saved
      ? `About ${formatMoney(Math.ceil(((targetNum - saved) / monthsUntil(date)) * 100) / 100)} a month to get there on time.`
      : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errors.name || errors.target || errors.date || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({ id: goal?.id, input: { name: name.trim(), targetAmount: targetNum, targetDate: date || null } });
      toast.success(goal ? "Goal updated" : "Goal created", { description: goal ? undefined : "Set money aside for it whenever you're ready." });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the goal."));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={goal ? "Edit goal" : "New savings goal"}
      description={goal ? undefined : "Money you set aside for a goal stays in your bank balance but is no longer counted as available to spend."}
      size="sm"
      dismissible={!save.isPending}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Goal" error={submitted ? errors.name : undefined}>
          <Input value={name} maxLength={100} placeholder="e.g. Trip to Goa" onChange={(e) => setName(e.target.value)} data-autofocus />
        </Field>
        <Field label="Target amount" error={submitted ? errors.target : undefined}>
          <AmountInput prefix={currencySymbol} value={target} placeholder="0.00" onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Target date" optional error={submitted ? errors.date : undefined} hint={plan ?? "When you'd like to have the full amount."}>
          <Input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="sticky -bottom-5 z-10 -mx-5 mt-1 -mb-5 flex gap-2 border-t border-line bg-raised px-5 pt-3 pb-5 *:flex-1 sm:justify-end sm:pt-4 sm:*:flex-none">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…">
            {goal ? "Save changes" : "Create goal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
