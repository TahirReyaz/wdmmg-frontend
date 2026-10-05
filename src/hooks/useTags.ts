"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { tagsApi } from "@/api/tags";
import type { TagInput } from "@/types";
import { qk } from "./queryKeys";

export function useTags() {
  return useQuery({ queryKey: qk.tags.list, queryFn: tagsApi.list });
}

export function useTagSummary(id: number) {
  return useQuery({ queryKey: qk.tags.summary(id), queryFn: () => tagsApi.summary(id), enabled: Number.isFinite(id) });
}

/** Tag names and colours appear on expense rows, so those refresh too. */
function invalidate(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.tags.all });
  void qc.invalidateQueries({ queryKey: qk.expenses.all });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TagInput) => tagsApi.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tags.all }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TagInput }) => tagsApi.update(id, input),
    onSuccess: () => invalidate(qc),
  });
}

/** Expenses keep existing; they just become untagged. */
export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tagsApi.remove(id),
    onSuccess: () => invalidate(qc),
  });
}
