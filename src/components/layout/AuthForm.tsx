import type { ReactNode } from "react";

/** Shared frame for sign-in and sign-up. */
export function AuthForm({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-1 text-base text-fg-3">{subtitle}</p>
      <div className="mt-7">{children}</div>
      <p className="mt-6 border-t border-line pt-5 text-base text-fg-3">{footer}</p>
    </>
  );
}
