"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi, type CategoryInput } from "@/api/categories";
import type { AdminCategory } from "@/types";
import { qk } from "./queryKeys";

export function useActiveCategories() {
  return useQuery({ queryKey: qk.categories.active, queryFn: categoriesApi.listActive, staleTime: 5 * 60_000 });
}

export function useAdminCategories() {
  return useQuery({ queryKey: qk.categories.admin, queryFn: categoriesApi.listAll });
}

function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["categories"] });
}

export function useSaveCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CategoryInput }) =>
      id ? categoriesApi.update(id, input) : categoriesApi.create(input),
    onSettled: invalidate,
  });
}

/** Optimistically patches a category row (restore, reorder) and rolls back on failure. */
export function usePatchCategory() {
  const qc = useQueryClient();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (c: AdminCategory) =>
      categoriesApi.update(c.id, { name: c.name, color: c.color, icon: c.icon, sortOrder: c.sortOrder, active: c.active }),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: qk.categories.admin });
      const previous = qc.getQueryData<AdminCategory[]>(qk.categories.admin);
      qc.setQueryData<AdminCategory[]>(qk.categories.admin, (rows) =>
        rows?.map((r) => (r.id === next.id ? next : r)).sort(byOrder),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.categories.admin, ctx.previous),
    onSettled: invalidate,
  });
}

/** Deletes an unused category or retires one with history. Optimistic. */
export function useRemoveCategory() {
  const qc = useQueryClient();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (c: AdminCategory) => categoriesApi.remove(c.id),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: qk.categories.admin });
      const previous = qc.getQueryData<AdminCategory[]>(qk.categories.admin);
      qc.setQueryData<AdminCategory[]>(qk.categories.admin, (rows) =>
        c.usageCount > 0 ? rows?.map((r) => (r.id === c.id ? { ...r, active: false } : r)) : rows?.filter((r) => r.id !== c.id),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(qk.categories.admin, ctx.previous),
    onSettled: invalidate,
  });
}

export const byOrder = (a: { sortOrder: number; name: string }, b: { sortOrder: number; name: string }) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
