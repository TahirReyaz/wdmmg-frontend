"use client";

import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";
import { errorMessage } from "@/api/client";
import { useDeleteTag, useTags } from "@/hooks/useTags";
import type { Tag } from "@/types";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialog";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { Panel, PanelFooter } from "../ui/Panel";
import { LoadingRegion, SkeletonList, SkeletonTableRows } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { tagDateSpan } from "./tagUtils";

export const tagHref = (id: number) => `/expenses/tags/${id}`;

/** Tags tab on the Expenses page: every tag with its total, newest first. */
export function TagsView({ onCreate, onEdit }: { onCreate: () => void; onEdit: (tag: Tag) => void }) {
  const tags = useTags();
  const remove = useDeleteTag();
  const confirm = useConfirm();
  const toast = useToast();

  async function onDelete(tag: Tag) {
    const ok = await confirm({
      title: `Delete “${tag.name}”?`,
      description:
        tag.expenseCount > 0
          ? `Its ${tag.expenseCount} ${tag.expenseCount === 1 ? "expense stays" : "expenses stay"} in your history, just without this tag.`
          : "It isn't on any expenses yet.",
      confirmLabel: "Delete tag",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(tag.id, {
      onSuccess: () => toast.success("Tag deleted"),
      onError: (err) => toast.error("Couldn't delete tag", { description: errorMessage(err) }),
    });
  }

  const actions = (t: Tag) => [
    { label: "Edit", onSelect: () => onEdit(t) },
    { label: "Delete", onSelect: () => void onDelete(t), tone: "danger" as const, separated: true },
  ];

  if (tags.isError && !tags.data) {
    return (
      <Panel>
        <ErrorState title="Unable to load tags" error={tags.error} onRetry={() => tags.refetch()} retrying={tags.isFetching} />
      </Panel>
    );
  }

  const loading = tags.isPending;
  const rows = tags.data ?? [];
  if (!loading && rows.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No tags yet"
          description="Tags group expenses across categories. Make one for a trip, a wedding or a house move, add it to those expenses, and see what it cost in total."
          action={
            <Button variant="primary" onClick={onCreate} leading={<TagIcon className="size-3.5" aria-hidden />}>
              Create a tag
            </Button>
          }
        />
      </Panel>
    );
  }

  const grandTotal = rows.reduce((s, t) => s + t.total, 0);

  return (
    <Panel busy={tags.isFetching && !loading}>
      <div className="hidden md:block">
        <Table label="Your tags">
          <THead>
            <tr>
              <TH>Tag</TH>
              <TH className="w-56">Dates</TH>
              <TH align="right" className="w-28">
                Expenses
              </TH>
              <TH align="right" className="w-40">
                Total spent
              </TH>
              <TH className="w-12">
                <span className="sr-only">Actions</span>
              </TH>
            </tr>
          </THead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={4} columns={[{ width: "45%" }, { width: "60%" }, { width: "30%", align: "right" }, { width: "55%", align: "right" }, { width: "0%" }]} />
            ) : (
              rows.map((t) => (
                <TR key={t.id}>
                  <TD className="max-w-0">
                    <Link href={tagHref(t.id)} className="inline-flex max-w-full min-w-0 items-center gap-2 font-medium text-fg hover:underline hover:underline-offset-4">
                      <TagIcon className="size-3.5 shrink-0" style={{ color: t.color }} aria-hidden />
                      <span className="truncate">{t.name}</span>
                    </Link>
                  </TD>
                  <TD className="text-fg-2">{tagDateSpan(t)}</TD>
                  <TD align="right" className="tabular text-fg-2">
                    {t.expenseCount}
                  </TD>
                  <TD align="right" className="font-medium">
                    <Money value={t.total} />
                  </TD>
                  <TD className="pr-2 text-right">
                    <Menu items={actions(t)} label={`Actions for ${t.name}`} />
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <div className="md:hidden">
        {loading ? (
          <LoadingRegion label="Loading tags">
            <SkeletonList rows={4} />
          </LoadingRegion>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-2 pr-2 pl-4">
                <Link href={tagHref(t.id)} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5">
                  <TagIcon className="size-4 shrink-0" style={{ color: t.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-fg">{t.name}</span>
                    <span className="block truncate text-sm text-fg-3">
                      {t.expenseCount} {t.expenseCount === 1 ? "expense" : "expenses"} · {tagDateSpan(t)}
                    </span>
                  </span>
                  <Money value={t.total} className="text-base font-medium" />
                </Link>
                <Menu items={actions(t)} label={`Actions for ${t.name}`} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && rows.length > 1 && (
        <PanelFooter>
          <p className="text-sm text-fg-3">{rows.length} tags</p>
          <p className="text-sm text-fg-3">
            Tagged spending <Money value={grandTotal} className="ml-1 font-medium text-fg" />
          </p>
        </PanelFooter>
      )}
    </Panel>
  );
}
