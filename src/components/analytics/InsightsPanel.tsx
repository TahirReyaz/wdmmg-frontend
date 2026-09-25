"use client";

import { errorMessage } from "@/api/client";
import { useRefreshInsights, useSpendInsights } from "@/hooks/useAnalytics";
import type { Insight, InsightKind, InsightSentiment } from "@/types";
import type { DateRange } from "@/utils/dates";
import { formatTimeAgo } from "@/utils/format";
import { cx } from "@/utils/cx";
import { Button } from "../ui/Button";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../ui/Panel";
import { LoadingRegion, Skeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";

const KIND: Record<InsightKind, string> = {
  TREND: "Trend",
  CATEGORY: "Category",
  HABIT: "Habit",
  ANOMALY: "One-off",
  GROUP: "Groups",
};

/** Tone is always spelled out in words too – never colour alone. */
const TONE: Record<InsightSentiment, { bar: string; label: string | null; text: string }> = {
  POSITIVE: { bar: "border-success", label: "Good sign", text: "text-success" },
  NEGATIVE: { bar: "border-danger", label: "Worth watching", text: "text-danger" },
  NEUTRAL: { bar: "border-line-strong", label: null, text: "" },
};

function InsightItem({ item }: { item: Insight }) {
  const tone = TONE[item.sentiment] ?? TONE.NEUTRAL;
  return (
    <li className={cx("border-l-2 pl-3", tone.bar)}>
      <p className="text-xs font-medium tracking-wide text-fg-3 uppercase">
        {KIND[item.kind] ?? "Insight"}
        {tone.label && (
          <>
            {" · "}
            <span className={tone.text}>{tone.label}</span>
          </>
        )}
      </p>
      <p className="mt-0.5 text-base font-medium text-fg">{item.title}</p>
      <p className="mt-0.5 text-sm text-fg-2">{item.detail}</p>
    </li>
  );
}

/** Same geometry as the loaded panel, so nothing jumps when it arrives. */
function InsightsSkeleton() {
  return (
    <LoadingRegion label="Writing a summary of this period">
      <Skeleton className="h-5 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-3.5 w-full max-w-3xl" />
      <Skeleton className="mt-2 h-3.5 w-4/5 max-w-2xl" />
      <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-l-2 border-line pl-3">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2 h-3.5 w-40" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/**
 * Plain-language reading of the analytics on screen, written by Gemini from the same
 * figures. Hidden entirely when AI isn't set up or there's nothing to analyse.
 */
export function InsightsPanel({ range, includeGroups, className }: { range: DateRange; includeGroups: boolean; className?: string }) {
  const q = useSpendInsights(range, includeGroups);
  const refresh = useRefreshInsights(range, includeGroups);
  const toast = useToast();
  const d = q.data;

  if (d && d.status !== "READY") return null;

  const busy = refresh.isPending || (q.isFetching && !q.isPending);

  function onRefresh() {
    refresh.mutate(undefined, {
      onError: (err) => toast.error("Couldn't refresh the summary", { description: errorMessage(err) }),
    });
  }

  return (
    <Panel className={className} busy={busy} aria-labelledby="insights-title">
      <PanelHeader
        id="insights-title"
        title="Summary"
        description="Gemini's reading of the figures on this page"
        actions={
          d?.status === "READY" && (
            <Button size="sm" variant="ghost" onClick={onRefresh} loading={refresh.isPending} loadingText="Refreshing…">
              Refresh
            </Button>
          )
        }
      />
      <PanelBody>
        {q.isPending ? (
          <InsightsSkeleton />
        ) : q.isError && !d ? (
          <div role="alert" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base text-fg-2">{errorMessage(q.error, "Couldn't write a summary right now.")}</p>
            <Button size="sm" onClick={() => q.refetch()} loading={q.isFetching} loadingText="Retrying…">
              Try again
            </Button>
          </div>
        ) : d ? (
          <div aria-live="polite" className={cx("transition-opacity", busy && "opacity-70")}>
            {d.headline && <p className="text-lg font-semibold tracking-tight text-fg">{d.headline}</p>}
            {d.summary && <p className="mt-1.5 max-w-3xl text-base text-fg-2">{d.summary}</p>}
            {d.insights.length > 0 && (
              <ul className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
                {d.insights.map((item, i) => (
                  <InsightItem key={`${item.title}-${i}`} item={item} />
                ))}
              </ul>
            )}
            {d.suggestions.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-sm font-medium text-fg-2">Worth trying</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-base text-fg-2 marker:text-fg-3">
                  {d.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : null}
      </PanelBody>
      {d?.status === "READY" && d.generatedAt && (
        <PanelFooter>
          <p className="text-sm text-fg-3">
            Written {formatTimeAgo(d.generatedAt)}
            {d.model ? ` by ${d.model}` : ""}. AI can get things wrong, so check it against the charts.
          </p>
        </PanelFooter>
      )}
    </Panel>
  );
}
