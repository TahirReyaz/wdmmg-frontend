"use client";

import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { expensesApi } from "@/api/expenses";
import { RankedBars } from "@/components/charts/RankedBars";
import { Metric, MetricStrip } from "@/components/common/Metric";
import { useExpenseComposer } from "@/components/expenses/ExpenseComposer";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { PageHeader } from "@/components/layout/PageHeader";
import { TagDialog } from "@/components/tags/TagDialog";
import { tagDateSpan } from "@/components/tags/tagUtils";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Pagination } from "@/components/ui/Pagination";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/Panel";
import { LoadingRegion, Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useDeleteExpense, useExpenses, usePendingExpenseIds } from "@/hooks/useExpenses";
import { useDeleteTag, useTagSummary } from "@/hooks/useTags";
import type { Expense, TagSlice } from "@/types";
import { formatMoney, paymentMethodLabel } from "@/utils/format";

const PAGE_SIZE = 25;

function Back() {
  return (
    <Link href="/expenses?view=tags" className="hover:text-fg hover:underline hover:underline-offset-4">
      Tags
    </Link>
  );
}

function Breakdown({ title, slices, total, label }: { title: string; slices: TagSlice[]; total: number; label: (s: TagSlice) => string }) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <PanelBody>
        {slices.length === 0 ? (
          <p className="text-base text-fg-3">Nothing yet.</p>
        ) : (
          <RankedBars
            rows={slices.map((s) => ({
              key: s.name,
              label: (
                <span className="inline-flex items-center gap-2">
                  {s.color && <span className="size-2 shrink-0" style={{ background: s.color }} aria-hidden />}
                  {label(s)}
                  <span className="text-sm text-fg-3">· {s.count}</span>
                </span>
              ),
              value: s.total,
              pct: total > 0 ? (s.total / total) * 100 : 0,
              color: s.color ?? undefined,
            }))}
          />
        )}
      </PanelBody>
    </Panel>
  );
}

