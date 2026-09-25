"use client";

import { useState } from "react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LoadingRegion, SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useMarkAllRead, useNotifications, useUnreadCount } from "@/hooks/useNotifications";

type Filter = "all" | "unread";
const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const list = useNotifications(filter === "unread", page);
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();

  const loading = list.isPending || list.isPlaceholderData;
  const unreadCount = unread.data?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Bills you've been added to, payments to you, and recurring expenses waiting for your OK."
        actions={
          <Button onClick={() => markAll.mutate()} disabled={unreadCount === 0 || markAll.isPending}>
            Mark all as read
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <SegmentedControl
          label="Show"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setPage(0);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: unreadCount ? `Unread (${unreadCount})` : "Unread" },
          ]}
        />
      </div>

      <Panel busy={list.isFetching && !loading}>
        {list.isError && !list.data ? (
          <ErrorState title="Unable to load notifications" error={list.error} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : loading ? (
          <LoadingRegion label="Loading notifications">
            <SkeletonList rows={6} trailing={false} />
          </LoadingRegion>
        ) : list.data?.content.length === 0 ? (
          <EmptyState
            title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
            description={
              filter === "unread"
                ? "Nothing needs your attention right now."
                : "You'll hear here when someone adds you to a group or bill, pays you back, or a recurring expense is due."
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.content.map((n) => (
              <NotificationItem key={n.id} n={n} />
            ))}
          </ul>
        )}
        {list.data && list.data.totalElements > PAGE_SIZE && (
          <PanelFooter>
            <Pagination page={page} size={PAGE_SIZE} total={list.data.totalElements} onPageChange={setPage} noun="notifications" />
          </PanelFooter>
        )}
      </Panel>
    </>
  );
}
