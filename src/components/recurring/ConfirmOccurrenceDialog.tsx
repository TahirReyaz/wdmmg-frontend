"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useResolveOccurrence } from "@/hooks/useRecurring";
import type { Occurrence } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol } from "@/utils/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

/** Confirm a due item with a different amount or date (e.g. this month's electricity bill). */
export function ConfirmOccurrenceDialog({ occurrence, onClose }: { occurrence: Occurrence | null; onClose: () => void }) {
  const resolve = useResolveOccurrence();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!occurrence) return;
    setAmount(occurrence.amount.toFixed(2));
    setDate(occurrence.dueDate);
    setError(null);
  }, [occurrence]);

  const value = Number(amount);
  const invalid = !(value > 0) ? "Enter an amount greater than zero." : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!occurrence || invalid) return;
    try {
      await resolve.mutateAsync({ occurrenceId: occurrence.id, action: "confirm", amount: value, date });
      toast.success("Added to your expenses", { description: occurrence.name });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open={!!occurrence} onClose={onClose} title={occurrence ? `Add “${occurrence.name}”` : ""} description="Adjust this instance before adding it. The recurring schedule isn't changed." size="sm" dismissible={!resolve.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={invalid}>
            <AmountInput prefix={currencySymbol} value={amount} onChange={(e) => setAmount(e.target.value)} data-autofocus />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={resolve.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={resolve.isPending} loadingText="Adding…">
            Add expense
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
