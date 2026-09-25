"use client";

import Link from "next/link";
import { useGoals } from "@/hooks/useGoals";
import { useMoneySummary } from "@/hooks/useMoney";
import { formatMoney } from "@/utils/format";
import { Money } from "../ui/Money";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fg-3">{label}</dt>
      <dd className="mt-0.5 text-md font-semibold text-fg">{children}</dd>
    </div>
  );
}

/** One-line money status for the overview: balance → set aside → available, plus the nearest goal. */
export function MoneyGlance() {
  const summary = useMoneySummary();
  const goals = useGoals();
  const s = summary.data;
  const next = goals.data?.filter((g) => !g.reached).sort((a, b) => b.progressPct - a.progressPct)[0];

  if (summary.isError && !s) {
    return (
      <Panel className="mb-6">
        <ErrorState compact title="Couldn't load your balance" error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
      </Panel>
    );
  }

  return (
    <Panel className="mb-6" busy={summary.isFetching && !summary.isPending} aria-labelledby="money-glance">
      <h2 id="money-glance" className="sr-only">
        Your money
      </h2>
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:gap-8">
        <dl className="grid flex-1 grid-cols-3 gap-4">
          {summary.isPending ? (
            [0, 1, 2].map((i) => (
              <div key={i} aria-hidden>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-5 w-24" />
              </div>
            ))
          ) : s ? (
            <>
              <Figure label="Bank balance">
                <Money value={s.balance} className={s.balance < 0 ? "text-danger" : undefined} />
              </Figure>
              <Figure label="Set aside">
                <Money value={s.setAside} />
              </Figure>
              <Figure label="Available">
                <Money value={s.available} className={s.available < 0 ? "text-danger" : undefined} />
              </Figure>
            </>
          ) : null}
        </dl>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3 lg:w-80 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          {goals.isPending ? (
            <div className="flex-1" aria-hidden>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-2 h-1.5 w-full" />
            </div>
          ) : next ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg-2">
                <span className="font-medium text-fg">{next.name}</span> · {formatMoney(next.remaining)} to go
              </p>
              <div className="mt-2 h-1.5 w-full bg-sunken" aria-hidden>
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, next.progressPct)}%` }} />
              </div>
            </div>
          ) : (
            <p className="flex-1 text-sm text-fg-3">{s && !s.configured ? "Set your starting balance to match your bank." : "Saving for something? Create a goal."}</p>
          )}
          <Link href={next ? "/money?tab=goals" : "/money"} className="shrink-0 text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
            Open money
          </Link>
        </div>
      </div>
    </Panel>
  );
}
