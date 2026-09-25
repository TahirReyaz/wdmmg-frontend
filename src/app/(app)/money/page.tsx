"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GoalDialog } from "@/components/goals/GoalDialog";
import { GoalsView } from "@/components/goals/GoalsView";
import { PageHeader } from "@/components/layout/PageHeader";
import { IncomeDialog } from "@/components/money/IncomeDialog";
import { IncomeList } from "@/components/money/IncomeList";
import { MoneyLedger } from "@/components/money/MoneyLedger";
import { MoneyMetrics } from "@/components/money/MoneyMetrics";
import { OpeningBalanceDialog } from "@/components/money/OpeningBalanceDialog";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ErrorState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useGoals } from "@/hooks/useGoals";
import { useMoneySummary } from "@/hooks/useMoney";
import type { Goal, Income } from "@/types";
import { formatMoney } from "@/utils/format";

type View = "activity" | "income" | "goals";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function MoneyPage() {
  const summary = useMoneySummary();
  const goals = useGoals();
  const [view, setView] = useState<View>("activity");
  const [income, setIncome] = useState<{ open: boolean; item?: Income }>({ open: false });
  const [goal, setGoal] = useState<{ open: boolean; item?: Goal }>({ open: false });
  const [opening, setOpening] = useState(false);

  // Deep links: /money?tab=goals
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "income" || t === "goals") setView(t);
  }, []);

  const s = summary.data;
  const activeGoals = goals.data?.filter((g) => !g.reached).length;

  return (
    <>
      <PageHeader
        title="Money"
        description="What's in your account, what came in, and what you're saving for."
        actions={
          <>
            <Button
              onClick={() => {
                setView("goals");
                setGoal({ open: true });
              }}
            >
              New goal
            </Button>
            <Button variant="primary" onClick={() => setIncome({ open: true })} leading={<Plus className="size-4" aria-hidden />}>
              Add income
            </Button>
          </>
        }
      />

      {summary.isError && !s ? (
        <Panel>
          <ErrorState compact title="Couldn't load your balance" error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
        </Panel>
      ) : (
        <MoneyMetrics
          data={s}
          loading={summary.isPending}
          refreshing={summary.isFetching && !summary.isPending}
          goalCount={goals.data?.length}
          onSetup={() => setOpening(true)}
        />
      )}

      {s && !s.configured && (
        <div className="mt-4 flex flex-col gap-3 border border-line border-l-2 border-l-accent bg-surface px-5 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-fg">Match this to your bank</p>
            <p className="text-sm text-fg-3">
              Right now the balance is built only from what you&apos;ve logged here. Enter today&apos;s balance from your bank app and it&apos;ll stay accurate from then on.
            </p>
          </div>
          <Button size="sm" onClick={() => setOpening(true)}>
            Set starting balance
          </Button>
        </div>
      )}

      <Tabs
        idBase="money"
        label="Money views"
        className="mt-6 mb-4"
        value={view}
        onChange={setView}
        items={[
          { value: "activity", label: "Activity" },
          { value: "income", label: "Income" },
          { value: "goals", label: "Goals", count: activeGoals || undefined },
        ]}
      />

      <TabPanel idBase="money" value={view}>
        {view === "activity" && <MoneyLedger onAddIncome={() => setIncome({ open: true })} />}

        {view === "income" && (
          <>
            <IncomeList onAdd={() => setIncome({ open: true })} onEdit={(item) => setIncome({ open: true, item })} />
            {s && (
              <p className="mt-3 text-sm text-fg-3">
                {s.salaryReminder ? `You're asked about your salary on the ${ordinal(s.salaryDay)} of each month. ` : "Monthly salary reminders are off. "}
                <Link href="/settings#salary" className="font-medium text-accent-text hover:underline hover:underline-offset-4">
                  Change
                </Link>
              </p>
            )}
          </>
        )}

        {view === "goals" && (
          <>
            {s && goals.data && goals.data.length > 0 && (
              <p className="mb-4 text-sm text-fg-3">
                {formatMoney(s.setAside)} set aside · {formatMoney(s.available)} left to spend
              </p>
            )}
            <GoalsView available={s?.available} onCreate={() => setGoal({ open: true })} onEdit={(item) => setGoal({ open: true, item })} />
          </>
        )}
      </TabPanel>

      <IncomeDialog open={income.open} item={income.item} onClose={() => setIncome({ open: false })} />
      <GoalDialog open={goal.open} goal={goal.item} onClose={() => setGoal({ open: false })} />
      <OpeningBalanceDialog open={opening} summary={s} onClose={() => setOpening(false)} />
    </>
  );
}
