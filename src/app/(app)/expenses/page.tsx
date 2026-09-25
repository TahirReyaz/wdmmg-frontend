"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { expensesApi, type ExpenseQuery } from "@/api/expenses";
import { DateRangeSelect } from "@/components/common/DateRangeSelect";
import { useExpenseComposer } from "@/components/expenses/ExpenseComposer";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { GroupShareList } from "@/components/expenses/GroupShareList";
import { RecurringView } from "@/components/recurring/RecurringView";
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
import { useDeleteExpense, useExpenses, usePendingExpenseIds } from "@/hooks/useExpenses";
import { usePendingOccurrences } from "@/hooks/useRecurring";
import { useRangeState } from "@/hooks/useRangeState";
import type { Expense, PaymentMethod, RecurringExpense } from "@/types";
import { presetPhrase } from "@/utils/dates";
import { PAYMENT_METHODS } from "@/utils/format";

type View = "personal" | "shares" | "recurring";
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

  // Deep link from notifications: /expenses?view=recurring
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "recurring" || v === "shares") setView(v);
  }, []);
  const { preset, custom, range, set: setRange } = useRangeState("this-month");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date:desc");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const q = useDebouncedValue(search.trim(), 300);

  const [sortField, sortDir] = sort.split(":") as ["date" | "amount", "asc" | "desc"];
  const query: ExpenseQuery = useMemo(
    () => ({ from: range.from, to: range.to, categoryId, paymentMethod: method, q, page, size: PAGE_SIZE, sort: sortField, dir: sortDir }),
    [range, categoryId, method, q, page, sortField, sortDir],
  );

  // Any filter change starts from the first page.
  useEffect(() => setPage(0), [range, categoryId, method, q, sort]);

  const expenses = useExpenses(query);
  const shares = useGroupShares(range);
  const pendingIds = usePendingExpenseIds();
  const remove = useDeleteExpense();

  const filtered = Boolean(categoryId || method || q);
  const clearFilters = () => {
    setCategoryId("");
    setMethod("");
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
        ]}
      />

      {view !== "recurring" && (
      <Toolbar>
        <DateRangeSelect preset={preset} custom={custom} onChange={setRange} />
        {view === "personal" && (
          <>
            <div className="grid grid-cols-2 gap-2 md:flex">
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

      {view === "recurring" ? (
        <TabPanel idBase="expenses" value="recurring">
          <RecurringView dialog={recurringDialog} setDialog={setRecurringDialog} />
        </TabPanel>
      ) : view === "personal" ? (
        <TabPanel idBase="expenses" value="personal">
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
              <PanelFooter>
                <Pagination page={page} size={PAGE_SIZE} total={expenses.data.totalElements} onPageChange={setPage} noun="expenses" />
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
