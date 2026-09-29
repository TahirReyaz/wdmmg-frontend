import { CURRENCY } from "./format";

/** Mirrors the backend check in UpiIds.java: handle@psp, e.g. yourname@okhdfcbank. */
const VPA = /^[A-Za-z0-9][A-Za-z0-9._-]{1,255}@[A-Za-z][A-Za-z0-9]{1,63}$/;

export const UPI_HINT = "Looks like name@bank, e.g. yourname@okhdfcbank";

/** Validation message for an optional UPI ID field, or undefined when fine (blank is fine). */
export function upiIdError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (v.length > 100) return "That's too long for a UPI ID.";
  return VPA.test(v) ? undefined : "Enter a UPI ID like yourname@okhdfcbank.";
}

export const normalizeUpiId = (value: string) => value.trim().toLowerCase() || null;

/** UPI only moves rupees, so the pay action is shown only when the app runs in INR. */
export const upiSupported = CURRENCY === "INR";

/**
 * Builds a UPI deep link (NPCI "upi://pay" intent). Opening it on a phone launches the
 * installed UPI app with the payee, amount and note filled in; the same link as a QR code
 * can be scanned by any UPI app.
 */
export function buildUpiLink({ vpa, name, amount, note }: { vpa: string; name: string; amount?: number; note?: string }) {
  const params: [string, string][] = [
    ["pa", vpa.trim().toLowerCase()],
    ["pn", name.trim().slice(0, 50)],
  ];
  if (amount && amount > 0) params.push(["am", amount.toFixed(2)]);
  params.push(["cu", "INR"]);
  const tn = note?.trim().slice(0, 80);
  if (tn) params.push(["tn", tn]);
  return "upi://pay?" + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

/** Phones and tablets get the "open UPI app" button; desktops get a QR code to scan. */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}
