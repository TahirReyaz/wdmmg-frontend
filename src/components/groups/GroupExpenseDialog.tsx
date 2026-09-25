"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { useActiveCategories } from "@/hooks/useCategories";
import { useSaveGroupExpense } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import type { GroupExpense, SplitType, UserSummary } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol, formatMoney } from "@/utils/format";
import { previewSplit, splitProblem, type SplitRow } from "@/utils/split";
import { cx } from "@/utils/cx";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input, Select, Textarea } from "../ui/Field";
import { SegmentedControl } from "../ui/SegmentedControl";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

const SPLITS: { value: SplitType; label: string }[] = [
  { value: "EQUAL", label: "Equally" },
  { value: "EXACT", label: "Amounts" },
  { value: "PERCENT", label: "Percent" },
  { value: "SHARES", label: "Shares" },
];

function initialRows(members: UserSummary[], expense?: GroupExpense): SplitRow[] {
  return members.map((m) => {
    const share = expense?.shares.find((s) => s.user.id === m.id);
    let value = "1";
    if (expense?.splitType === "EXACT" && share) value = share.amount.toFixed(2);
    if (expense?.splitType === "PERCENT" && share) value = String(+((share.amount / expense.amount) * 100).toFixed(2));
    return { userId: m.id, included: expense ? !!share : true, value };
  });
}

export function GroupExpenseDialog({
  open,
  onClose,
  groupId,
  members,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  groupId: number;
  members: UserSummary[];
  expense?: GroupExpense;
}) {
  const { user } = useAuth();
  const categories = useActiveCategories();
  const save = useSaveGroupExpense(groupId);
  const toast = useToast();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState("");
  const [paidById, setPaidById] = useState("");
  const [notes, setNotes] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(expense?.name ?? "");
    setAmount(expense ? expense.amount.toFixed(2) : "");
    setDate(expense?.date ?? todayISO());
    setCategoryId(expense ? String(expense.category.id) : "");
    setPaidById(String(expense?.paidBy.id ?? user?.id ?? members[0]?.id ?? ""));
    setNotes(expense?.notes ?? "");
    setSplitType(expense?.splitType ?? "EQUAL");
    setRows(initialRows(members, expense));
    setSubmitted(false);
    setError(null);
    // Reset the form only when the dialog opens or targets a different expense.
  }, [open, expense?.id]);

  const total = Number(amount) || 0;
  const preview = useMemo(() => previewSplit(total, splitType, rows), [total, splitType, rows]);
  const problem = total > 0 ? splitProblem(total, splitType, rows) : null;
  const options = categories.data ?? [];
  const withCurrent = expense && !options.some((c) => c.id === expense.category.id) ? [...options, expense.category] : options;

  const errors = {
    name: !name.trim() ? "Add a short description." : undefined,
    amount: !(total > 0) ? "Enter an amount greater than zero." : undefined,
    date: !date ? "Pick a date." : undefined,
    categoryId: !categoryId ? "Choose a category." : undefined,
  };
  const valid = !Object.values(errors).some(Boolean) && !problem;

  function changeType(t: SplitType) {
    setSplitType(t);
    const n = Math.max(rows.filter((r) => r.included).length, 1);
    setRows((rs) =>
      rs.map((r) => {
        if (!r.included) return r;
        if (t === "PERCENT") return { ...r, value: String(+(100 / n).toFixed(2)) };
        if (t === "EXACT") return { ...r, value: total ? (total / n).toFixed(2) : "" };
        return { ...r, value: "1" };
      }),
    );
  }

  const updateRow = (id: number, patch: Partial<SplitRow>) => setRows((rs) => rs.map((r) => (r.userId === id ? { ...r, ...patch } : r)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({
        expenseId: expense?.id,
        input: {
          name: name.trim(),
          amount: total,
          date,
          categoryId: Number(categoryId),
          paidById: Number(paidById),
          splitType,
          notes: notes.trim() || undefined,
          shares: rows.filter((r) => r.included).map((r) => ({ userId: r.userId, value: splitType === "EQUAL" ? null : Number(r.value) || 0 })),
        },
      });
      toast.success(expense ? "Expense updated" : "Expense added", { description: name.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? errorMessage(err) : "Couldn't save.");
    }
  }

  const who = (m: UserSummary) => (m.id === user?.id ? "You" : m.name);

  return (
    <Dialog open={open} onClose={onClose} title={expense ? "Edit shared expense" : "Add shared expense"} size="lg" dismissible={!save.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Description" error={submitted ? errors.name : undefined}>
            <Input value={name} maxLength={150} placeholder="e.g. Hotel, dinner, cab" onChange={(e) => setName(e.target.value)} data-autofocus />
          </Field>
          <Field label="Amount" error={submitted ? errors.amount : undefined}>
            <AmountInput prefix={currencySymbol} value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date" error={submitted ? errors.date : undefined}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Category" error={submitted ? errors.categoryId : undefined}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={categories.isPending}>
              <option value="" disabled>
                {categories.isPending ? "Loading…" : "Select"}
              </option>
              {withCurrent.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Paid by">
            <Select value={paidById} onChange={(e) => setPaidById(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {who(m)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-medium text-fg-2">Split</legend>
            <SegmentedControl label="Split method" size="sm" options={SPLITS} value={splitType} onChange={changeType} />
          </div>
          <ul className="divide-y divide-line border border-line">
            {members.map((m) => {
              const row = rows.find((r) => r.userId === m.id);
              if (!row) return null;
              const share = preview.get(m.id);
              return (
                <li key={m.id} className={cx("flex h-12 items-center gap-3 px-3", !row.included && "bg-sunken/50")}>
                  <input
                    type="checkbox"
                    aria-label={`Include ${who(m)}`}
                    checked={row.included}
                    onChange={(e) => updateRow(m.id, { included: e.target.checked })}
                    className="size-4 cursor-pointer accent-[var(--accent)]"
                  />
                  <span className={cx("min-w-0 flex-1 truncate text-base", row.included ? "text-fg" : "text-fg-3")}>{who(m)}</span>
                  {splitType !== "EQUAL" && row.included && (
                    <div className="relative w-28">
                      <Input
                        inputSize="sm"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step={splitType === "SHARES" ? "1" : "0.01"}
                        aria-label={`${who(m)} – ${splitType === "PERCENT" ? "percent" : splitType === "SHARES" ? "shares" : "amount"}`}
                        className="tabular pr-7 text-right"
                        value={row.value}
                        onChange={(e) => updateRow(m.id, { value: e.target.value })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-fg-3">
                        {splitType === "PERCENT" ? "%" : splitType === "SHARES" ? "×" : currencySymbol}
                      </span>
                    </div>
                  )}
                  <span className="tabular w-24 text-right text-base text-fg-2">{row.included && share !== undefined ? formatMoney(share) : "—"}</span>
                </li>
              );
            })}
          </ul>
          <p className={cx("mt-1.5 min-h-5 text-sm", problem ? "text-danger" : "text-fg-3")} aria-live="polite">
            {problem ?? (total > 0 ? `${rows.filter((r) => r.included).length} people · ${formatMoney(total)}` : "Enter an amount to see each share.")}
          </p>
        </fieldset>

        <Field label="Notes" optional>
          <Textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…" disabled={submitted && !valid}>
            {expense ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
