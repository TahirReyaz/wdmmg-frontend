import type { Expense, ExpenseInput, Page, PaymentMethod } from "@/types";
import { downloadFile, http } from "./client";

export type ExpenseQuery = {
  from?: string;
  to?: string;
  categoryId?: number | "";
  paymentMethod?: PaymentMethod | "";
  q?: string;
  page?: number;
  size?: number;
  sort?: "date" | "amount" | "name";
  dir?: "asc" | "desc";
};

export const expensesApi = {
  list: (query: ExpenseQuery) => http.get<Page<Expense>>("/api/expenses", { ...query }),
  create: (input: ExpenseInput) => http.post<Expense>("/api/expenses", input),
  update: (id: number, input: ExpenseInput) => http.put<Expense>(`/api/expenses/${id}`, input),
  remove: (id: number) => http.delete(`/api/expenses/${id}`),
  exportCsv: (query: ExpenseQuery) => {
    const { from, to, categoryId, paymentMethod, q } = query;
    return downloadFile("/api/expenses/export", { from, to, categoryId, paymentMethod, q }, `expenses_${from ?? "all"}_${to ?? "today"}.csv`);
  },
};
