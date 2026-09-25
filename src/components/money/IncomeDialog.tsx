"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useSaveIncome } from "@/hooks/useMoney";
import type { Income, IncomeType } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol } from "@/utils/format";
import { amountError } from "@/utils/validate";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input, Select, Textarea } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";
import { INCOME_TYPES } from "./incomeTypes";

type Values = { name: string; amount: string; date: string; type: IncomeType; notes: string };

const initial = (item?: Income): Values => ({
  name: item?.name ?? "",
  amount: item ? item.amount.toFixed(2) : "",
  date: item?.date ?? todayISO(),
  type: item?.type ?? "SALARY",
  notes: item?.notes ?? "",
});

/** Record money that came into the bank account. */
export function IncomeDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item?: Income }) {
  const save = useSaveIncome();
  const toast = useToast();
  const [v, setV] = useState<Values>(initial(item));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setV(initial(item));
    setSubmitted(false);
    setError(null);
  }, [open, item]);

  const errors = {
    name: !v.name.trim() ? "Say where it came from, e.g. Salary or Tax refund." : undefined,
    amount: amountError(v.amount),
    date: !v.date ? "Pick the date it arrived." : undefined,
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);
  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((p) => ({ ...p, [k]: value }));

  function pickType(type: IncomeType) {
    // Keep the name in step with the type until the user writes their own.
    const auto = INCOME_TYPES.some((t) => t.label === v.name) || !v.name.trim();
    setV((p) => ({ ...p, type, name: auto ? INCOME_TYPES.find((t) => t.value === type)!.label : p.name }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({
        id: item?.id,
        input: { name: v.name.trim(), amount: Number(v.amount), date: v.date, type: v.type, notes: v.notes.trim() || undefined },
      });
      toast.success(item ? "Income updated" : "Income added", { description: `${v.name.trim()} is included in your balance.` });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the income."));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? "Edit income" : "Add money received"}
      description={item ? undefined : "Salary, refunds, transfers in – anything that raised your bank balance."}
      dismissible={!save.isPending}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_170px]">
          <Field label="Type">
            <Select value={v.type} onChange={(e) => pickType(e.target.value as IncomeType)}>
              {INCOME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount" error={show("amount")}>
            <AmountInput prefix={currencySymbol} value={v.amount} placeholder="0.00" onChange={(e) => set("amount", e.target.value)} data-autofocus />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_170px]">
          <Field label="Description" error={show("name")}>
            <Input value={v.name} maxLength={150} placeholder="e.g. Salary – September" onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Received on" error={show("date")}>
            <Input type="date" value={v.date} max={todayISO()} onChange={(e) => set("date", e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" optional>
          <Textarea rows={2} maxLength={1000} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…">
            {item ? "Save changes" : "Add income"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
