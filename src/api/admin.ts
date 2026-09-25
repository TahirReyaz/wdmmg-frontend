import type { Role, User } from "@/types";
import { http } from "./client";

export const adminApi = {
  users: () => http.get<User[]>("/api/admin/users"),
  setRole: (id: number, role: Role) => http.put<User>(`/api/admin/users/${id}/role`, { role }),
};
