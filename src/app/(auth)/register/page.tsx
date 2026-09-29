"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { AuthForm } from "@/components/layout/AuthForm";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { FormError } from "@/components/ui/States";
import { useAuth } from "@/providers/AuthProvider";
import { upiIdError } from "@/utils/upi";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", upiId: "" });
  const [submitted, setSubmitted] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errors: Record<string, string | undefined> = {
    name: !form.name.trim() ? "Tell us what to call you." : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "Enter a valid email address." : undefined,
    password: form.password.length < 8 ? "Use at least 8 characters." : undefined,
    upiId: upiIdError(form.upiId),
  };
  const show = (k: keyof typeof form) => (submitted ? errors[k] : undefined) ?? serverFields[k];
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setServerFields((s) => ({ ...s, [k]: "" }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await register(form.name.trim(), form.email.trim(), form.password, form.upiId.trim().toLowerCase() || null);
      router.push(`/verify-email?email=${encodeURIComponent(res.email)}&wait=${res.resendAfterSeconds}`);
    } catch (err) {
      if (err instanceof ApiError) setServerFields(err.fieldErrors);
      setError(errorMessage(err, "Couldn't create your account."));
      setBusy(false);
    }
  }

  return (
    <AuthForm
      title="Create your account"
      subtitle="Track what you spend on your own and with others."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-text hover:underline hover:underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Name" error={show("name")}>
          <Input autoComplete="name" value={form.name} onChange={set("name")} autoFocus />
        </Field>
        <Field label="Email" hint="Friends add you to groups with this address." error={show("email")}>
          <Input type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={show("password")}>
          <PasswordInput autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        <Field
          label="UPI ID"
          optional
          hint="When someone in a group settles up with you, they can pay you straight from their UPI app. Group members can see it; change it any time in Settings."
          error={show("upiId")}
        >
          <Input
            value={form.upiId}
            onChange={set("upiId")}
            placeholder="yourname@okhdfcbank"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            maxLength={100}
          />
        </Field>
        <Button type="submit" variant="primary" className="mt-1 w-full" loading={busy} loadingText="Creating account…">
          Create account
        </Button>
      </form>
    </AuthForm>
  );
}
