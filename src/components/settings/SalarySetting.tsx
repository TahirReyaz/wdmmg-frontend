"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/api/client";
import { useMoneySummary, useSalarySettings } from "@/hooks/useMoney";
import { Field, Select, Switch } from "../ui/Field";
import { Skeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** Monthly "did your salary come in?" prompt: on/off and which day. Applies immediately. */
export function SalarySetting() {
  const summary = useMoneySummary();
  const save = useSalarySettings();
  const toast = useToast();
  const [reminder, setReminder] = useState(true);
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (!summary.data) return;
    setReminder(summary.data.salaryReminder);
    setDay(summary.data.salaryDay);
  }, [summary.data]);

  if (summary.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-9 w-40" />
      </div>
    );
  }

  function apply(next: { reminder: boolean; day: number }) {
    const prev = { reminder, day };
    setReminder(next.reminder);
    setDay(next.day);
    save.mutate(next, {
      onSuccess: () => toast.success(next.reminder ? "Salary reminder updated" : "Salary reminder turned off"),
      onError: (err) => {
        setReminder(prev.reminder);
        setDay(prev.day);
        toast.error("Couldn't update the reminder", { description: errorMessage(err) });
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Switch checked={reminder} onChange={(on) => apply({ reminder: on, day })} label="Ask me how much salary I received each month" disabled={save.isPending} />
      <Field label="Salary usually arrives on" hint="You'll be asked on this day, or when you next open the app after it. Days 1–28 only, so every month has one.">
        <Select value={day} onChange={(e) => apply({ reminder, day: Number(e.target.value) })} disabled={!reminder || save.isPending} className="max-w-40">
          {DAYS.map((d) => (
            <option key={d} value={d}>
              Day {d}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
