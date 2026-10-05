"use client";

import { useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { useActiveCategories } from "@/hooks/useCategories";
import { useCreateTag, useTags } from "@/hooks/useTags";
import type { Category, Expense, ExpenseInput, PaymentMethod, TagRef } from "@/types";
import { todayISO } from "@/utils/dates";
import { PAYMENT_METHODS, currencySymbol } from "@/utils/format";
import { Button } from "../ui/Button";
import { AmountInput, Field, Input, Select, Textarea } from "../ui/Field";
import { FormError } from "../ui/States";
import { nextTagColor } from "../tags/tagUtils";

const NEW_TAG = "__new";

type Values = { name: string; amount: string; date: string; categoryId: string; paymentMethod: PaymentMethod; notes: string; tagId: string };
type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Add a short description.";
  const amount = Number(v.amount);
  if (!v.amount) e.amount = "Enter an amount.";
  else if (!Number.isFinite(amount) || amount <= 0) e.amount = "Amount must be more than zero.";
  else if (!/^\d+(\.\d{1,2})?$/.test(v.amount)) e.amount = "Use at most two decimal places.";
  if (!v.date) e.date = "Pick a date.";
  else if (v.date > todayISO()) e.date = "Date can't be in the future.";
  if (!v.categoryId) e.categoryId = "Choose a category.";
  return e;
}

export interface ExpenseFormSubmit {
  input: ExpenseInput;
  category?: Category;
  /** For optimistic row updates; null = untagged. */
  tag?: TagRef | null;
}

/**
 * Presentational form: validation and field state only. The caller decides
 * how to persist (and whether optimistically).
 */
export function ExpenseForm({
  expense,
  defaultTagId,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  expense?: Expense;
  /** Pre-selected tag for a new expense (e.g. adding from a tag's page). */
  defaultTagId?: number;
  onSubmit: (data: ExpenseFormSubmit) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const categories = useActiveCategories();
  const tags = useTags();
  const createTag = useCreateTag();
  const [newTagName, setNewTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({
    name: expense?.name ?? "",
    amount: expense ? expense.amount.toFixed(2) : "",
    date: expense?.date ?? todayISO(),
    categoryId: expense ? String(expense.category.id) : "",
    paymentMethod: expense?.paymentMethod ?? "UPI",
    notes: expense?.notes ?? "",
    tagId: expense ? (expense.tag ? String(expense.tag.id) : "") : defaultTagId ? String(defaultTagId) : "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(values);
  const show = (k: keyof Values) => (touched[k] ? errors[k] : undefined) ?? serverErrors[k];

  const options = categories.data ?? [];
  // An old expense may use a category that has since been retired.
  const withCurrent = expense && !options.some((c) => c.id === expense.category.id) ? [...options, expense.category] : options;

  const tagOptions: TagRef[] = tags.data ?? (expense?.tag ? [expense.tag] : []);
  const creatingTag = values.tagId === NEW_TAG;

  async function addTag() {
    const name = newTagName.trim();
    if (!name) return setTagError("Give the tag a name.");
    setTagError(null);
    try {
      const tag = await createTag.mutateAsync({ name, color: nextTagColor(tags.data?.length ?? 0) });
      setValues((prev) => ({ ...prev, tagId: String(tag.id) }));
      setNewTagName("");
    } catch (err) {
      setTagError(errorMessage(err, "Couldn't create the tag."));
    }
  }

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (serverErrors[k]) setServerErrors((prev) => ({ ...prev, [k]: undefined }));
  };
  const blur = (k: keyof Values) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setTouched({ name: true, amount: true, date: true, categoryId: true });
    if (Object.keys(errors).length) return;
    if (creatingTag) return setTagError(newTagName.trim() ? "Press Add to create the tag, or pick another option." : "Name the new tag, or choose No tag.");
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        input: {
          name: values.name.trim(),
          amount: Number(values.amount),
          date: values.date,
          categoryId: Number(values.categoryId),
          paymentMethod: values.paymentMethod,
          notes: values.notes.trim() || undefined,
          tagId: values.tagId ? Number(values.tagId) : null,
        },
        category: withCurrent.find((c) => String(c.id) === values.categoryId),
        tag: values.tagId ? (tagOptions.find((t) => String(t.id) === values.tagId) ?? null) : null,
      });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setServerErrors(err.fieldErrors as Errors);
      setFormError(errorMessage(err, "Couldn't save this expense."));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <Field label="Description" error={show("name")}>
        <Input
          value={values.name}
          maxLength={150}
          placeholder="e.g. Groceries at Nature's Basket"
          autoComplete="off"
          onChange={(e) => set("name", e.target.value)}
          onBlur={blur("name")}
          data-autofocus
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount" error={show("amount")}>
          <AmountInput prefix={currencySymbol} value={values.amount} placeholder="0.00" onChange={(e) => set("amount", e.target.value)} onBlur={blur("amount")} />
        </Field>
        <Field label="Date" error={show("date")}>
          <Input type="date" max={todayISO()} value={values.date} onChange={(e) => set("date", e.target.value)} onBlur={blur("date")} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" error={show("categoryId")} hint={categories.isError ? "Couldn't load categories." : undefined}>
          <Select value={values.categoryId} disabled={categories.isPending} onChange={(e) => set("categoryId", e.target.value)} onBlur={blur("categoryId")}>
            <option value="" disabled>
              {categories.isPending ? "Loading categories…" : "Select a category"}
            </option>
            {withCurrent.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.active ? "" : " (retired)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Paid with">
          <Select value={values.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Tag"
        optional
        error={tagError}
        hint={creatingTag ? "e.g. Goa trip. You'll see its total on the Tags tab." : "Group expenses from a trip or event to see what it cost in total."}
      >
        {creatingTag ? (
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Input
              className="min-w-0 basis-full sm:basis-auto"
              value={newTagName}
              maxLength={60}
              placeholder="New tag name"
              aria-label="New tag name"
              autoFocus
              onChange={(e) => {
                setNewTagName(e.target.value);
                setTagError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addTag();
                }
              }}
            />
            <Button onClick={() => void addTag()} loading={createTag.isPending} loadingText="Adding…">
              Add
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                set("tagId", "");
                setNewTagName("");
                setTagError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Select
            value={values.tagId}
            onChange={(e) => {
              set("tagId", e.target.value);
              setTagError(null);
            }}
          >
            <option value="">No tag</option>
            {tagOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={NEW_TAG}>+ New tag…</option>
          </Select>
        )}
      </Field>
      <Field label="Notes" optional>
        <Textarea rows={2} maxLength={1000} value={values.notes} placeholder="Anything worth remembering" onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <div className="sticky -bottom-5 z-10 -mx-5 mt-1 -mb-5 flex gap-2 border-t border-line bg-raised px-5 pt-3 pb-5 *:flex-1 sm:justify-end sm:pt-4 sm:*:flex-none">
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting} loadingText="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
