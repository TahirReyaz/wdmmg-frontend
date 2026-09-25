"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "@/utils/cx";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  success: (title: string, opts?: Omit<ToastItem, "id" | "tone" | "title">) => void;
  error: (title: string, opts?: Omit<ToastItem, "id" | "tone" | "title">) => void;
  info: (title: string, opts?: Omit<ToastItem, "id" | "tone" | "title">) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const MAX_VISIBLE = 3;

const bar: Record<ToastTone, string> = {
  success: "bg-success",
  error: "bg-danger",
  info: "bg-info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, opts: Omit<ToastItem, "id" | "tone" | "title"> = {}) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-(MAX_VISIBLE - 1)), { id, tone, title, ...opts }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, o) => push("success", t, o),
      error: (t, o) => push("error", t, o),
      info: (t, o) => push("info", t, o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96 md:bottom-5"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto relative flex animate-slide-up items-start gap-3 border border-line bg-raised py-3 pr-2 pl-4 shadow-raised"
          >
            <span className={cx("absolute inset-y-0 left-0 w-[3px]", bar[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-fg-2">{t.description}</p>}
            </div>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="cursor-pointer px-2 text-sm font-medium text-accent-text hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center text-fg-3 hover:text-fg"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
