"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useSetOpeningBalance } from "@/hooks/useMoney";
import type { MoneySummary } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol, formatDate } from "@/utils/format";
import { signedAmountError } from "@/utils/validate";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

/**
 * The anchor for the running balance: what was in the account on a given day.
 * Everything from that day onward moves it.
 */
export function OpeningBalanceDialog({ open, onClose, summary }: { open: boolean; onClose: () => void; summary?: MoneySummary }) {
  const save = useSetOpeningBalance();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(summary?.configured ? summary.openingBalance.toFixed(2) : "");
    setDate(summary?.openingDate ?? todayISO());
    setSubmitted(false);
    setError(null);
  }, [open, summary]);

  const errors = { amount: signedAmountError(amount), date: !date ? "Pick a date." : date > todayISO() ? "Use today or an earlier date." : undefined };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errors.amount || errors.date || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({ amount: Number(amount), date });
      toast.success("Starting balance saved");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the balance."));
    }
  }

  const isToday = date === todayISO();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={summary?.configured ? "Change starting balance" : "Set your starting balance"}
      description="Enter what was in your account at the start of that day. Income, expenses, group bills you paid and settlements from then on move it."
      size="sm"
      dismissible={!save.isPending}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Balance" error={submitted ? errors.amount : undefined} hint="Use a minus sign if the account is overdrawn.">
          <AmountInput prefix={currencySymbol} value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} data-autofocus />
        </Field>
        <Field
          label="As of"
          error={submitted ? errors.date : undefined}
          hint={date && !isToday ? `Anything dated ${formatDate(date, "long")} or later is counted.` : "Anything dated today or later is counted, including what you've already added today."}
        >
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…">
            Save balance
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
