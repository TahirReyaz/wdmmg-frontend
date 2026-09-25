"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { AuthForm } from "@/components/layout/AuthForm";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormError } from "@/components/ui/States";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "expired") setNotice("Your session expired. Sign in again to continue.");
  }, []);

  const errors = {
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter a valid email address." : undefined,
    password: !password ? "Enter your password." : undefined,
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errors.email || errors.password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      // Account exists but the address was never confirmed – a fresh code is on its way.
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&from=login`);
        return;
      }
      setError(errorMessage(err, "Couldn't sign you in."));
      setBusy(false);
    }
  }

  return (
    <AuthForm
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-accent-text hover:underline hover:underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {notice && !error && <p className="border-l-2 border-info bg-info-soft px-3 py-2 text-base text-info">{notice}</p>}
        <FormError message={error} />
        <Field label="Email" error={submitted ? errors.email : undefined}>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" error={submitted ? errors.password : undefined}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" className="mt-1 w-full" loading={busy} loadingText="Signing in…">
          Sign in
        </Button>
      </form>
    </AuthForm>
  );
}
