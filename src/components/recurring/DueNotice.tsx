"use client";

import Link from "next/link";
import { useState } from "react";
import { usePendingOccurrences } from "@/hooks/useRecurring";
import type { Occurrence } from "@/types";
import { Panel, PanelHeader } from "../ui/Panel";
import { ConfirmOccurrenceDialog } from "./ConfirmOccurrenceDialog";
import { DueList } from "./DueList";

/** Overview callout shown only when recurring expenses are waiting for confirmation. */
export function DueNotice() {
  const { data } = usePendingOccurrences();
  const [adjusting, setAdjusting] = useState<Occurrence | null>(null);
  const count = data?.length ?? 0;
  if (count === 0) return null;

  return (
    <Panel className="mb-6 border-l-2 border-l-accent">
      <PanelHeader
        title={count === 1 ? "1 recurring expense is due" : `${count} recurring expenses are due`}
        description="Confirm to add them to your spending."
        actions={
          count > 3 ? (
            <Link href="/expenses?view=recurring" className="text-sm font-medium text-accent-text hover:underline hover:underline-offset-4">
              View all
            </Link>
          ) : undefined
        }
      />
      <DueList items={data ?? []} onAdjust={setAdjusting} limit={3} />
      <ConfirmOccurrenceDialog occurrence={adjusting} onClose={() => setAdjusting(null)} />
    </Panel>
  );
}
