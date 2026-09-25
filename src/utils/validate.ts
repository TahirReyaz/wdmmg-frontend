/** Shared form checks for currency amounts typed as strings. */
export function amountError(value: string, { allowZero = false, max }: { allowZero?: boolean; max?: number } = {}): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter an amount.";
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return "Use a number with at most two decimal places.";
  const n = Number(trimmed);
  if (allowZero ? n < 0 : !(n > 0)) return allowZero ? "Amount can't be negative." : "Enter an amount greater than zero.";
  if (max != null && n > max + 0.0001) return `That's more than the ${max.toFixed(2)} available here.`;
  return undefined;
}

/** Signed amounts (e.g. an overdrawn opening balance). */
export function signedAmountError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter an amount.";
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return "Use a number with at most two decimal places.";
  return undefined;
}
