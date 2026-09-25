"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useDismissSalary, useRecordSalary, useSalaryPrompt } from "@/hooks/useMoney";
import { todayISO } from "@/utils/dates";
import { currencySymbol, formatMoney } from "@/utils/format";
import { amountError } from "@/utils/validate";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";
import { monthName } from "./incomeTypes";

const SNOOZE_KEY = "wdmmg.salary-snooze";

function snoozedToday(): boolean {
  try {
    return window.localStorage.getItem(SNOOZE_KEY) === todayISO();
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(SNOOZE_KEY, todayISO());
  } catch {
    /* storage unavailable – the prompt just returns on the next load */
  }
}

/**
 * Monthly "how much salary did you get?" prompt.
 * Opens by itself once the salary day has passed and nothing's been logged,
 * or on demand via `?salary=1` (the reminder notification links there).
 */
export function SalaryPromptHost() {
  const prompt = useSalaryPrompt();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);

  const requested = params.get("salary") === "1";

  useEffect(() => {
    if (requested) {
      setForced(true);
      setOpen(true);
      return;
    }
    if (prompt.data?.due && !snoozedToday()) setOpen(true);
  }, [requested, prompt.data?.due]);

  function close() {
    setOpen(false);
    if (requested) {
      const next = new URLSearchParams(params.toString());
      next.delete("salary");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }

  if (!prompt.data) return null;
  return (
    <SalaryPromptDialog
      open={open}
      month={prompt.data.month}
      suggested={prompt.data.suggestedAmount}
      alreadyLogged={forced && !prompt.data.due}
      onLater={() => {
        snooze();
        close();
      }}
      onDone={close}
    />
  );
}

function SalaryPromptDialog({
  open,
  month,
  suggested,
  alreadyLogged,
  onLater,
  onDone,
}: {
  open: boolean;
  month: string;
  suggested: number | null;
  alreadyLogged: boolean;
  onLater: () => void;
  onDone: () => void;
}) {
  const record = useRecordSalary();
  const dismiss = useDismissSalary();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(suggested ? suggested.toFixed(2) : "");
    setDate(todayISO());
    setSubmitted(false);
    setError(null);
  }, [open, suggested]);

  const name = monthName(month);
  const errors = { amount: amountError(amount), date: !date ? "Pick the date it arrived." : undefined };
  const busy = record.isPending || dismiss.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errors.amount || errors.date || busy) return;
    setError(null);
    try {
      await record.mutateAsync({ amount: Number(amount), date });
      toast.success(`${name} salary added`, { description: `${formatMoney(Number(amount))} added to your balance.` });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Couldn't add your salary."));
    }
  }

  function notThisMonth() {
    dismiss.mutate(undefined, {
      onError: (err) => toast.error("Couldn't update the reminder", { description: errorMessage(err) }),
    });
    onDone();
  }

  return (
    <Dialog
      open={open}
      onClose={alreadyLogged ? onDone : onLater}
      title={alreadyLogged ? `Add more salary for ${name}` : `How much salary did you get for ${name}?`}
      description={
        alreadyLogged
          ? "Your salary for this month is already recorded. Add another payment only if you received more."
          : "It'll be added to your bank balance. You can change it later on the Money page."
      }
      size="sm"
      dismissible={!busy}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Amount received" error={submitted ? errors.amount : undefined} hint={suggested ? `Last time: ${formatMoney(suggested)}` : undefined}>
          <AmountInput prefix={currencySymbol} value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} data-autofocus />
        </Field>
        <Field label="Credited on" error={submitted ? errors.date : undefined}>
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:items-center">
          {!alreadyLogged && (
            <Button variant="ghost" onClick={notThisMonth} disabled={busy} className="sm:mr-auto">
              No salary this month
            </Button>
          )}
          <Button onClick={alreadyLogged ? onDone : onLater} disabled={busy} className={alreadyLogged ? "sm:ml-auto" : undefined}>
            {alreadyLogged ? "Cancel" : "Remind me later"}
          </Button>
          <Button type="submit" variant="primary" loading={record.isPending} loadingText="Adding…">
            Add salary
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
