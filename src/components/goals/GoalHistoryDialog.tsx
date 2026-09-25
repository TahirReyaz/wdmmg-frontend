"use client";

import { useGoalHistory } from "@/hooks/useGoals";
import type { Goal } from "@/types";
import { formatTimeAgo } from "@/utils/format";
import { Dialog } from "../ui/Dialog";
import { Money } from "../ui/Money";
import { LoadingRegion, SkeletonList } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";

export function GoalHistoryDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const q = useGoalHistory(goal?.id ?? null);
  return (
    <Dialog open={goal != null} onClose={onClose} title={goal ? `${goal.name} · history` : ""} description="The last 50 times money moved in or out of this goal.">
      <div className="-mx-5 -mb-4 max-h-[60vh] overflow-y-auto border-t border-line">
        {q.isPending ? (
          <LoadingRegion label="Loading history">
            <SkeletonList rows={4} />
          </LoadingRegion>
        ) : q.isError || !q.data ? (
          <ErrorState compact title="Couldn't load history" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
        ) : q.data.length === 0 ? (
          <EmptyState compact title="Nothing set aside yet" description="Money you add or take back will be listed here." />
        ) : (
          <ul className="divide-y divide-line">
            {q.data.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-fg">{c.note ?? (c.amount > 0 ? "Set aside" : "Taken back")}</span>
                  <span className="block text-sm text-fg-3">{formatTimeAgo(c.createdAt)}</span>
                </span>
                <Money value={c.amount} signed className="font-medium" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
