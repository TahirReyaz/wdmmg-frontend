"use client";

import type { MoneySummary } from "@/types";
import { formatDate, formatMoney } from "@/utils/format";
import { Metric, MetricStrip } from "../common/Metric";
import { Money } from "../ui/Money";

/** Balance → minus goals → available, plus this month's flow. */
export function MoneyMetrics({
  data,
  loading,
  refreshing,
  goalCount,
  onSetup,
}: {
  data?: MoneySummary;
  loading: boolean;
  refreshing?: boolean;
  goalCount?: number;
  onSetup?: () => void;
}) {
  const net = data ? data.monthIn - data.monthOut : 0;
  return (
    <MetricStrip label="Your money" busy={refreshing}>
      <Metric
        loading={loading}
        label="Bank balance"
        value={data ? <Money value={data.balance} className={data.balance < 0 ? "text-danger" : undefined} /> : null}
        meta={
          data?.configured && data.openingDate ? (
            <>
              Since {formatDate(data.openingDate)}
              {onSetup && (
                <>
                  {" · "}
                  <button type="button" onClick={onSetup} className="cursor-pointer font-medium text-accent-text hover:underline hover:underline-offset-4">
                    Adjust
                  </button>
                </>
              )}
            </>
          ) : onSetup ? (
            <button type="button" onClick={onSetup} className="cursor-pointer font-medium text-accent-text hover:underline hover:underline-offset-4">
              Set starting balance
            </button>
          ) : (
            "From everything you've logged"
          )
        }
      />
      <Metric
        loading={loading}
        label="Set aside for goals"
        value={data ? <Money value={data.setAside} /> : null}
        meta={goalCount == null ? "In savings goals" : goalCount === 0 ? "No goals yet" : `Across ${goalCount} ${goalCount === 1 ? "goal" : "goals"}`}
      />
      <Metric
        loading={loading}
        label="Available to spend"
        value={data ? <Money value={data.available} className={data.available < 0 ? "text-danger" : undefined} /> : null}
        meta={data && data.available < 0 ? <span className="text-danger">Goals hold more than your balance</span> : "Balance minus goals"}
      />
      <Metric
        loading={loading}
        label="This month"
        value={data ? <Money value={net} signed /> : null}
        meta={data ? `In ${formatMoney(data.monthIn)} · Out ${formatMoney(data.monthOut)}` : null}
      />
    </MetricStrip>
  );
}
