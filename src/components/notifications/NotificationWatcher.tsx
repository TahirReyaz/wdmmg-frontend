"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { notificationsApi } from "@/api/notifications";
import { useUnreadCount } from "@/hooks/useNotifications";
import { qk } from "@/hooks/queryKeys";
import { desktopAlerts } from "@/utils/desktopAlerts";

/**
 * Background companion to the badge. When the unread count goes up it refreshes data
 * that may have changed server-side (e.g. an expense added from an email), and – while
 * the tab is hidden and desktop alerts are on – shows a system notification for the
 * newest item. Renders nothing.
 */
export function NotificationWatcher() {
  const { data } = useUnreadCount();
  const router = useRouter();
  const qc = useQueryClient();
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const count = data?.count;
    if (count === undefined) return;
    const before = previous.current;
    previous.current = count;
    if (before === null || count <= before) return;
    void qc.invalidateQueries({ queryKey: qk.expenses.all });
    void qc.invalidateQueries({ queryKey: qk.analytics.all });
    void qc.invalidateQueries({ queryKey: qk.money.all });
    if (!desktopAlerts.enabled() || document.visibilityState === "visible") return;

    notificationsApi
      .list(true, 0, 1)
      .then((page) => {
        const latest = page.content[0];
        if (!latest) return;
        const alert = new Notification("Where did my money go", { body: latest.title, tag: `wdmmg-${latest.id}` });
        alert.onclick = () => {
          window.focus();
          router.push(latest.link ?? "/notifications");
          alert.close();
        };
      })
      .catch(() => {
        /* best effort */
      });
  }, [data?.count, router, qc]);

  return null;
}
