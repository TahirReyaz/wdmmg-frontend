import type { AdminCategory, Category } from "@/types";
import { http } from "./client";

export interface CategoryInput {
  name: string;
  color: string;
  icon?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export const categoriesApi = {
  listActive: () => http.get<Category[]>("/api/categories"),
  listAll: () => http.get<AdminCategory[]>("/api/admin/categories"),
  create: (input: CategoryInput) => http.post<AdminCategory>("/api/admin/categories", input),
  update: (id: number, input: CategoryInput) => http.put<AdminCategory>(`/api/admin/categories/${id}`, input),
  remove: (id: number) => http.delete<{ result: "DELETED" | "RETIRED" }>(`/api/admin/categories/${id}`),
};
