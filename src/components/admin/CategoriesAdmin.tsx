"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { useAdminCategories, usePatchCategory, useRemoveCategory } from "@/hooks/useCategories";
import type { AdminCategory } from "@/types";
import { cx } from "@/utils/cx";
import { CategoryLabel } from "../common/CategoryLabel";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialog";
import { Menu } from "../ui/Menu";
import { Panel, PanelHeader } from "../ui/Panel";
import { SkeletonTableRows } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { CategoryDialog } from "./CategoryDialog";

export function CategoriesAdmin() {
  const q = useAdminCategories();
  const patch = usePatchCategory();
  const remove = useRemoveCategory();
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState<{ open: boolean; category?: AdminCategory }>({ open: false });

  const rows = q.data ?? [];
  const active = rows.filter((c) => c.active);
  const retired = rows.filter((c) => !c.active);
  const nextOrder = (active.at(-1)?.sortOrder ?? 0) + 10;

  const fail = (title: string) => (err: unknown) => toast.error(title, { description: errorMessage(err) });

  /** Swap order with the neighbour – applied optimistically. */
  function move(c: AdminCategory, dir: -1 | 1) {
    const i = active.findIndex((x) => x.id === c.id);
    const other = active[i + dir];
    if (!other) return;
    const a = other.sortOrder === c.sortOrder ? c.sortOrder + dir : other.sortOrder;
    const b = c.sortOrder;
    patch.mutate({ ...c, sortOrder: a }, { onError: fail("Couldn't reorder") });
    patch.mutate({ ...other, sortOrder: b }, { onError: fail("Couldn't reorder") });
  }

  async function onRemove(c: AdminCategory) {
    const inUse = c.usageCount > 0;
    const ok = await confirm({
      title: inUse ? `Retire “${c.name}”?` : `Delete “${c.name}”?`,
      description: inUse
        ? `It's used by ${c.usageCount} ${c.usageCount === 1 ? "expense" : "expenses"}, so it will be hidden from pickers but kept on existing records and in analytics. You can restore it later.`
        : "Nobody has used this category yet, so it will be deleted permanently.",
      confirmLabel: inUse ? "Retire" : "Delete",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(c, {
      onSuccess: (res) => toast.success(res.result === "RETIRED" ? "Category retired" : "Category deleted", { description: c.name }),
      onError: fail("Couldn't remove category"),
    });
  }

  function restore(c: AdminCategory) {
    patch.mutate({ ...c, active: true, sortOrder: nextOrder }, { onSuccess: () => toast.success("Category restored", { description: c.name }), onError: fail("Couldn't restore category") });
  }

  const renderRow = (c: AdminCategory, index: number, list: AdminCategory[]) => (
    <TR key={c.id}>
      <TD className="w-20 pr-0">
        {c.active ? (
          <span className="flex">
            <IconButton size="sm" label={`Move ${c.name} up`} disabled={index === 0} onClick={() => move(c, -1)}>
              <ArrowUp className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton size="sm" label={`Move ${c.name} down`} disabled={index === list.length - 1} onClick={() => move(c, 1)}>
              <ArrowDown className="size-3.5" aria-hidden />
            </IconButton>
          </span>
        ) : null}
      </TD>
      <TD className={cx("max-w-0", !c.active && "text-fg-3")}>
        <CategoryLabel name={c.name} color={c.color} />
      </TD>
      <TD align="right" className="text-fg-2">
        {c.usageCount.toLocaleString()}
      </TD>
      <TD className="hidden sm:table-cell">{c.active ? <Badge tone="success">Active</Badge> : <Badge>Retired</Badge>}</TD>
      <TD className="pr-2 text-right">
        <Menu
          label={`Actions for ${c.name}`}
          items={
            c.active
              ? [
                  { label: "Edit", onSelect: () => setDialog({ open: true, category: c }) },
                  { label: c.usageCount > 0 ? "Retire" : "Delete", tone: "danger", separated: true, onSelect: () => onRemove(c) },
                ]
              : [
                  { label: "Restore", onSelect: () => restore(c) },
                  { label: "Edit", onSelect: () => setDialog({ open: true, category: c }) },
                ]
          }
        />
      </TD>
    </TR>
  );

  return (
    <>
      <Panel busy={q.isFetching && !q.isPending}>
        <PanelHeader
          title="Categories"
          description="The expense types everyone picks from. Order here is the order in pickers."
          actions={
            <Button variant="primary" size="sm" onClick={() => setDialog({ open: true })}>
              New category
            </Button>
          }
        />
        {q.isError && !q.data ? (
          <ErrorState compact title="Unable to load categories" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
        ) : !q.isPending && rows.length === 0 ? (
          <EmptyState title="No categories" description="Add the first category so people can classify their expenses." />
        ) : (
          <Table label="Categories">
            <THead>
              <tr>
                <TH className="w-20">
                  <span className="sr-only">Order</span>
                </TH>
                <TH>Name</TH>
                <TH align="right" className="w-28">
                  Used
                </TH>
                <TH className="hidden w-28 sm:table-cell">Status</TH>
                <TH className="w-12">
                  <span className="sr-only">Actions</span>
                </TH>
              </tr>
            </THead>
            <tbody>
              {q.isPending ? (
                <SkeletonTableRows rows={8} columns={[{ width: "60%" }, { width: "40%" }, { width: "40%", align: "right" }, { width: "60%", className: "hidden sm:table-cell" }, { width: "0%" }]} />
              ) : (
                <>
                  {active.map((c, i) => renderRow(c, i, active))}
                  {retired.length > 0 && (
                    <tr>
                      <td colSpan={5} className="border-b border-line bg-sunken px-4 py-1.5 text-xs font-medium tracking-wide text-fg-3 uppercase">
                        Retired · hidden from pickers
                      </td>
                    </tr>
                  )}
                  {retired.map((c, i) => renderRow(c, i, retired))}
                </>
              )}
            </tbody>
          </Table>
        )}
      </Panel>
      <CategoryDialog open={dialog.open} category={dialog.category} nextOrder={nextOrder} onClose={() => setDialog({ open: false })} />
    </>
  );
}
