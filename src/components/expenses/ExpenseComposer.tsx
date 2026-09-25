"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { errorMessage } from "@/api/client";
import { useCreateExpense, useUpdateExpense } from "@/hooks/useExpenses";
import type { Expense } from "@/types";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { ExpenseForm, type ExpenseFormSubmit } from "./ExpenseForm";

interface Composer {
  /** Opens the add dialog, or the edit dialog when given an expense. */
  open: (expense?: Expense) => void;
}

const ComposerContext = createContext<Composer | null>(null);

/** One add/edit expense dialog shared by the whole app (sidebar, pages, rows). */
export function ExpenseComposerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; expense?: Expense; key: number }>({ open: false, key: 0 });
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const toast = useToast();

  const open = useCallback((expense?: Expense) => setState((s) => ({ open: true, expense, key: s.key + 1 })), []);
  const close = () => setState((s) => ({ ...s, open: false }));

  async function handleSubmit({ input, category }: ExpenseFormSubmit) {
    const editing = state.expense;
    if (!editing) {
      await create.mutateAsync(input); // errors surface inside the form
      close();
      toast.success("Expense added", { description: input.name });
      return;
    }
    // Optimistic edit: close now, the row updates immediately and shows a pending state.
    close();
    update.mutate(
      { id: editing.id, input, category },
      {
        onError: (err) =>
          toast.error("Changes weren't saved", {
            description: errorMessage(err),
            action: { label: "Edit again", onClick: () => open(editing) },
          }),
      },
    );
  }

  const value = useMemo(() => ({ open }), [open]);
  const editing = !!state.expense;

  return (
    <ComposerContext.Provider value={value}>
      {children}
      <Dialog open={state.open} onClose={close} title={editing ? "Edit expense" : "New expense"} dismissible={!create.isPending}>
        <ExpenseForm
          key={state.key}
          expense={state.expense}
          onSubmit={handleSubmit}
          onCancel={close}
          submitLabel={editing ? "Save changes" : "Add expense"}
        />
      </Dialog>
    </ComposerContext.Provider>
  );
}

export function useExpenseComposer(): Composer {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("useExpenseComposer must be used within ExpenseComposerProvider");
  return ctx;
}
