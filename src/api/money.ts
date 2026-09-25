import type { Income, IncomeInput, MoneyActivity, MoneySummary, Page, SalaryPrompt } from "@/types";
import { http } from "./client";

export const moneyApi = {
  summary: () => http.get<MoneySummary>("/api/money/summary"),
  activity: (from: string, to: string) => http.get<MoneyActivity[]>("/api/money/activity", { from, to }),
  setOpening: (amount: number, date: string) => http.put<MoneySummary>("/api/money/opening-balance", { amount, date }),

  income: (page: number, size = 20) => http.get<Page<Income>>("/api/money/income", { page, size }),
  addIncome: (input: IncomeInput) => http.post<Income>("/api/money/income", input),
  updateIncome: (id: number, input: IncomeInput) => http.put<Income>(`/api/money/income/${id}`, input),
  removeIncome: (id: number) => http.delete(`/api/money/income/${id}`),

  salaryPrompt: () => http.get<SalaryPrompt>("/api/money/salary-prompt"),
  recordSalary: (amount: number, date?: string) => http.post<Income>("/api/money/salary", { amount, date }),
  dismissSalary: () => http.post<void>("/api/money/salary-prompt/dismiss"),
  salarySettings: (reminder: boolean, day: number) => http.put<SalaryPrompt>("/api/money/salary-settings", { reminder, day }),
};
