"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { authApi } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/client";
import { OtpInput, type OtpInputHandle } from "@/components/auth/OtpInput";
import { AuthForm } from "@/components/layout/AuthForm";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormError } from "@/components/ui/States";
import { useAuth } from "@/providers/AuthProvider";

const LENGTH = 6;
/** Codes that mean "this code is dead – get a new one". */
const NEEDS_NEW_CODE = new Set(["CODE_EXPIRED", "TOO_MANY_ATTEMPTS"]);

function formatWait(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function VerifyEmailPage() {
  const { verifyEmail, status } = useAuth();
  const router = useRouter();
  const otp = useRef<OtpInputHandle>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [fromLogin, setFromLogin] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code: string | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [resending, setResending] = useState(false);
  const lastTried = useRef("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setEmail(p.get("email") ?? "");
    setFromLogin(p.get("from") === "login");
    setWait(Math.max(0, Number(p.get("wait") ?? (p.get("from") === "login" ? 60 : 0)) || 0));
  }, []);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  // Resend countdown.
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const submit = useCallback(
    async (value: string) => {
      if (!email || value.length !== LENGTH || busy) return;
      lastTried.current = value;
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await verifyEmail(email, value);
        router.replace("/");
      } catch (err) {
        const apiCode = err instanceof ApiError ? err.code : null;
        setError({ message: errorMessage(err, "Couldn't check the code."), code: apiCode });
        setCode("");
        setBusy(false);
        if (!apiCode || !NEEDS_NEW_CODE.has(apiCode)) window.setTimeout(() => otp.current?.focus(), 0);
      }
    },
    [email, busy, verifyEmail, router],
  );

  // Submit as soon as the last digit is in (once per distinct code).
  useEffect(() => {
    if (code.length === LENGTH && code !== lastTried.current) void submit(code);
  }, [code, submit]);

  async function resend() {
    if (!email || wait > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authApi.resendCode(email);
      setWait(res.resendAfterSeconds);
      setCode("");
      lastTried.current = "";
      setNotice(`New code sent. It expires in ${Math.round(res.codeExpiresInSeconds / 60)} minutes.`);
      otp.current?.focus();
    } catch (err) {
      setError({ message: errorMessage(err, "Couldn't send a new code."), code: err instanceof ApiError ? err.code : null });
    } finally {
      setResending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length < LENGTH) {
      setError({ message: `Enter all ${LENGTH} digits.`, code: null });
      otp.current?.focus();
      return;
    }
    lastTried.current = "";
    void submit(code);
  }

  const footer = (
    <>
      Wrong address?{" "}
      <Link href="/register" className="font-medium text-accent-text hover:underline hover:underline-offset-4">
        Sign up again
      </Link>{" "}
      or{" "}
      <Link href="/login" className="font-medium text-accent-text hover:underline hover:underline-offset-4">
        sign in
      </Link>
      .
    </>
  );

  // Before the query string is read – same geometry as the real form.
  if (email === null) {
    return (
      <div role="status" aria-label="Loading">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-7 grid grid-cols-6 gap-2">
          {Array.from({ length: LENGTH }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <Skeleton className="mt-5 h-9 w-full" />
      </div>
    );
  }

  if (!email) {
    return (
      <AuthForm title="Confirm your email" subtitle="We need to know which address to confirm." footer={footer}>
        <p className="text-base text-fg-2">Create an account or sign in, and we&apos;ll send a code to your email.</p>
      </AuthForm>
    );
  }

  const alreadyVerified = error?.code === "ALREADY_VERIFIED";
  const deadCode = error?.code != null && NEEDS_NEW_CODE.has(error.code);

  return (
    <AuthForm
      title="Check your email"
      subtitle={fromLogin ? "Your email isn't confirmed yet, so we've sent you a new code." : "Enter the 6-digit code we sent to confirm your address."}
      footer={footer}
    >
      <p className="-mt-3 mb-5 text-base text-fg-2">
        Sent to <span className="font-medium break-all text-fg">{email}</span>
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {notice && !error && (
          <p role="status" className="border-l-2 border-success bg-success-soft px-3 py-2 text-base text-success">
            {notice}
          </p>
        )}
        <FormError message={error?.message} />
        {alreadyVerified ? (
          <Button variant="primary" className="w-full" onClick={() => router.replace("/login")}>
            Go to sign in
          </Button>
        ) : (
          <>
            <OtpInput ref={otp} value={code} onChange={(v) => { setCode(v); if (error && !deadCode) setError(null); }} invalid={!!error && !deadCode} disabled={busy || deadCode} describedBy="otp-hint" />
            <p id="otp-hint" className="text-sm text-fg-3">
              The code expires 10 minutes after it&apos;s sent. Not in your inbox? Check spam or promotions.
            </p>
            <Button type="submit" variant="primary" className="w-full" loading={busy} loadingText="Checking…" disabled={deadCode}>
              Confirm email
            </Button>
          </>
        )}
      </form>
      {!alreadyVerified && (
        <div className="mt-5 flex items-center justify-between gap-3 text-base">
          <span className="text-fg-3">Didn&apos;t get a code?</span>
          {wait > 0 ? (
            <span className="tabular text-fg-3" aria-live="off">
              Resend in {formatWait(wait)}
            </span>
          ) : (
            <Button size="sm" variant={deadCode ? "primary" : "secondary"} onClick={resend} loading={resending} loadingText="Sending…">
              Send a new code
            </Button>
          )}
        </div>
      )}
    </AuthForm>
  );
}
