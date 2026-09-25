"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import type { AppNotification, Page } from "@/types";
import { qk } from "./queryKeys";

const POLL_MS = 60_000;

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.notifications.unread,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

export function useNotifications(unreadOnly: boolean, page: number) {
  return useQuery({
    queryKey: qk.notifications.list(unreadOnly, page),
    queryFn: () => notificationsApi.list(unreadOnly, page),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

/** Optimistically flips one notification to read and decrements the badge. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: AppNotification) => notificationsApi.markRead(n.id),
    onMutate: async (n) => {
      if (n.read) return { lists: [], unread: undefined };
      await qc.cancelQueries({ queryKey: qk.notifications.all });
      const lists = qc.getQueriesData<Page<AppNotification>>({ queryKey: qk.notifications.lists });
      const unread = qc.getQueryData<{ count: number }>(qk.notifications.unread);
      qc.setQueriesData<Page<AppNotification>>({ queryKey: qk.notifications.lists }, (p) =>
        p ? { ...p, content: p.content.map((x) => (x.id === n.id ? { ...x, read: true } : x)) } : p,
      );
      if (unread) qc.setQueryData(qk.notifications.unread, { count: Math.max(0, unread.count - 1) });
      return { lists, unread };
    },
    onError: (_e, _v, ctx) => {
      ctx?.lists.forEach(([k, d]) => qc.setQueryData(k, d));
      if (ctx?.unread) qc.setQueryData(qk.notifications.unread, ctx.unread);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.notifications.all });
      const lists = qc.getQueriesData<Page<AppNotification>>({ queryKey: qk.notifications.lists });
      const unread = qc.getQueryData<{ count: number }>(qk.notifications.unread);
      qc.setQueriesData<Page<AppNotification>>({ queryKey: qk.notifications.lists }, (p) =>
        p ? { ...p, content: p.content.map((x) => ({ ...x, read: true })) } : p,
      );
      qc.setQueryData(qk.notifications.unread, { count: 0 });
      return { lists, unread };
    },
    onError: (_e, _v, ctx) => {
      ctx?.lists.forEach(([k, d]) => qc.setQueryData(k, d));
      if (ctx?.unread) qc.setQueryData(qk.notifications.unread, ctx.unread);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications.all }),
  });
}
