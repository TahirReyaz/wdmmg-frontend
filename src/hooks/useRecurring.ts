"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { recurringApi } from "@/api/recurring";
import type { AppNotification, Occurrence, Page, RecurringExpense, RecurringInput } from "@/types";
import { qk } from "./queryKeys";

export function useRecurringList() {
  return useQuery({ queryKey: qk.recurring.list, queryFn: recurringApi.list });
}

export function usePendingOccurrences() {
  return useQuery({ queryKey: qk.recurring.pending, queryFn: recurringApi.pending, refetchInterval: 5 * 60_000 });
}

function refreshAfterSchedule(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.recurring.all });
  // Creating/resuming can raise an occurrence due today → new notification.
  void qc.invalidateQueries({ queryKey: qk.notifications.all });
}

export function useSaveRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: RecurringInput }) =>
      id ? recurringApi.update(id, input) : recurringApi.create(input),
    onSuccess: () => refreshAfterSchedule(qc),
  });
}

/** Optimistic pause / resume. */
export function useSetRecurringActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ item, active }: { item: RecurringExpense; active: boolean }) =>
      active ? recurringApi.resume(item.id) : recurringApi.pause(item.id),
    onMutate: async ({ item, active }) => {
      await qc.cancelQueries({ queryKey: qk.recurring.list });
      const previous = qc.getQueryData<RecurringExpense[]>(qk.recurring.list);
      qc.setQueryData<RecurringExpense[]>(qk.recurring.list, (rows) => rows?.map((r) => (r.id === item.id ? { ...r, active } : r)));
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.recurring.list, ctx.previous),
    onSettled: () => refreshAfterSchedule(qc),
  });
}

/** Optimistic delete. */
export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: RecurringExpense) => recurringApi.remove(item.id),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: qk.recurring.all });
      const previous = qc.getQueryData<RecurringExpense[]>(qk.recurring.list);
      const pending = qc.getQueryData<Occurrence[]>(qk.recurring.pending);
      qc.setQueryData<RecurringExpense[]>(qk.recurring.list, (rows) => rows?.filter((r) => r.id !== item.id));
      qc.setQueryData<Occurrence[]>(qk.recurring.pending, (rows) => rows?.filter((o) => o.recurringId !== item.id));
      return { previous, pending };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.recurring.list, ctx.previous);
      if (ctx?.pending) qc.setQueryData(qk.recurring.pending, ctx.pending);
    },
    onSettled: () => refreshAfterSchedule(qc),
  });
}

type Decision = { occurrenceId: number; action: "confirm" | "skip"; amount?: number; date?: string };

/**
 * Confirm or skip a due item. Optimistic: it leaves the "waiting" list (and any
 * notification asking about it shows the outcome) immediately. Confirming creates
 * a real expense, so expense lists and analytics refresh afterwards.
 */
export function useResolveOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["recurring", "resolve"],
    mutationFn: ({ occurrenceId, action, amount, date }: Decision) =>
      action === "confirm" ? recurringApi.confirm(occurrenceId, { amount, date }) : recurringApi.skip(occurrenceId),
    onMutate: async ({ occurrenceId, action }) => {
      await qc.cancelQueries({ queryKey: qk.recurring.pending });
      await qc.cancelQueries({ queryKey: qk.notifications.lists });
      const pending = qc.getQueryData<Occurrence[]>(qk.recurring.pending);
      const lists = qc.getQueriesData<Page<AppNotification>>({ queryKey: qk.notifications.lists });
      qc.setQueryData<Occurrence[]>(qk.recurring.pending, (rows) => rows?.filter((o) => o.id !== occurrenceId));
      const status = action === "confirm" ? "CONFIRMED" : "SKIPPED";
      qc.setQueriesData<Page<AppNotification>>({ queryKey: qk.notifications.lists }, (p) =>
        p
          ? {
              ...p,
              content: p.content.map((n) =>
                n.type === "RECURRING_DUE" && n.refId === occurrenceId ? { ...n, actionStatus: status, read: true } : n,
              ),
            }
          : p,
      );
      return { pending, lists };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.pending) qc.setQueryData(qk.recurring.pending, ctx.pending);
      ctx?.lists.forEach(([k, d]) => qc.setQueryData(k, d));
    },
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: qk.recurring.all });
      void qc.invalidateQueries({ queryKey: qk.notifications.all });
      if (v.action === "confirm") {
        void qc.invalidateQueries({ queryKey: qk.expenses.all });
        void qc.invalidateQueries({ queryKey: qk.analytics.all });
        void qc.invalidateQueries({ queryKey: qk.money.all });
      }
    },
  });
}
