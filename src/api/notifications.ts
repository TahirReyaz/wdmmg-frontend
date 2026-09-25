import type { AppNotification, Page } from "@/types";
import { http } from "./client";

export const notificationsApi = {
  list: (unreadOnly: boolean, page: number, size = 20) =>
    http.get<Page<AppNotification>>("/api/notifications", { unreadOnly, page, size }),
  unreadCount: () => http.get<{ count: number }>("/api/notifications/unread-count"),
  markRead: (id: number) => http.post<void>(`/api/notifications/${id}/read`),
  markAllRead: () => http.post<void>("/api/notifications/read-all"),
};
