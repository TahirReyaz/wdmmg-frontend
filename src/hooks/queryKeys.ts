import type { ExpenseQuery } from "@/api/expenses";

/** Central registry of cache keys so invalidation stays consistent. */
export const qk = {
  me: ["me"] as const,
  categories: {
    active: ["categories", "active"] as const,
    admin: ["categories", "admin"] as const,
  },
  expenses: {
    all: ["expenses"] as const,
    list: (q: ExpenseQuery) => ["expenses", "list", q] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    summary: (from: string, to: string, includeGroups: boolean) => ["analytics", "summary", from, to, includeGroups] as const,
    groupShares: (from: string, to: string) => ["analytics", "group-shares", from, to] as const,
    insights: (from: string, to: string, includeGroups: boolean) => ["analytics", "insights", from, to, includeGroups] as const,
  },
  groups: {
    all: ["groups"] as const,
    overview: ["groups", "overview"] as const,
    detail: (id: number) => ["groups", id, "detail"] as const,
    expenses: (id: number, page: number) => ["groups", id, "expenses", page] as const,
    expensesAll: (id: number) => ["groups", id, "expenses"] as const,
    settlements: (id: number) => ["groups", id, "settlements"] as const,
    analytics: (id: number) => ["groups", id, "analytics"] as const,
    scope: (id: number) => ["groups", id] as const,
  },
  admin: {
    users: ["admin", "users"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (unreadOnly: boolean, page: number) => ["notifications", "list", unreadOnly, page] as const,
    lists: ["notifications", "list"] as const,
    unread: ["notifications", "unread-count"] as const,
  },
  money: {
    all: ["money"] as const,
    summary: ["money", "summary"] as const,
    activity: (from: string, to: string) => ["money", "activity", from, to] as const,
    income: (page: number) => ["money", "income", page] as const,
    incomeAll: ["money", "income"] as const,
    salaryPrompt: ["money", "salary-prompt"] as const,
  },
  goals: {
    all: ["goals"] as const,
    list: ["goals", "list"] as const,
    history: (id: number) => ["goals", id, "history"] as const,
  },
  recurring: {
    all: ["recurring"] as const,
    list: ["recurring", "list"] as const,
    pending: ["recurring", "pending"] as const,
  },
};
