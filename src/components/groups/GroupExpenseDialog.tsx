"use client";

import { Minus, Plus, X } from "lucide-react";
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
import { loadGroupExpenseDefaults, saveGroupExpenseDefaults } from "@/utils/groupExpenseDefaults";
import { saveShortcutLabel, submitOnEnter } from "@/utils/keyboard";
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

function initialRows(members: UserSummary[], expense?: GroupExpense, rememberedIds?: number[]): SplitRow[] {
  // For a new expense, start with the people from the last equal split (if any of them are still members).
  const remembered = !expense && rememberedIds?.some((id) => members.some((m) => m.id === id)) ? new Set(rememberedIds) : null;
  return members.map((m) => {
    const share = expense?.shares.find((s) => s.user.id === m.id);
    let value = "1";
    if (expense?.splitType === "EXACT" && share) value = share.amount.toFixed(2);
    if (expense?.splitType === "PERCENT" && share) value = String(+((share.amount / expense.amount) * 100).toFixed(2));
    return { userId: m.id, included: expense ? !!share : remembered ? remembered.has(m.id) : true, value };
  });
}

/** Shares are whole or fractional weights; the buttons move by one and never go below zero. */
function stepShares(value: string, by: number) {
  const n = Number(value);
  const next = (Number.isFinite(n) ? n : 0) + by;
  return String(Math.max(0, +next.toFixed(2)));
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
  const [usingRemembered, setUsingRemembered] = useState(false);

  useEffect(() => {
    if (!open) return;
    const remembered = expense ? null : loadGroupExpenseDefaults(user?.id, groupId);
    const initial = initialRows(members, expense, remembered?.memberIds);
    setName(expense?.name ?? "");
    setAmount(expense ? expense.amount.toFixed(2) : "");
    setDate(expense?.date ?? remembered?.date ?? todayISO());
    setCategoryId(expense ? String(expense.category.id) : remembered?.categoryId ? String(remembered.categoryId) : "");
    setPaidById(String(expense?.paidBy.id ?? user?.id ?? members[0]?.id ?? ""));
    setNotes(expense?.notes ?? "");
    setSplitType(expense?.splitType ?? "EQUAL");
    setRows(initial);
    setUsingRemembered(!expense && initial.some((r) => !r.included));
    setSubmitted(false);
    setError(null);
    // Reset the form only when the dialog opens or targets a different expense.
  }, [open, expense?.id]);

  const total = Number(amount) || 0;
  const preview = useMemo(() => previewSplit(total, splitType, rows), [total, splitType, rows]);
  const problem = total > 0 ? splitProblem(total, splitType, rows) : null;
  const options = categories.data ?? [];
  const withCurrent = expense && !options.some((c) => c.id === expense.category.id) ? [...options, expense.category] : options;

  // A remembered category may have been retired since; fall back to "Select".
  useEffect(() => {
    if (open && !expense && categoryId && categories.data && !categories.data.some((c) => String(c.id) === categoryId)) setCategoryId("");
  }, [open, expense, categoryId, categories.data]);

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
  const includedCount = rows.filter((r) => r.included).length;
  const includeEveryone = () => {
    setRows((rs) => rs.map((r) => ({ ...r, included: true })));
    setUsingRemembered(false);
  };

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
      if (!expense) {
        saveGroupExpenseDefaults(user?.id, groupId, {
          // Only an equal split updates the remembered people; other splits keep the last equal one.
          memberIds:
            splitType === "EQUAL" ? rows.filter((r) => r.included).map((r) => r.userId) : loadGroupExpenseDefaults(user?.id, groupId)?.memberIds,
          categoryId: Number(categoryId),
          date,
        });
      }
      toast.success(expense ? "Expense updated" : "Expense added", { description: name.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? errorMessage(err) : "Couldn't save.");
    }
  }

  const who = (m: UserSummary) => (m.id === user?.id ? "You" : m.name);

  return (
    <Dialog open={open} onClose={onClose} title={expense ? "Edit shared expense" : "Add shared expense"} size="lg" dismissible={!save.isPending}>
      <form onSubmit={submit} onKeyDown={submitOnEnter} noValidate className="flex flex-col gap-4">
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

        <fieldset className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-medium text-fg-2">Split</legend>
            <SegmentedControl label="Split method" size="sm" options={SPLITS} value={splitType} onChange={changeType} className="w-full sm:w-auto" />
          </div>
          <ul className="divide-y divide-line border border-line">
            {members.map((m) => {
              const row = rows.find((r) => r.userId === m.id);
              if (!row) return null;
              const share = preview.get(m.id);
              return (
                <li key={m.id} className={cx("flex min-h-12 items-center gap-2 px-3 py-1.5 sm:gap-3", !row.included && "bg-sunken/50")}>
                  <input
                    type="checkbox"
                    aria-label={`Include ${who(m)}`}
                    checked={row.included}
                    onChange={(e) => updateRow(m.id, { included: e.target.checked })}
                    className="size-4 cursor-pointer accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cx("block truncate text-base", row.included ? "text-fg" : "text-fg-3")}>{who(m)}</span>
                    {splitType !== "EQUAL" && row.included && share !== undefined && (
                      <span className="tabular block text-xs text-fg-3 sm:hidden">{formatMoney(share)}</span>
                    )}
                  </span>
                  {(splitType === "EXACT" || splitType === "PERCENT") && row.included && (
                    <div className="relative w-24 shrink-0 sm:w-28">
                      <Input
                        inputSize="sm"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        aria-label={`${who(m)} – ${splitType === "PERCENT" ? "percent" : "amount"}`}
                        className="tabular pr-7 text-right"
                        value={row.value}
                        onChange={(e) => updateRow(m.id, { value: e.target.value })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-fg-3" aria-hidden>
                        {splitType === "PERCENT" ? "%" : currencySymbol}
                      </span>
                    </div>
                  )}
                  {splitType === "SHARES" && row.included && (
                    <div className="flex shrink-0 items-stretch" role="group" aria-label={`${who(m)} – shares`}>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`One share less for ${who(m)}`}
                        title="One share less"
                        disabled={(Number(row.value) || 0) <= 0}
                        onClick={() => updateRow(m.id, { value: stepShares(row.value, -1) })}
                        className="flex w-8 cursor-pointer items-center justify-center border border-r-0 border-line-strong bg-surface text-fg-2 hover:bg-sunken hover:text-fg disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-surface"
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <Input
                        inputSize="sm"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        aria-label={`${who(m)} – shares`}
                        className="tabular w-12 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={row.value}
                        onChange={(e) => updateRow(m.id, { value: e.target.value })}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`One share more for ${who(m)}`}
                        title="One share more"
                        onClick={() => updateRow(m.id, { value: stepShares(row.value, 1) })}
                        className="flex w-8 cursor-pointer items-center justify-center border border-l-0 border-line-strong bg-surface text-fg-2 hover:bg-sunken hover:text-fg"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  )}
                  <span className={cx("tabular w-24 shrink-0 text-right text-base text-fg-2", splitType !== "EQUAL" && "hidden sm:block")}>{row.included && share !== undefined ? formatMoney(share) : "—"}</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove ${who(m)} from this expense`}
                    title={row.included ? `Remove ${who(m)}` : undefined}
                    onClick={() => updateRow(m.id, { included: false })}
                    className={cx(
                      "-mr-1.5 flex size-7 shrink-0 cursor-pointer items-center justify-center text-fg-3 hover:bg-sunken hover:text-danger",
                      !row.included && "invisible",
                    )}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1.5 flex min-h-5 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <p className={problem ? "text-danger" : "text-fg-3"} aria-live="polite">
              {problem ??
                (total > 0
                  ? `${includedCount} ${includedCount === 1 ? "person" : "people"} · ${formatMoney(total)}`
                  : usingRemembered
                    ? "Same people as your last expense here."
                    : "Enter an amount to see each share.")}
            </p>
            {includedCount < members.length && (
              <button type="button" onClick={includeEveryone} className="cursor-pointer text-accent hover:underline">
                Include everyone
              </button>
            )}
          </div>
        </fieldset>

        <Field label="Notes" optional>
          <Textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="sticky -bottom-5 z-10 -mx-5 mt-1 -mb-5 flex items-center gap-2 border-t border-line bg-raised px-5 pt-3 pb-5 *:flex-1 sm:justify-end sm:pt-4 sm:*:flex-none">
          <span className="mr-auto hidden text-xs text-fg-3 sm:inline">
            <kbd className="font-sans">{saveShortcutLabel()}</kbd> to save
          </span>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…" disabled={submitted && !valid} title={`Save (${saveShortcutLabel()})`}>
            {expense ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
