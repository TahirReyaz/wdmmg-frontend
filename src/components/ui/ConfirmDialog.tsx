"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/api/client";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  /**
   * Optional async work performed while the dialog stays open, so the user sees
   * progress and any failure in context. Resolves the confirm() promise with true
   * only when it succeeds.
   */
  action?: () => Promise<unknown>;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setError(null);
    setPending(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
    setPending(false);
  };

  async function onConfirm() {
    if (!options?.action) return finish(true);
    setPending(true);
    setError(null);
    try {
      await options.action();
      finish(true);
    } catch (e) {
      setPending(false);
      setError(errorMessage(e));
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!options}
        onClose={() => finish(false)}
        title={options?.title ?? ""}
        description={options?.description}
        size="sm"
        role="alertdialog"
        dismissible={!pending}
        footer={
          <>
            {/* Destructive confirmations focus Cancel so Enter never deletes by accident. */}
            <Button onClick={() => finish(false)} disabled={pending} data-autofocus={options?.tone === "danger" ? true : undefined}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={options?.tone === "danger" ? "danger" : "primary"}
              onClick={onConfirm}
              loading={pending}
              loadingText={options?.pendingLabel}
              data-autofocus={options?.tone === "danger" ? undefined : true}
            >
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        {error && (
          <p role="alert" className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-base text-danger">
            {error}
          </p>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
