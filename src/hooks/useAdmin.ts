"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import type { Role, User } from "@/types";
import { qk } from "./queryKeys";

export function useUsers() {
  return useQuery({ queryKey: qk.admin.users, queryFn: adminApi.users });
}

/** Optimistic role change with rollback. */
export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user, role }: { user: User; role: Role }) => adminApi.setRole(user.id, role),
    onMutate: async ({ user, role }) => {
      await qc.cancelQueries({ queryKey: qk.admin.users });
      const previous = qc.getQueryData<User[]>(qk.admin.users);
      qc.setQueryData<User[]>(qk.admin.users, (rows) => rows?.map((u) => (u.id === user.id ? { ...u, role } : u)));
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.admin.users, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.admin.users }),
  });
}
