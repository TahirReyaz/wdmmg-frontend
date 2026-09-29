"use client";

import { Check, Copy, QrCode as QrIcon, Smartphone } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useSettle } from "@/hooks/useGroups";
import { useAuth } from "@/providers/AuthProvider";
import type { UserSummary } from "@/types";
import { todayISO } from "@/utils/dates";
import { currencySymbol, formatMoney } from "@/utils/format";
import { buildUpiLink, isMobileDevice, upiSupported } from "@/utils/upi";
import { QrCode } from "../common/QrCode";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { AmountInput, Field, Input, Select } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

export interface SettleDraft {
  /** Member the signed-in user paid. */
  to: number;
  amount?: number;
}

/** Records a payment the signed-in user made to another member. */
export function SettleDialog({
  open,
  onClose,
  groupId,
  groupName,
  members,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  groupId: number;
  groupName?: string;
  members: UserSummary[];
  draft: SettleDraft | null;
}) {
  const { user } = useAuth();
  const settle = useSettle(groupId);
  const toast = useToast();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchedUpi, setLaunchedUpi] = useState(false);

  useEffect(() => {
    if (!open || !draft) return;
    setTo(String(draft.to));
    setAmount(draft.amount ? draft.amount.toFixed(2) : "");
    setDate(todayISO());
    setNote("");
    setSubmitted(false);
    setError(null);
    setLaunchedUpi(false);
  }, [open, draft]);

  const recipients = members.filter((m) => m.id !== user?.id);
  const recipient = recipients.find((m) => String(m.id) === to);
  const recipientName = recipient?.name ?? "";
  const value = Number(amount);
  const errors = {
    to: !to ? "Choose who you paid." : undefined,
    amount: !(value > 0) ? "Enter an amount greater than zero." : undefined,
  };
  const valid = !errors.to && !errors.amount;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || settle.isPending) return;
    setError(null);
    try {
      await settle.mutateAsync({ toUserId: Number(to), amount: value, date, note: note.trim() || undefined });
      toast.success("Payment recorded", { description: `You paid ${recipientName} ${formatMoney(value)}` });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record a payment" description="Log money you paid back to someone in this group. They’ll be notified and balances update right away." size={upiSupported && recipient?.upiId ? "md" : "sm"} dismissible={!settle.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="You paid" error={submitted ? errors.to : undefined}>
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="" disabled>
              Select a member
            </option>
            {recipients.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={submitted ? errors.amount : undefined}>
            <AmountInput prefix={currencySymbol} value={amount} onChange={(e) => setAmount(e.target.value)} data-autofocus />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" optional>
          <Input value={note} maxLength={255} placeholder="e.g. UPI transfer" onChange={(e) => setNote(e.target.value)} />
        </Field>
        {upiSupported && recipient && (
          <UpiPay
            payee={recipient}
            amount={value > 0 ? value : undefined}
            groupName={groupName}
            launched={launchedUpi}
            onLaunch={() => {
              setLaunchedUpi(true);
              setNote((n) => n || "Paid via UPI");
            }}
          />
        )}
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={settle.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={settle.isPending} loadingText="Recording…">
            Record payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * "Pay with UPI" block. On a phone it opens the UPI app through a upi://pay link; on a
 * desktop it shows the same link as a QR code to scan with the phone. UPI apps can't
 * report back to a web page, so the payer still records the payment with the form.
 */
function UpiPay({
  payee,
  amount,
  groupName,
  launched,
  onLaunch,
}: {
  payee: UserSummary;
  amount?: number;
  groupName?: string;
  launched: boolean;
  onLaunch: () => void;
}) {
  const toast = useToast();
  const [mobile, setMobile] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  // Decided after mount so server and client render the same markup.
  useEffect(() => {
    const m = isMobileDevice();
    setMobile(m);
    setShowQr(!m);
  }, []);

  if (!payee.upiId) {
    return (
      <p className="border border-line bg-sunken px-3.5 py-3 text-sm text-fg-3">
        {payee.name} hasn’t added a UPI ID yet, so pay them the usual way and record it here. They can add one in{" "}
        <span className="text-fg-2">Settings → Profile</span>.
      </p>
    );
  }

  const vpa = payee.upiId;
  const link = buildUpiLink({ vpa, name: payee.name, amount, note: groupName ? `Settle up: ${groupName}` : "Settle up" });
  const amountText = amount ? formatMoney(amount) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy", { description: vpa });
    }
  }

  return (
    <section aria-label="Pay with UPI" className="border border-line bg-sunken p-3.5">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
        {showQr &&
          (amount ? (
            <QrCode value={link} size={152} label={`UPI QR code to pay ${payee.name} ${amountText}`} className="self-center border border-line sm:self-start" />
          ) : (
            <div className="flex size-[152px] shrink-0 items-center justify-center self-center border border-dashed border-line-strong p-3 text-center text-sm text-fg-3 sm:self-start">
              Enter an amount to get a QR code
            </div>
          ))}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div>
            <p className="text-base font-medium text-fg">Pay with UPI</p>
            <p className="mt-0.5 text-sm text-fg-3">
              {showQr
                ? `Scan with any UPI app (GPay, PhonePe, Paytm, BHIM…) to pay ${payee.name}${amount ? ` ${amountText}` : ""}.`
                : `Opens your UPI app with ${payee.name}'s UPI ID${amount ? " and the amount" : ""} filled in.`}
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="truncate font-mono text-fg-2" title={vpa}>
              {vpa}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center text-fg-3 hover:bg-surface hover:text-fg"
              aria-label={copied ? "UPI ID copied" : "Copy UPI ID"}
              title={copied ? "Copied" : "Copy UPI ID"}
            >
              {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mobile && (
              amount ? (
                <a
                  href={link}
                  onClick={onLaunch}
                  className="inline-flex h-9 items-center justify-center gap-1.5 border border-accent bg-accent px-3.5 text-base font-medium whitespace-nowrap text-accent-fg hover:border-accent-hover hover:bg-accent-hover"
                >
                  <Smartphone className="size-4" aria-hidden />
                  Pay {amountText} in UPI app
                </a>
              ) : (
                <span className="text-sm text-fg-3">Enter an amount to pay with UPI.</span>
              )
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowQr((v) => !v)} leading={<QrIcon className="size-3.5" aria-hidden />}>
              {showQr ? "Hide QR code" : "Show QR code"}
            </Button>
          </div>
          <p className={launched ? "text-sm font-medium text-fg-2" : "text-sm text-fg-3"}>
            {launched ? "Paid? Press Record payment below so balances update." : "UPI apps don’t tell us when a payment goes through, so record it below after paying."}
          </p>
        </div>
      </div>
    </section>
  );
}
