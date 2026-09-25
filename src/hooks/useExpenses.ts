"use client";

import { keepPreviousData, useMutation, useMutationState, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { expensesApi, type ExpenseQuery } from "@/api/expenses";
import type { Category, Expense, ExpenseInput, Page } from "@/types";
import { qk } from "./queryKeys";

export const EXPENSE_MUTATION = {
  update: ["expense", "update"] as const,
  remove: ["expense", "remove"] as const,
};

/** Ids of expenses with an edit in flight – rows render a pending state. */
export function usePendingExpenseIds(): Set<number> {
  const ids = useMutationState({
    filters: { mutationKey: EXPENSE_MUTATION.update, status: "pending" },
    select: (m) => (m.state.variables as { id: number } | undefined)?.id,
  });
  return new Set(ids.filter((id): id is number => typeof id === "number"));
}

export function useExpenses(query: ExpenseQuery) {
  return useQuery({
    queryKey: qk.expenses.list(query),
    queryFn: () => expensesApi.list(query),
    placeholderData: keepPreviousData,
  });
}

/** Anything derived from expenses (lists, analytics) must refresh after a write. */
function invalidateSpend(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.expenses.all });
  void qc.invalidateQueries({ queryKey: qk.analytics.all });
  // Spending moves the bank balance.
  void qc.invalidateQueries({ queryKey: qk.money.all });
}

type ListSnapshot = [readonly unknown[], Page<Expense> | undefined][];

function patchLists(qc: QueryClient, fn: (page: Page<Expense>) => Page<Expense>): ListSnapshot {
  const snapshot = qc.getQueriesData<Page<Expense>>({ queryKey: ["expenses", "list"] });
  qc.setQueriesData<Page<Expense>>({ queryKey: ["expenses", "list"] }, (page) => (page ? fn(page) : page));
  return snapshot;
}

function restore(qc: QueryClient, snapshot?: ListSnapshot) {
  snapshot?.forEach(([key, data]) => qc.setQueryData(key, data));
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => expensesApi.create(input),
    onSuccess: () => invalidateSpend(qc),
  });
}

/** Optimistic edit: the row updates immediately and rolls back if the save fails. */
export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: EXPENSE_MUTATION.update,
    mutationFn: ({ id, input }: { id: number; input: ExpenseInput; category?: Category }) => expensesApi.update(id, input),
    onMutate: async ({ id, input, category }) => {
      await qc.cancelQueries({ queryKey: ["expenses", "list"] });
      const snapshot = patchLists(qc, (page) => ({
        ...page,
        content: page.content.map((e) =>
          e.id === id
            ? { ...e, name: input.name, amount: input.amount, date: input.date, paymentMethod: input.paymentMethod, notes: input.notes ?? null, category: category ?? e.category }
            : e,
        ),
      }));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snapshot),
    onSettled: () => invalidateSpend(qc),
  });
}

/** Optimistic delete. */
export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: EXPENSE_MUTATION.remove,
    mutationFn: (expense: Expense) => expensesApi.remove(expense.id),
    onMutate: async (expense) => {
      await qc.cancelQueries({ queryKey: ["expenses", "list"] });
      const snapshot = patchLists(qc, (page) => ({
        ...page,
        content: page.content.filter((e) => e.id !== expense.id),
        totalElements: Math.max(0, page.totalElements - 1),
      }));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snapshot),
    onSettled: () => invalidateSpend(qc),
  });
}
