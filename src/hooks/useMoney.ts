"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { moneyApi } from "@/api/money";
import type { Income, IncomeInput, MoneySummary, Page, SalaryPrompt } from "@/types";
import { qk } from "./queryKeys";

export function useMoneySummary() {
  return useQuery({ queryKey: qk.money.summary, queryFn: moneyApi.summary });
}

export function useMoneyActivity(from: string, to: string) {
  return useQuery({ queryKey: qk.money.activity(from, to), queryFn: () => moneyApi.activity(from, to), placeholderData: keepPreviousData });
}

export function useIncome(page: number) {
  return useQuery({ queryKey: qk.money.income(page), queryFn: () => moneyApi.income(page), placeholderData: keepPreviousData });
}

export function useSalaryPrompt(enabled = true) {
  return useQuery({ queryKey: qk.money.salaryPrompt, queryFn: moneyApi.salaryPrompt, enabled, staleTime: 10 * 60_000 });
}

/** Income changes the balance, the ledger, and whether the salary prompt is still due. */
function refreshMoney(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.money.all });
  void qc.invalidateQueries({ queryKey: qk.notifications.all });
}

/** Optimistically nudges the summary so the headline figures respond immediately. */
function bumpSummary(qc: QueryClient, delta: number) {
  qc.setQueryData<MoneySummary>(qk.money.summary, (s) =>
    s ? { ...s, balance: s.balance + delta, available: s.available + delta, monthIn: s.monthIn + delta } : s,
  );
}

export function useSetOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, date }: { amount: number; date: string }) => moneyApi.setOpening(amount, date),
    onSuccess: (summary) => {
      qc.setQueryData(qk.money.summary, summary);
      void qc.invalidateQueries({ queryKey: qk.money.all });
    },
  });
}

export function useSaveIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: IncomeInput }) => (id ? moneyApi.updateIncome(id, input) : moneyApi.addIncome(input)),
    onSettled: () => refreshMoney(qc),
  });
}

/** Optimistic delete with rollback. */
export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Income) => moneyApi.removeIncome(item.id),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: qk.money.all });
      const lists = qc.getQueriesData<Page<Income>>({ queryKey: qk.money.incomeAll });
      const summary = qc.getQueryData<MoneySummary>(qk.money.summary);
      qc.setQueriesData<Page<Income>>({ queryKey: qk.money.incomeAll }, (p) =>
        p ? { ...p, content: p.content.filter((i) => i.id !== item.id), totalElements: Math.max(0, p.totalElements - 1) } : p,
      );
      bumpSummary(qc, -item.amount);
      return { lists, summary };
    },
    onError: (_e, _v, ctx) => {
      ctx?.lists.forEach(([k, d]) => qc.setQueryData(k, d));
      if (ctx?.summary) qc.setQueryData(qk.money.summary, ctx.summary);
    },
    onSettled: () => refreshMoney(qc),
  });
}

export function useRecordSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, date }: { amount: number; date?: string }) => moneyApi.recordSalary(amount, date),
    onMutate: async ({ amount }) => {
      await qc.cancelQueries({ queryKey: qk.money.salaryPrompt });
      const prompt = qc.getQueryData<SalaryPrompt>(qk.money.salaryPrompt);
      qc.setQueryData<SalaryPrompt>(qk.money.salaryPrompt, (p) => (p ? { ...p, due: false, suggestedAmount: amount } : p));
      return { prompt };
    },
    onError: (_e, _v, ctx) => ctx?.prompt && qc.setQueryData(qk.money.salaryPrompt, ctx.prompt),
    onSettled: () => refreshMoney(qc),
  });
}

export function useDismissSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: moneyApi.dismissSalary,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.money.salaryPrompt });
      const prompt = qc.getQueryData<SalaryPrompt>(qk.money.salaryPrompt);
      qc.setQueryData<SalaryPrompt>(qk.money.salaryPrompt, (p) => (p ? { ...p, due: false } : p));
      return { prompt };
    },
    onError: (_e, _v, ctx) => ctx?.prompt && qc.setQueryData(qk.money.salaryPrompt, ctx.prompt),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.money.salaryPrompt });
      void qc.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}

export function useSalarySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reminder, day }: { reminder: boolean; day: number }) => moneyApi.salarySettings(reminder, day),
    onSuccess: (prompt) => {
      qc.setQueryData(qk.money.salaryPrompt, prompt);
      qc.setQueryData<MoneySummary>(qk.money.summary, (s) => (s ? { ...s, salaryReminder: prompt.reminder, salaryDay: prompt.salaryDay } : s));
    },
  });
}
