"use client";

import { Download, Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { expensesApi, type ExpenseQuery } from "@/api/expenses";
import { DateRangeSelect } from "@/components/common/DateRangeSelect";
import { useExpenseComposer } from "@/components/expenses/ExpenseComposer";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { GroupShareList } from "@/components/expenses/GroupShareList";
import { RecurringView } from "@/components/recurring/RecurringView";
import { TagDialog } from "@/components/tags/TagDialog";
import { TagsView } from "@/components/tags/TagsView";
import { PageHeader, Toolbar } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SearchInput, Select } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useGroupShares } from "@/hooks/useAnalytics";
import { useActiveCategories } from "@/hooks/useCategories";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDeleteExpense, useExpenseTotal, useExpenses, usePendingExpenseIds } from "@/hooks/useExpenses";
import { usePendingOccurrences } from "@/hooks/useRecurring";
import { useRangeState } from "@/hooks/useRangeState";
import { useTags } from "@/hooks/useTags";
import type { Expense, PaymentMethod, RecurringExpense, Tag } from "@/types";
import { presetPhrase } from "@/utils/dates";
import { PAYMENT_METHODS } from "@/utils/format";

type View = "personal" | "shares" | "recurring" | "tags";
type SortKey = "date:desc" | "date:asc" | "amount:desc" | "amount:asc";
const PAGE_SIZE = 25;

