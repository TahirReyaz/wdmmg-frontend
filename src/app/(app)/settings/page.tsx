"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { AvatarSetting } from "@/components/settings/AvatarSetting";
import { DesktopAlertsSetting } from "@/components/settings/DesktopAlertsSetting";
import { SalarySetting } from "@/components/settings/SalarySetting";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormError } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useChangePassword, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/providers/AuthProvider";
import { normalizeUpiId, upiIdError } from "@/utils/upi";

/** Settings are laid out as rows: what it is on the left, the control on the right. */
function SettingsSection({ title, description, children, id }: { title: string; description: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 grid gap-4 border-b border-line py-8 first:pt-2 last:border-b-0 md:grid-cols-[260px_1fr] md:gap-10">
      <div>
        <h2 className="text-md font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-base text-fg-3">{description}</p>
      </div>
      <div className="max-w-md">{children}</div>
    </section>
  );
}

function SavedNote({ show }: { show: boolean }) {
  return (
    <span role="status" className={`text-sm text-success transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}>
      {show ? "Saved" : ""}
    </span>
  );
}

function ProfileForm() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? "");
  const [upiId, setUpiId] = useState(user?.upiId ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upiError, setUpiError] = useState<string | undefined>(undefined);
  const dirty = name.trim() !== user?.name || normalizeUpiId(upiId) !== (user?.upiId ?? null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const badUpi = upiIdError(upiId);
    setUpiError(badUpi);
    if (!name.trim()) return setError("Name can't be empty.");
    setError(null);
    if (badUpi) return;
    try {
      const wanted = normalizeUpiId(upiId);
      const updated = await update.mutateAsync({ name: name.trim(), upiId: wanted ?? "" });
      if ((updated.upiId ?? null) !== wanted) {
        // An older API ignores the field and still answers 200 — don't claim it was saved.
        setUpiError("The server didn't save your UPI ID. It may be running an older version — try again once it's updated.");
        return;
      }
      setUpiId(updated.upiId ?? "");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.upiId) setUpiError(err.fieldErrors.upiId);
      else setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Email" hint="Your sign-in email can't be changed.">
        <Input value={user?.email ?? ""} disabled readOnly />
      </Field>
      <Field label="Display name" error={error}>
        <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </Field>
      <Field
        label="UPI ID"
        optional
        hint="Group members settling up with you get a button (or QR code) that opens their UPI app with your ID and the amount filled in. Leave empty to turn this off."
        error={upiError}
      >
        <Input
          value={upiId}
          maxLength={100}
          placeholder="yourname@okhdfcbank"
          onChange={(e) => {
            setUpiId(e.target.value);
            setUpiError(undefined);
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={!dirty} loading={update.isPending} loadingText="Saving…">
          Save changes
        </Button>
        <SavedNote show={saved} />
      </div>
    </form>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = {
    current: !current ? "Enter your current password." : undefined,
    next: next.length < 8 ? "Use at least 8 characters." : undefined,
    confirm: confirmValue !== next ? "Passwords don't match." : undefined,
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errors.current || errors.next || errors.confirm) return;
    setServerError(null);
    try {
      await change.mutateAsync({ current, next });
      setCurrent("");
      setNext("");
      setConfirmValue("");
      setSubmitted(false);
      toast.success("Password changed");
    } catch (err) {
      setServerError(err instanceof ApiError && err.status === 400 ? err.message : errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormError message={serverError} />
      <Field label="Current password" error={submitted ? errors.current : undefined}>
        <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password" hint="At least 8 characters." error={submitted ? errors.next : undefined}>
        <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password" error={submitted ? errors.confirm : undefined}>
        <PasswordInput autoComplete="new-password" value={confirmValue} onChange={(e) => setConfirmValue(e.target.value)} />
      </Field>
      <div>
        <Button type="submit" loading={change.isPending} loadingText="Updating…">
          Update password
        </Button>
      </div>
    </form>
  );
}

function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Skeleton className="h-9 w-64" />;
  return (
    <SegmentedControl
      label="Theme"
      value={(theme as "light" | "dark" | "system") ?? "system"}
      onChange={setTheme}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}

export default function SettingsPage() {
  const { logout } = useAuth();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="border border-line bg-surface px-5 md:px-8">
        <SettingsSection title="Profile picture" description="Shown to people in your groups next to your name.">
          <AvatarSetting />
        </SettingsSection>
        <SettingsSection id="profile" title="Profile" description="How you appear to people in your groups, and where they can pay you.">
          <ProfileForm />
        </SettingsSection>
        <SettingsSection title="Password" description="Choose a strong password you don't use elsewhere.">
          <PasswordForm />
        </SettingsSection>
        <SettingsSection id="salary" title="Salary reminder" description="A pop-up once a month asking how much salary came in, so your bank balance stays accurate.">
          <SalarySetting />
        </SettingsSection>
        <SettingsSection title="Desktop alerts" description="Get a system notification when something needs your attention while the app is in the background.">
          <DesktopAlertsSetting />
        </SettingsSection>
        <SettingsSection title="Appearance" description="System follows your device's light or dark setting.">
          <ThemeSetting />
        </SettingsSection>
        <SettingsSection title="Session" description="Sign out of this browser.">
          <Button onClick={logout}>Sign out</Button>
        </SettingsSection>
      </div>
    </>
  );
}
