"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/api/client";
import { useMarkRead } from "@/hooks/useNotifications";
import { useResolveOccurrence } from "@/hooks/useRecurring";
import type { AppNotification } from "@/types";
import { formatMoney, formatTimeAgo } from "@/utils/format";
import { cx } from "@/utils/cx";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

function detail(n: AppNotification): string | null {
  if (n.amount == null) return null;
  switch (n.type) {
    case "GROUP_EXPENSE":
      return `Your share ${formatMoney(n.amount)}`;
    case "PAYMENT_RECEIVED":
      return formatMoney(n.amount);
    case "RECURRING_DUE":
    case "EXPENSE_FROM_EMAIL":
      return formatMoney(n.amount);
    default:
      return null;
  }
}

/** One row in the notification feed. Recurring reminders can be confirmed or skipped in place. */
export function NotificationItem({ n }: { n: AppNotification }) {
  const router = useRouter();
  const markRead = useMarkRead();
  const resolve = useResolveOccurrence();
  const toast = useToast();

  const actionable = n.type === "RECURRING_DUE" && n.actionStatus === "PENDING" && n.refId != null;
  const meta = detail(n);

  function open() {
    if (!n.read) markRead.mutate(n);
    if (n.link) router.push(n.link);
  }

  function decide(action: "confirm" | "skip") {
    if (n.refId == null) return;
    resolve.mutate(
      { occurrenceId: n.refId, action },
      {
        onSuccess: () => toast.success(action === "confirm" ? "Added to your expenses" : "Skipped this time"),
        onError: (err) => toast.error(action === "confirm" ? "Couldn't add the expense" : "Couldn't skip", { description: errorMessage(err) }),
      },
    );
  }

  return (
    <li className={cx("relative flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center", !n.read && "bg-accent-soft/40")}>
      {!n.read && <span className="absolute top-5 left-2 size-1.5 bg-accent" aria-hidden />}
      <button type="button" onClick={open} className="min-w-0 flex-1 cursor-pointer text-left">
        <span className={cx("block text-base", n.read ? "text-fg-2" : "font-medium text-fg")}>
          {!n.read && <span className="sr-only">Unread: </span>}
          {n.title}
        </span>
        <span className="mt-0.5 block text-sm text-fg-3">
          {meta && <span className="tabular text-fg-2">{meta}</span>}
          {meta && " · "}
          {formatTimeAgo(n.createdAt)}
        </span>
      </button>
      {n.type === "SALARY_DUE" && !n.read && (
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="primary" onClick={open}>
            Add salary
          </Button>
        </div>
      )}
      {n.type === "RECURRING_DUE" && (
        <div className="flex shrink-0 items-center gap-2">
          {actionable ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => decide("skip")} disabled={resolve.isPending}>
                Skip
              </Button>
              <Button size="sm" variant="primary" onClick={() => decide("confirm")} loading={resolve.isPending && resolve.variables?.action === "confirm"} loadingText="Adding…">
                Add expense
              </Button>
            </>
          ) : n.actionStatus === "CONFIRMED" ? (
            <Badge tone="success">Added</Badge>
          ) : n.actionStatus === "SKIPPED" ? (
            <Badge>Skipped</Badge>
          ) : null}
        </div>
      )}
    </li>
  );
}
