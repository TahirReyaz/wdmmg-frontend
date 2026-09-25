"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { groupsApi, type GroupInput, type SettlementInput } from "@/api/groups";
import type { GroupExpense, GroupExpenseInput, Page, Settlement } from "@/types";
import { qk } from "./queryKeys";

export function useGroupsOverview() {
  return useQuery({ queryKey: qk.groups.overview, queryFn: groupsApi.overview });
}

export function useGroup(id: number) {
  return useQuery({ queryKey: qk.groups.detail(id), queryFn: () => groupsApi.get(id), enabled: Number.isFinite(id) });
}

export function useGroupExpenses(id: number, page: number) {
  return useQuery({
    queryKey: qk.groups.expenses(id, page),
    queryFn: () => groupsApi.expenses(id, page),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(id),
  });
}

export function useSettlements(id: number) {
  return useQuery({ queryKey: qk.groups.settlements(id), queryFn: () => groupsApi.settlements(id), enabled: Number.isFinite(id) });
}

export function useGroupAnalytics(id: number, enabled = true) {
  return useQuery({ queryKey: qk.groups.analytics(id), queryFn: () => groupsApi.analytics(id), enabled: enabled && Number.isFinite(id) });
}

/** A change inside a group moves balances, the overview and my personal analytics. */
function invalidateGroup(qc: QueryClient, id: number) {
  void qc.invalidateQueries({ queryKey: qk.groups.scope(id) });
  void qc.invalidateQueries({ queryKey: qk.groups.overview });
  void qc.invalidateQueries({ queryKey: qk.analytics.all });
  // Bills I paid and settlements move my bank balance.
  void qc.invalidateQueries({ queryKey: qk.money.all });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupInput) => groupsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.groups.overview }),
  });
}

export function useUpdateGroup(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupInput) => groupsApi.update(id, input),
    onSuccess: (detail) => {
      qc.setQueryData(qk.groups.detail(id), detail);
      void qc.invalidateQueries({ queryKey: qk.groups.overview });
    },
  });
}

export function useDeleteGroup(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => groupsApi.remove(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: qk.groups.scope(id) });
      void qc.invalidateQueries({ queryKey: qk.groups.overview });
      void qc.invalidateQueries({ queryKey: qk.analytics.all });
      void qc.invalidateQueries({ queryKey: qk.money.all });
    },
  });
}

export function useAddMember(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => groupsApi.addMember(id, email),
    onSuccess: (detail) => {
      qc.setQueryData(qk.groups.detail(id), detail);
      void qc.invalidateQueries({ queryKey: qk.groups.overview });
    },
  });
}

export function useRemoveMember(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => groupsApi.removeMember(id, userId),
    onSettled: () => invalidateGroup(qc, id),
  });
}

export function useSaveGroupExpense(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, input }: { expenseId?: number; input: GroupExpenseInput }) =>
      expenseId ? groupsApi.updateExpense(id, expenseId, input) : groupsApi.addExpense(id, input),
    onSuccess: () => invalidateGroup(qc, id),
  });
}

/** Optimistic: the expense disappears from the activity list immediately. */
export function useDeleteGroupExpense(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expense: GroupExpense) => groupsApi.removeExpense(id, expense.id),
    onMutate: async (expense) => {
      await qc.cancelQueries({ queryKey: qk.groups.expensesAll(id) });
      const snapshot = qc.getQueriesData<Page<GroupExpense>>({ queryKey: qk.groups.expensesAll(id) });
      qc.setQueriesData<Page<GroupExpense>>({ queryKey: qk.groups.expensesAll(id) }, (page) =>
        page ? { ...page, content: page.content.filter((e) => e.id !== expense.id), totalElements: page.totalElements - 1 } : page,
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => invalidateGroup(qc, id),
  });
}

export function useSettle(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettlementInput) => groupsApi.settle(id, input),
    onSuccess: () => invalidateGroup(qc, id),
  });
}

/** Optimistic removal of a recorded payment. */
export function useDeleteSettlement(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Settlement) => groupsApi.removeSettlement(id, s.id),
    onMutate: async (s) => {
      await qc.cancelQueries({ queryKey: qk.groups.settlements(id) });
      const previous = qc.getQueryData<Settlement[]>(qk.groups.settlements(id));
      qc.setQueryData<Settlement[]>(qk.groups.settlements(id), (rows) => rows?.filter((r) => r.id !== s.id));
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.groups.settlements(id), ctx.previous),
    onSettled: () => invalidateGroup(qc, id),
  });
}
