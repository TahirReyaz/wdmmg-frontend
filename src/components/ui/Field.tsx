"use client";

import { ChevronDown, Eye, EyeOff, Search, X } from "lucide-react";
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "@/utils/cx";

const control =
  "w-full bg-surface text-fg border border-line-strong placeholder:text-fg-3/80 " +
  "transition-[border-color,box-shadow] duration-100 hover:border-fg-3/60 " +
  "focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--accent)] " +
  "disabled:bg-sunken disabled:text-fg-3 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_1px_var(--danger)]";

interface FieldProps {
  label: ReactNode;
  /** Marks the field as optional in the label (required is the default expectation). */
  optional?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}

/** Label + control + hint/error, wired up for assistive tech. */
export function Field({ label, optional, hint, error, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const child = isValidElement(children)
    ? cloneElement(children, { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })
    : children;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-fg-2">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-fg-3">Optional</span>}
      </label>
      {child}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { inputSize?: "sm" | "md" }>(
  function Input({ className, inputSize = "md", ...rest }, ref) {
    return <input ref={ref} {...rest} className={cx(control, inputSize === "sm" ? "h-8 px-2.5 text-sm" : "h-9 px-3", className)} />;
  },
);

/**
 * Password field with a show/hide toggle. Works inside <Field> like <Input>: the id and
 * aria attributes Field passes land on the input itself. The text is hidden again when
 * the form is submitted, so browsers still recognise it as a password to save.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function PasswordInput({ className, disabled, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    useEffect(() => {
      const form = inputRef.current?.form;
      if (!form) return;
      const hide = () => setVisible(false);
      form.addEventListener("submit", hide);
      return () => form.removeEventListener("submit", hide);
    }, []);

    function toggle() {
      const input = inputRef.current;
      const caret = input ? [input.selectionStart, input.selectionEnd] : null;
      setVisible((v) => !v);
      // Keep typing where the user was; changing `type` can reset the caret in some browsers.
      requestAnimationFrame(() => {
        if (!input) return;
        input.focus();
        if (caret && caret[0] != null) input.setSelectionRange(caret[0], caret[1]);
      });
    }

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={visible ? "text" : "password"}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...rest}
          // Hide Edge's built-in reveal button so there's only one.
          className={cx(control, "h-9 pr-10 pl-3 [&::-ms-reveal]:hidden", className)}
        />
        <button
          type="button"
          onClick={toggle}
          // Don't steal focus from the input on click.
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center text-fg-3 transition-colors duration-100 hover:text-fg focus-visible:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    );
  },
);

/** Money input with a fixed currency prefix. */
export const AmountInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { prefix: string }>(
  function AmountInput({ prefix, className, ...rest }, ref) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-3">{prefix}</span>
        <input
          ref={ref}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          {...rest}
          className={cx(control, "tabular h-9 pr-3 pl-7", className)}
        />
      </div>
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { selectSize?: "sm" | "md" }>(
  function Select({ className, selectSize = "md", children, ...rest }, ref) {
    return (
      <div className={cx("relative", className)}>
        <select
          ref={ref}
          {...rest}
          className={cx(control, "cursor-pointer appearance-none pr-8", selectSize === "sm" ? "h-8 pl-2.5 text-sm" : "h-9 pl-3")}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-fg-3" aria-hidden />
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} {...rest} className={cx(control, "resize-y px-3 py-2", className)} />;
});

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  label = "Search",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-3" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cx(control, "h-9 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center text-fg-3 hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
      />
      <label htmlFor={id} className="cursor-pointer text-base text-fg">
        {label}
        {description && <span className="block text-sm text-fg-3">{description}</span>}
      </label>
    </div>
  );
}

/** Binary setting that applies immediately. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex cursor-pointer items-center gap-2.5 text-base text-fg-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cx(
          "relative h-[18px] w-8 shrink-0 border transition-colors duration-150",
          checked ? "border-accent bg-accent" : "border-line-strong bg-sunken",
        )}
        aria-hidden
      >
        <span
          className={cx(
            "absolute top-[2px] size-3 transition-[left,background-color] duration-150",
            checked ? "left-[16px] bg-accent-fg" : "left-[2px] bg-fg-3",
          )}
        />
      </span>
      {label}
    </button>
  );
}
