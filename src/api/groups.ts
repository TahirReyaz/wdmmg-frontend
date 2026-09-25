import type {
  GroupAnalytics,
  GroupDetail,
  GroupExpense,
  GroupExpenseInput,
  OverallBalance,
  Page,
  Settlement,
} from "@/types";
import { http } from "./client";

export interface GroupInput {
  name: string;
  description?: string;
}

/** A payment the signed-in user made to another member. */
export interface SettlementInput {
  toUserId: number;
  amount: number;
  date: string;
  note?: string;
}

export const groupsApi = {
  overview: () => http.get<OverallBalance>("/api/groups"),
  get: (id: number) => http.get<GroupDetail>(`/api/groups/${id}`),
  create: (input: GroupInput) => http.post<GroupDetail>("/api/groups", input),
  update: (id: number, input: GroupInput) => http.put<GroupDetail>(`/api/groups/${id}`, input),
  remove: (id: number) => http.delete(`/api/groups/${id}`),

  addMember: (id: number, email: string) => http.post<GroupDetail>(`/api/groups/${id}/members`, { email }),
  removeMember: (id: number, userId: number) => http.delete(`/api/groups/${id}/members/${userId}`),

  expenses: (id: number, page: number, size = 25) =>
    http.get<Page<GroupExpense>>(`/api/groups/${id}/expenses`, { page, size }),
  addExpense: (id: number, input: GroupExpenseInput) => http.post<GroupExpense>(`/api/groups/${id}/expenses`, input),
  updateExpense: (id: number, expenseId: number, input: GroupExpenseInput) =>
    http.put<GroupExpense>(`/api/groups/${id}/expenses/${expenseId}`, input),
  removeExpense: (id: number, expenseId: number) => http.delete(`/api/groups/${id}/expenses/${expenseId}`),

  settlements: (id: number) => http.get<Settlement[]>(`/api/groups/${id}/settlements`),
  settle: (id: number, input: SettlementInput) => http.post<Settlement>(`/api/groups/${id}/settlements`, input),
  removeSettlement: (id: number, settlementId: number) => http.delete(`/api/groups/${id}/settlements/${settlementId}`),

  analytics: (id: number) => http.get<GroupAnalytics>(`/api/groups/${id}/analytics`),
};