export default function ExpensesPage() {
  const composer = useExpenseComposer();
  const confirm = useConfirm();
  const toast = useToast();
  const categories = useActiveCategories();

  const [view, setView] = useState<View>("personal");
  const [recurringDialog, setRecurringDialog] = useState<{ open: boolean; item?: RecurringExpense }>({ open: false });
  const due = usePendingOccurrences();
  const tags = useTags();
  const [tagDialog, setTagDialog] = useState<{ open: boolean; tag?: Tag }>({ open: false });

  const { preset, custom, range, set: setRange } = useRangeState("this-month");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [tagId, setTagId] = useState<number | "">("");

  // Deep links: /expenses?view=recurring|shares|tags, and /expenses?tag=12 (all of a tag's expenses).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "recurring" || v === "shares" || v === "tags") setView(v);
    const t = Number(params.get("tag"));
    if (t > 0) {
      setTagId(t);
      setRange("all", custom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date:desc");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const q = useDebouncedValue(search.trim(), 300);

  const [sortField, sortDir] = sort.split(":") as ["date" | "amount", "asc" | "desc"];
  const query: ExpenseQuery = useMemo(
    () => ({ from: range.from, to: range.to, categoryId, paymentMethod: method, tagId, q, page, size: PAGE_SIZE, sort: sortField, dir: sortDir }),
    [range, categoryId, method, tagId, q, page, sortField, sortDir],
  );

  // Any filter change starts from the first page.
  useEffect(() => setPage(0), [range, categoryId, method, tagId, q, sort]);

  const expenses = useExpenses(query);
  const totals = useExpenseTotal(query);
  const selectedTag = tagId ? tags.data?.find((t) => t.id === tagId) : undefined;
  const shares = useGroupShares(range);
  const pendingIds = usePendingExpenseIds();
  const remove = useDeleteExpense();

  const filtered = Boolean(categoryId || method || tagId || q);
  const clearFilters = () => {
    setCategoryId("");
    setMethod("");
    setTagId("");
    setSearch("");
  };

  async function onDelete(e: Expense) {
    const ok = await confirm({
      title: "Delete expense?",
      description: `“${e.name}” will be permanently removed. This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(e, {
      onSuccess: () => toast.success("Expense deleted"),
      onError: (err) => toast.error("Couldn't delete expense", { description: errorMessage(err) }),
    });
  }

  async function onExport() {
    setExporting(true);
    try {
      await expensesApi.exportCsv(query);
    } catch (err) {
      toast.error("Export failed", { description: errorMessage(err) });
    } finally {
      setExporting(false);
    }
  }

  const sharesTotal = shares.data?.reduce((s, x) => s + x.myShare, 0) ?? 0;
  // Filters changed and new results are on their way → show skeleton rows, keep the table frame.
  const listLoading = expenses.isPending || expenses.isPlaceholderData;

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Everything you've paid for, your share of group bills, and what repeats."
        actions={
          <>
            {view === "personal" && (
              <Button onClick={onExport} loading={exporting} loadingText="Exporting…" leading={<Download className="size-3.5" aria-hidden />}>
                Export CSV
              </Button>
            )}
            {view === "recurring" ? (
              <Button variant="primary" onClick={() => setRecurringDialog({ open: true })}>
                New recurring
              </Button>
            ) : view === "tags" ? (
              <Button variant="primary" onClick={() => setTagDialog({ open: true })}>
                New tag
              </Button>
            ) : (
              <Button variant="primary" onClick={() => composer.open()} className="max-md:hidden">
                New expense
              </Button>
            )}
          </>
        }
      />

      <Tabs
        idBase="expenses"
        label="Expense views"
        className="mb-4"
        value={view}
        onChange={setView}
        items={[
          { value: "personal", label: "Personal", count: expenses.data && !expenses.isPlaceholderData ? expenses.data.totalElements : undefined },
          { value: "shares", label: "Group shares", count: shares.data?.length },
          { value: "recurring", label: "Recurring", count: due.data?.length ? due.data.length : undefined },
          { value: "tags", label: "Tags", count: tags.data?.length ? tags.data.length : undefined },
        ]}
      />

      {(view === "personal" || view === "shares") && (
      <Toolbar>
        <DateRangeSelect preset={preset} custom={custom} onChange={setRange} />
        {view === "personal" && (
          <>
            <div className="grid grid-cols-2 gap-2 md:flex">
              {!!tags.data?.length && (
                <Select aria-label="Tag" className="col-span-2 md:w-40" value={tagId} onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Any tag</option>
                  {tags.data.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}
              <Select aria-label="Category" className="md:w-48" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">All categories</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select aria-label="Payment method" className="md:w-36" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}>
                <option value="">Any method</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2 md:ml-auto">
              <SearchInput className="flex-1 md:w-56" value={search} onChange={setSearch} placeholder="Search descriptions and notes" label="Search expenses" />
              <Select aria-label="Sort by" className="w-32 shrink-0" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="date:desc">Newest</option>
                <option value="date:asc">Oldest</option>
                <option value="amount:desc">Highest</option>
                <option value="amount:asc">Lowest</option>
              </Select>
            </div>
          </>
        )}
      </Toolbar>
      )}

      <TagDialog open={tagDialog.open} tag={tagDialog.tag} existingCount={tags.data?.length ?? 0} onClose={() => setTagDialog({ open: false })} />

      {view === "tags" ? (
        <TabPanel idBase="expenses" value="tags">
          <TagsView onCreate={() => setTagDialog({ open: true })} onEdit={(tag) => setTagDialog({ open: true, tag })} />
        </TabPanel>
      ) : view === "recurring" ? (
        <TabPanel idBase="expenses" value="recurring">
          <RecurringView dialog={recurringDialog} setDialog={setRecurringDialog} />
        </TabPanel>
      ) : view === "personal" ? (
        <TabPanel idBase="expenses" value="personal">
          {selectedTag && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border border-line bg-surface px-4 py-3" aria-live="polite">
              <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-base text-fg-2">
                <TagIcon className="size-4 shrink-0" style={{ color: selectedTag.color }} aria-hidden />
                <span className="font-medium text-fg">{selectedTag.name}</span>
                <span>{preset === "all" ? "in total:" : `· ${presetPhrase(preset)}:`}</span>
                <Money value={totals.data?.total ?? 0} className="font-semibold text-fg" />
                <span className="text-fg-3">
                  across {totals.data?.count ?? 0} {totals.data?.count === 1 ? "expense" : "expenses"}
                  {filtered && (categoryId || method || q) ? " matching your filters" : ""}
                </span>
              </p>
              <Link href={`/expenses/tags/${selectedTag.id}`} className="text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
                See breakdown
              </Link>
            </div>
          )}
          <Panel busy={expenses.isFetching && !listLoading}>
            {expenses.isError && !expenses.data ? (
              <ErrorState title="Unable to load expenses" error={expenses.error} onRetry={() => expenses.refetch()} retrying={expenses.isFetching} />
            ) : (
              <ExpenseList
                expenses={expenses.data?.content}
                loading={listLoading}
                pendingIds={pendingIds}
                onEdit={composer.open}
                onDelete={onDelete}
                skeletonRows={10}
                empty={
                  filtered ? (
                    <EmptyState
                      title="No matching expenses"
                      description="Nothing in this period matches your filters."
                      action={<Button size="sm" onClick={clearFilters}>Clear filters</Button>}
                    />
                  ) : (
                    <EmptyState
                      title="No expenses in this period"
                      description={`You haven't recorded anything for ${presetPhrase(preset)}. Try a wider range or add an expense.`}
                      action={<Button variant="primary" size="sm" onClick={() => composer.open()}>Add expense</Button>}
                    />
                  )
                }
              />
            )}
            {expenses.data && expenses.data.totalElements > 0 && (
              <PanelFooter className="flex-wrap">
                <Pagination page={page} size={PAGE_SIZE} total={expenses.data.totalElements} onPageChange={setPage} noun="expenses" />
                {totals.data && (
                  <p className="text-sm text-fg-3">
                    Total <Money value={totals.data.total} className="ml-1 font-medium text-fg" />
                  </p>
                )}
              </PanelFooter>
            )}
          </Panel>
        </TabPanel>
      ) : (
        <TabPanel idBase="expenses" value="shares">
          <Panel busy={shares.isFetching && !shares.isPending && !shares.isPlaceholderData}>
            {shares.isError && !shares.data ? (
              <ErrorState title="Unable to load group shares" error={shares.error} onRetry={() => shares.refetch()} retrying={shares.isFetching} />
            ) : (
              <GroupShareList
                items={shares.data}
                loading={shares.isPending || shares.isPlaceholderData}
                empty={
                  <EmptyState
                    title="No group expenses in this period"
                    description={
                      <>
                        When someone adds a shared bill in one of your <Link href="/groups" className="text-accent-text underline underline-offset-4">groups</Link>, your share shows up here.
                      </>
                    }
                  />
                }
              />
            )}
            {shares.data && shares.data.length > 0 && !shares.isPlaceholderData && (
              <PanelFooter>
                <p className="text-sm text-fg-3">{shares.data.length} shared expenses</p>
                <p className="text-sm text-fg-3">
                  Your share <Money value={sharesTotal} className="ml-1 font-medium text-fg" />
                </p>
              </PanelFooter>
            )}
          </Panel>
        </TabPanel>
      )}
    </>
  );
}
