"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { goalsApi, type FundsDirection } from "@/api/goals";
import type { Goal, GoalInput, MoneySummary } from "@/types";
import { qk } from "./queryKeys";

export function useGoals() {
  return useQuery({ queryKey: qk.goals.list, queryFn: goalsApi.list });
}

export function useGoalHistory(id: number | null) {
  return useQuery({ queryKey: qk.goals.history(id ?? 0), queryFn: () => goalsApi.history(id!), enabled: id != null });
}

/** Money in goals is subtracted from "available", so the summary refreshes too. */
function refreshGoals(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.goals.all });
  void qc.invalidateQueries({ queryKey: qk.money.summary });
}

function withSaved(g: Goal, saved: number): Goal {
  const remaining = Math.max(0, g.targetAmount - saved);
  return { ...g, savedAmount: saved, remaining, reached: remaining === 0, progressPct: Math.min(100, (saved / g.targetAmount) * 100) };
}

function shiftSetAside(qc: QueryClient, delta: number) {
  qc.setQueryData<MoneySummary>(qk.money.summary, (s) => (s ? { ...s, setAside: s.setAside + delta, available: s.available - delta } : s));
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: GoalInput }) => (id ? goalsApi.update(id, input) : goalsApi.create(input)),
    onSuccess: () => refreshGoals(qc),
  });
}

/** Optimistic: the bar moves and "available" changes before the server answers. */
export function useMoveFunds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goal, direction, amount, note }: { goal: Goal; direction: FundsDirection; amount: number; note?: string }) =>
      goalsApi.moveFunds(goal.id, direction, amount, note),
    onMutate: async ({ goal, direction, amount }) => {
      await qc.cancelQueries({ queryKey: qk.goals.list });
      await qc.cancelQueries({ queryKey: qk.money.summary });
      const goals = qc.getQueryData<Goal[]>(qk.goals.list);
      const summary = qc.getQueryData<MoneySummary>(qk.money.summary);
      const delta = direction === "ADD" ? amount : -amount;
      qc.setQueryData<Goal[]>(qk.goals.list, (rows) => rows?.map((g) => (g.id === goal.id ? withSaved(g, g.savedAmount + delta) : g)));
      shiftSetAside(qc, delta);
      return { goals, summary };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.goals) qc.setQueryData(qk.goals.list, ctx.goals);
      if (ctx?.summary) qc.setQueryData(qk.money.summary, ctx.summary);
    },
    onSuccess: (updated) => qc.setQueryData<Goal[]>(qk.goals.list, (rows) => rows?.map((g) => (g.id === updated.id ? updated : g))),
    onSettled: (_d, _e, v) => {
      refreshGoals(qc);
      void qc.invalidateQueries({ queryKey: qk.goals.history(v.goal.id) });
    },
  });
}

/** Optimistic delete; whatever was saved goes back to available. */
export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goal: Goal) => goalsApi.remove(goal.id),
    onMutate: async (goal) => {
      await qc.cancelQueries({ queryKey: qk.goals.list });
      const goals = qc.getQueryData<Goal[]>(qk.goals.list);
      const summary = qc.getQueryData<MoneySummary>(qk.money.summary);
      qc.setQueryData<Goal[]>(qk.goals.list, (rows) => rows?.filter((g) => g.id !== goal.id));
      shiftSetAside(qc, -goal.savedAmount);
      return { goals, summary };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.goals) qc.setQueryData(qk.goals.list, ctx.goals);
      if (ctx?.summary) qc.setQueryData(qk.money.summary, ctx.summary);
    },
    onSettled: () => refreshGoals(qc),
  });
}
