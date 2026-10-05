import type { Expense, ExpenseInput, ExpenseTotal, Page, PaymentMethod } from "@/types";
import { downloadFile, http } from "./client";

export type ExpenseQuery = {
  from?: string;
  to?: string;
  categoryId?: number | "";
  paymentMethod?: PaymentMethod | "";
  q?: string;
  tagId?: number | "";
  page?: number;
  size?: number;
  sort?: "date" | "amount" | "name";
  dir?: "asc" | "desc";
};

export const expensesApi = {
  list: (query: ExpenseQuery) => http.get<Page<Expense>>("/api/expenses", { ...query }),
  /** Count and sum of everything matching the filters (all pages). */
  total: (query: ExpenseQuery) => {
    const { from, to, categoryId, paymentMethod, q, tagId } = query;
    return http.get<ExpenseTotal>("/api/expenses/total", { from, to, categoryId, paymentMethod, q, tagId });
  },
  create: (input: ExpenseInput) => http.post<Expense>("/api/expenses", input),
  update: (id: number, input: ExpenseInput) => http.put<Expense>(`/api/expenses/${id}`, input),
  remove: (id: number) => http.delete(`/api/expenses/${id}`),
  exportCsv: (query: ExpenseQuery) => {
    const { from, to, categoryId, paymentMethod, q, tagId } = query;
    return downloadFile("/api/expenses/export", { from, to, categoryId, paymentMethod, q, tagId }, `expenses_${from ?? "all"}_${to ?? "today"}.csv`);
  },
};
