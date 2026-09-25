"use client";

import { useState } from "react";
import type { FundsDirection } from "@/api/goals";
import { errorMessage } from "@/api/client";
import { useDeleteGoal, useGoals } from "@/hooks/useGoals";
import type { Goal } from "@/types";
import { formatDate, formatMoney } from "@/utils/format";
import { cx } from "@/utils/cx";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialog";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { Panel } from "../ui/Panel";
import { LoadingRegion, Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { useToast } from "../ui/Toast";
import { GoalFundsDialog } from "./GoalFundsDialog";
import { GoalHistoryDialog } from "./GoalHistoryDialog";

function Progress({ goal }: { goal: Goal }) {
  const pct = Math.max(0, Math.min(100, goal.progressPct));
  return (
    <div
      role="progressbar"
      aria-label={`${goal.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${formatMoney(goal.savedAmount)} of ${formatMoney(goal.targetAmount)}`}
      className="h-1.5 w-full bg-sunken"
    >
      <div className={cx("h-full transition-[width] duration-300 ease-out motion-reduce:transition-none", goal.reached ? "bg-success" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function schedule(goal: Goal): string {
  if (goal.reached) return "Target reached";
  if (!goal.targetDate) return `${formatMoney(goal.remaining)} to go`;
  const [y, m, d] = goal.targetDate.split("-").map(Number);
  const past = new Date(y, m - 1, d) < new Date(new Date().toDateString());
  if (past) return `${formatMoney(goal.remaining)} to go · target date passed`;
  return goal.monthlyNeeded != null
    ? `${formatMoney(goal.monthlyNeeded)}/month to reach it by ${formatDate(goal.targetDate)}`
    : `${formatMoney(goal.remaining)} to go by ${formatDate(goal.targetDate)}`;
}

function GoalCard({
  goal,
  onFunds,
  onEdit,
  onHistory,
  onDelete,
}: {
  goal: Goal;
  onFunds: (goal: Goal, d: FundsDirection) => void;
  onEdit: (goal: Goal) => void;
  onHistory: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}) {
  return (
    <li className="flex flex-col border border-line bg-surface">
      <div className="flex items-start gap-2 px-5 pt-4 pr-2">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-md font-semibold text-fg">
            <span className="truncate">{goal.name}</span>
            {goal.reached && <Badge tone="success">Reached</Badge>}
          </h3>
          <p className="mt-1 text-sm text-fg-3">{schedule(goal)}</p>
        </div>
        <Menu
          label={`Actions for ${goal.name}`}
          items={[
            { label: "Edit goal", onSelect: () => onEdit(goal) },
            { label: "History", onSelect: () => onHistory(goal) },
            { label: "Delete goal", tone: "danger", separated: true, onSelect: () => onDelete(goal) },
          ]}
        />
      </div>
      <div className="px-5 pt-4 pb-4">
        <p className="flex items-baseline justify-between gap-3">
          <Money value={goal.savedAmount} className="text-lg font-semibold tracking-tight text-fg" />
          <span className="tabular text-sm text-fg-3">
            of {formatMoney(goal.targetAmount)} · {Math.floor(goal.progressPct)}%
          </span>
        </p>
        <div className="mt-2.5">
          <Progress goal={goal} />
        </div>
      </div>
      <div className="mt-auto flex gap-2 border-t border-line px-5 py-3">
        <Button size="sm" variant={goal.reached ? "secondary" : "primary"} onClick={() => onFunds(goal, "ADD")}>
          Set aside
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onFunds(goal, "WITHDRAW")} disabled={goal.savedAmount <= 0}>
          Take back
        </Button>
      </div>
    </li>
  );
}

function GoalCardSkeleton() {
  return (
    <li className="border border-line bg-surface" aria-hidden>
      <div className="px-5 pt-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2.5 h-3 w-52" />
      </div>
      <div className="px-5 pt-5 pb-4">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-24 self-end" />
        </div>
        <Skeleton className="mt-3 h-1.5 w-full" />
      </div>
      <div className="flex gap-2 border-t border-line px-5 py-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </li>
  );
}

/** Savings goals: money earmarked out of the balance for something specific. */
export function GoalsView({ available, onCreate, onEdit }: { available: number | undefined; onCreate: () => void; onEdit: (goal: Goal) => void }) {
  const q = useGoals();
  const remove = useDeleteGoal();
  const confirm = useConfirm();
  const toast = useToast();
  const [funds, setFunds] = useState<{ goal: Goal; direction: FundsDirection } | null>(null);
  const [history, setHistory] = useState<Goal | null>(null);

  // Keep the dialog showing fresh figures after optimistic updates.
  const liveFundsGoal = funds ? (q.data?.find((g) => g.id === funds.goal.id) ?? funds.goal) : null;

  async function onDelete(goal: Goal) {
    const ok = await confirm({
      title: `Delete “${goal.name}”?`,
      description:
        goal.savedAmount > 0
          ? `The ${formatMoney(goal.savedAmount)} set aside goes back to available to spend. Your bank balance doesn't change.`
          : "Your bank balance doesn't change.",
      confirmLabel: "Delete goal",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(goal, {
      onSuccess: () => toast.success("Goal deleted"),
      onError: (err) => toast.error("Couldn't delete the goal", { description: errorMessage(err) }),
    });
  }

  if (q.isError && !q.data) {
    return (
      <Panel>
        <ErrorState title="Couldn't load your goals" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
      </Panel>
    );
  }

  if (q.data && q.data.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No savings goals yet"
          description="Put money aside for a trip, a new phone or an emergency fund. It stays in your account but won't show as available to spend."
          action={
            <Button variant="primary" size="sm" onClick={onCreate}>
              Create a goal
            </Button>
          }
        />
      </Panel>
    );
  }

  return (
    <>
      {q.isPending ? (
        <LoadingRegion label="Loading goals">
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <GoalCardSkeleton key={i} />
            ))}
          </ul>
        </LoadingRegion>
      ) : (
        <ul className={cx("grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3", q.isFetching && "opacity-90")} aria-busy={q.isFetching || undefined}>
          {(q.data ?? []).map((g) => (
            <GoalCard key={g.id} goal={g} onFunds={(goal, direction) => setFunds({ goal, direction })} onEdit={onEdit} onHistory={setHistory} onDelete={onDelete} />
          ))}
        </ul>
      )}
      <GoalFundsDialog goal={liveFundsGoal} direction={funds?.direction ?? "ADD"} available={available} onClose={() => setFunds(null)} />
      <GoalHistoryDialog goal={history} onClose={() => setHistory(null)} />
    </>
  );
}
