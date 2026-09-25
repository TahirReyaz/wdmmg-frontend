import type { Occurrence, RecurringExpense, RecurringInput } from "@/types";
import { http } from "./client";

export const recurringApi = {
  list: () => http.get<RecurringExpense[]>("/api/recurring"),
  create: (input: RecurringInput) => http.post<RecurringExpense>("/api/recurring", input),
  update: (id: number, input: RecurringInput) => http.put<RecurringExpense>(`/api/recurring/${id}`, input),
  pause: (id: number) => http.post<RecurringExpense>(`/api/recurring/${id}/pause`),
  resume: (id: number) => http.post<RecurringExpense>(`/api/recurring/${id}/resume`),
  remove: (id: number) => http.delete(`/api/recurring/${id}`),
  pending: () => http.get<Occurrence[]>("/api/recurring/pending"),
  confirm: (occurrenceId: number, overrides?: { amount?: number; date?: string }) =>
    http.post<Occurrence>(`/api/recurring/occurrences/${occurrenceId}/confirm`, overrides ?? {}),
  skip: (occurrenceId: number) => http.post<Occurrence>(`/api/recurring/occurrences/${occurrenceId}/skip`),
};