export default function TagPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const composer = useExpenseComposer();
  const confirm = useConfirm();
  const toast = useToast();

  const summary = useTagSummary(id);
  const removeTag = useDeleteTag();
  const removeExpense = useDeleteExpense();
  const pendingIds = usePendingExpenseIds();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const expenses = useExpenses({ tagId: id, page, size: PAGE_SIZE, sort: "date", dir: "desc" });

  // A deleted expense can leave the current page empty.
  const lastPage = expenses.data ? Math.max(0, Math.ceil(expenses.data.totalElements / PAGE_SIZE) - 1) : 0;
  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  if (summary.isPending) {
    return (
      <LoadingRegion label="Loading tag">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="mt-3 mb-6 h-6 w-56" />
        <div className="border border-line bg-surface">
          <SkeletonList rows={6} />
        </div>
      </LoadingRegion>
    );
  }

  if (summary.isError || !summary.data) {
    const notFound = summary.error instanceof ApiError && summary.error.status === 404;
    return (
      <>
        <PageHeader eyebrow={<Back />} title={notFound ? "Tag not found" : "Tag"} />
        <Panel>
          <ErrorState
            title={notFound ? "This tag doesn't exist any more" : "Unable to load this tag"}
            error={notFound ? new Error("It may have been deleted. Go back to your tags.") : summary.error}
            onRetry={notFound ? undefined : () => summary.refetch()}
            retrying={summary.isFetching}
          />
        </Panel>
      </>
    );
  }

  const { tag, days, perDay, byCategory, byPaymentMethod } = summary.data;

  async function onDeleteExpense(e: Expense) {
    const ok = await confirm({
      title: "Delete expense?",
      description: `“${e.name}” will be permanently removed. This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    removeExpense.mutate(e, {
      onSuccess: () => toast.success("Expense deleted"),
      onError: (err) => toast.error("Couldn't delete expense", { description: errorMessage(err) }),
    });
  }

  async function onExport() {
    setExporting(true);
    try {
      await expensesApi.exportCsv({ tagId: id });
    } catch (err) {
      toast.error("Export failed", { description: errorMessage(err) });
    } finally {
      setExporting(false);
    }
  }

  const menu: MenuItem[] = [
    { label: "Edit tag", onSelect: () => setEditing(true) },
    { label: exporting ? "Exporting…" : "Export CSV", onSelect: () => void onExport() },
    {
      label: "Delete tag",
      tone: "danger",
      separated: true,
      onSelect: () =>
        void confirm({
          title: `Delete “${tag.name}”?`,
          description:
            tag.expenseCount > 0
              ? `Its ${tag.expenseCount} ${tag.expenseCount === 1 ? "expense stays" : "expenses stay"} in your history, just without this tag.`
              : "It isn't on any expenses yet.",
          confirmLabel: "Delete tag",
          pendingLabel: "Deleting…",
          tone: "danger",
          action: async () => {
            await removeTag.mutateAsync(id);
            toast.success("Tag deleted");
            router.replace("/expenses?view=tags");
          },
        }),
    },
  ];

  const listLoading = expenses.isPending || expenses.isPlaceholderData;

  return (
    <>
      <PageHeader
        eyebrow={<Back />}
        title={
          <span className="inline-flex min-w-0 items-center gap-2.5">
            <TagIcon className="size-5 shrink-0" style={{ color: tag.color }} aria-hidden />
            <span className="truncate">{tag.name}</span>
          </span>
        }
        description={tag.expenseCount > 0 ? `${tagDateSpan(tag)} · personal expenses with this tag` : "No expenses with this tag yet"}
        actions={
          <>
            <Button variant="primary" onClick={() => composer.open(undefined, { tagId: id })}>
              Add expense
            </Button>
            <Menu items={menu} label="Tag options" />
          </>
        }
      />

      <MetricStrip label={`${tag.name} summary`} busy={summary.isFetching}>
        <Metric label="Total spent" value={formatMoney(tag.total)} meta={`${tag.expenseCount} ${tag.expenseCount === 1 ? "expense" : "expenses"}`} />
        <Metric label="Biggest category" value={<span className="block truncate text-lg">{byCategory[0]?.name ?? "—"}</span>} meta={byCategory[0] ? formatMoney(byCategory[0].total) : undefined} />
        <Metric label="Days" value={days || "—"} meta={days ? "First to last expense" : undefined} />
        <Metric label="Per day" value={days ? formatMoney(perDay) : "—"} meta={days ? "Average over those days" : undefined} />
      </MetricStrip>

      {tag.expenseCount > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Breakdown title="By category" slices={byCategory} total={tag.total} label={(s) => s.name} />
          <Breakdown title="By payment method" slices={byPaymentMethod} total={tag.total} label={(s) => paymentMethodLabel(s.name)} />
        </div>
      )}

      <Panel className="mt-6" busy={expenses.isFetching && !listLoading}>
        <PanelHeader title="Expenses" description="Every expense with this tag, newest first" />
        {expenses.isError && !expenses.data ? (
          <ErrorState title="Unable to load expenses" error={expenses.error} onRetry={() => expenses.refetch()} retrying={expenses.isFetching} />
        ) : (
          <ExpenseList
            expenses={expenses.data?.content}
            loading={listLoading}
            pendingIds={pendingIds}
            onEdit={(e) => composer.open(e)}
            onDelete={onDeleteExpense}
            skeletonRows={6}
            empty={
              <EmptyState
                title="Nothing tagged yet"
                description="Add an expense here, or pick this tag when adding or editing any expense."
                action={
                  <Button variant="primary" size="sm" onClick={() => composer.open(undefined, { tagId: id })}>
                    Add expense
                  </Button>
                }
              />
            }
          />
        )}
        {expenses.data && expenses.data.totalElements > PAGE_SIZE && (
          <PanelFooter>
            <Pagination page={page} size={PAGE_SIZE} total={expenses.data.totalElements} onPageChange={setPage} noun="expenses" />
          </PanelFooter>
        )}
      </Panel>

      <TagDialog open={editing} tag={tag} onClose={() => setEditing(false)} />
    </>
  );
}
