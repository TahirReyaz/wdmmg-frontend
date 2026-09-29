"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { useActiveCategories } from "@/hooks/useCategories";
import { useSaveRecurring } from "@/hooks/useRecurring";
import type { Frequency, PaymentMethod, RecurringExpense } from "@/types";
import { todayISO } from "@/utils/dates";
import { PAYMENT_METHODS, currencySymbol, formatDate } from "@/utils/format";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Checkbox, Field, Input, Select, Textarea } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

const FREQUENCIES: { value: Frequency; label: string; unit: [string, string] }[] = [
  { value: "DAILY", label: "Daily", unit: ["day", "days"] },
  { value: "WEEKLY", label: "Weekly", unit: ["week", "weeks"] },
  { value: "MONTHLY", label: "Monthly", unit: ["month", "months"] },
  { value: "YEARLY", label: "Yearly", unit: ["year", "years"] },
];

type Values = {
  name: string;
  amount: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  frequency: Frequency;
  every: string;
  startDate: string;
  hasEnd: boolean;
  endDate: string;
  notes: string;
};

function initial(item?: RecurringExpense): Values {
  return {
    name: item?.name ?? "",
    amount: item ? item.amount.toFixed(2) : "",
    categoryId: item ? String(item.category.id) : "",
    paymentMethod: item?.paymentMethod ?? "UPI",
    frequency: item?.frequency ?? "MONTHLY",
    every: String(item?.intervalCount ?? 1),
    startDate: item?.startDate ?? todayISO(),
    hasEnd: !!item?.endDate,
    endDate: item?.endDate ?? "",
    notes: item?.notes ?? "",
  };
}

function validate(v: Values) {
  const amount = Number(v.amount);
  const every = Number(v.every);
  return {
    name: !v.name.trim() ? "Give it a name, e.g. Netflix or Rent." : undefined,
    amount: !(amount > 0) ? "Enter an amount greater than zero." : !/^\d+(\.\d{1,2})?$/.test(v.amount) ? "Use at most two decimal places." : undefined,
    categoryId: !v.categoryId ? "Choose a category." : undefined,
    every: !Number.isInteger(every) || every < 1 || every > 365 ? "Use a whole number from 1 to 365." : undefined,
    startDate: !v.startDate ? "Pick a start date." : undefined,
    endDate: v.hasEnd && !v.endDate ? "Pick an end date." : v.hasEnd && v.endDate < v.startDate ? "End date must be after the start." : undefined,
  };
}

/** Human summary of when reminders will arrive. */
function preview(v: Values): string {
  const f = FREQUENCIES.find((x) => x.value === v.frequency)!;
  const every = Math.max(1, Number(v.every) || 1);
  const cadence = every === 1 ? `every ${f.unit[0]}` : `every ${every} ${f.unit[1]}`;
  if (!v.startDate) return "";
  const start = v.startDate < todayISO() ? "Starts from the next date on schedule" : v.startDate === todayISO() ? "First reminder today" : `First reminder on ${formatDate(v.startDate, "long")}`;
  const end = v.hasEnd && v.endDate ? `, until ${formatDate(v.endDate, "long")}` : "";
  return `${start}, then ${cadence}${end}. Each time, you'll get a notification to confirm before it's added.`;
}

export function RecurringDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item?: RecurringExpense }) {
  const categories = useActiveCategories();
  const save = useSaveRecurring();
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

  const errors = validate(v);
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);
  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((prev) => ({ ...prev, [k]: value }));
  const unit = FREQUENCIES.find((f) => f.value === v.frequency)!.unit;
  const options = categories.data ?? [];
  const withCurrent = item && !options.some((c) => c.id === item.category.id) ? [...options, item.category] : options;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({
        id: item?.id,
        input: {
          name: v.name.trim(),
          amount: Number(v.amount),
          categoryId: Number(v.categoryId),
          paymentMethod: v.paymentMethod,
          notes: v.notes.trim() || undefined,
          frequency: v.frequency,
          intervalCount: Number(v.every),
          startDate: v.startDate,
          endDate: v.hasEnd ? v.endDate : null,
        },
      });
      toast.success(item ? "Recurring expense updated" : "Recurring expense added", { description: v.name.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? errorMessage(err) : "Couldn't save.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={item ? "Edit recurring expense" : "New recurring expense"} size="lg" dismissible={!save.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Name" error={show("name")}>
            <Input value={v.name} maxLength={150} placeholder="e.g. Rent, Netflix, Gym" onChange={(e) => set("name", e.target.value)} data-autofocus />
          </Field>
          <Field label="Amount" error={show("amount")}>
            <AmountInput prefix={currencySymbol} value={v.amount} placeholder="0.00" onChange={(e) => set("amount", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" error={show("categoryId")}>
            <Select value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} disabled={categories.isPending}>
              <option value="" disabled>
                {categories.isPending ? "Loading…" : "Select a category"}
              </option>
              {withCurrent.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Paid with">
            <Select value={v.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="min-w-0 border-t border-line pt-4">
          <legend className="sr-only">Schedule</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Repeats">
              <Select value={v.frequency} onChange={(e) => set("frequency", e.target.value as Frequency)}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Every" error={show("every")}>
              <div className="relative">
                <Input type="number" inputMode="numeric" min={1} max={365} step={1} value={v.every} onChange={(e) => set("every", e.target.value)} className="tabular pr-16" />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-fg-3">{Number(v.every) === 1 ? unit[0] : unit[1]}</span>
              </div>
            </Field>
            <Field label="Starts on" error={show("startDate")}>
              <Input type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Checkbox checked={v.hasEnd} onChange={(on) => set("hasEnd", on)} label="Ends on a date" />
            {v.hasEnd && (
              <Field label="End date" error={show("endDate")} className="sm:ml-auto sm:w-52">
                <Input type="date" min={v.startDate} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </Field>
            )}
          </div>
          <p className="mt-3 text-sm text-fg-3" aria-live="polite">
            {preview(v)}
          </p>
        </fieldset>

        <Field label="Notes" optional>
          <Textarea rows={2} maxLength={1000} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <div className="sticky -bottom-5 z-10 -mx-5 mt-1 -mb-5 flex gap-2 border-t border-line bg-raised px-5 pt-3 pb-5 *:flex-1 sm:justify-end sm:pt-4 sm:*:flex-none">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…">
            {item ? "Save changes" : "Add recurring expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
