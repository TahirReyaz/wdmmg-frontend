"use client";

import { errorMessage } from "@/api/client";
import { useResolveOccurrence } from "@/hooks/useRecurring";
import type { Occurrence } from "@/types";
import { formatRelativeDay } from "@/utils/format";
import { Button } from "../ui/Button";
import { Menu } from "../ui/Menu";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";

function dueText(iso: string) {
  const rel = formatRelativeDay(iso);
  return rel === "Today" || rel === "Yesterday" ? rel.toLowerCase() : rel;
}

/** Due recurring expenses waiting for the user's decision. */
export function DueList({ items, onAdjust, limit }: { items: Occurrence[]; onAdjust: (o: Occurrence) => void; limit?: number }) {
  const resolve = useResolveOccurrence();
  const toast = useToast();
  const rows = limit ? items.slice(0, limit) : items;

  function decide(o: Occurrence, action: "confirm" | "skip") {
    resolve.mutate(
      { occurrenceId: o.id, action },
      {
        onSuccess: () => toast.success(action === "confirm" ? "Added to your expenses" : "Skipped this time", { description: o.name }),
        onError: (err) => toast.error(action === "confirm" ? "Couldn't add the expense" : "Couldn't skip", { description: errorMessage(err) }),
      },
    );
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base text-fg">{o.name}</span>
            <span className="block truncate text-sm text-fg-3">
              Due {dueText(o.dueDate)} · {o.category.name}
            </span>
          </span>
          <Money value={o.amount} className="text-base font-medium" />
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => decide(o, "skip")}>
              Skip
            </Button>
            <Button size="sm" variant="primary" onClick={() => decide(o, "confirm")}>
              Add
            </Button>
            <Menu label={`More options for ${o.name}`} items={[{ label: "Change amount or date…", onSelect: () => onAdjust(o) }]} />
          </div>
        </li>
      ))}
    </ul>
  );
}
