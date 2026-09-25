import type { Goal, GoalContribution, GoalInput } from "@/types";
import { http } from "./client";

export type FundsDirection = "ADD" | "WITHDRAW";

export const goalsApi = {
  list: () => http.get<Goal[]>("/api/goals"),
  create: (input: GoalInput) => http.post<Goal>("/api/goals", input),
  update: (id: number, input: GoalInput) => http.put<Goal>(`/api/goals/${id}`, input),
  remove: (id: number) => http.delete(`/api/goals/${id}`),
  moveFunds: (id: number, direction: FundsDirection, amount: number, note?: string) =>
    http.post<Goal>(`/api/goals/${id}/funds`, { direction, amount, note }),
  history: (id: number) => http.get<GoalContribution[]>(`/api/goals/${id}/history`),
};
