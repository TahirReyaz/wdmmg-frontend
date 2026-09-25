"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { useSaveCategory } from "@/hooks/useCategories";
import type { AdminCategory } from "@/types";
import { cx } from "@/utils/cx";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field, Input } from "../ui/Field";
import { FormError } from "../ui/States";
import { useToast } from "../ui/Toast";

/** Colour keys chosen to stay distinguishable next to each other in charts. */
export const CATEGORY_COLORS = ["#15805d", "#c8741a", "#2a78d6", "#e34948", "#4a3aa7", "#eda100", "#e87ba4", "#0e7c86", "#9d755d", "#64748b"];

export function CategoryDialog({ open, onClose, category, nextOrder }: { open: boolean; onClose: () => void; category?: AdminCategory; nextOrder: number }) {
  const save = useSaveCategory();
  const toast = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? CATEGORY_COLORS[0]);
    setTouched(false);
    setError(null);
  }, [open, category]);

  const nameError = touched && !name.trim() ? "Enter a name." : undefined;
  const colorError = !/^#[0-9a-fA-F]{6}$/.test(color) ? "Use a hex colour like #2a78d6." : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || colorError || save.isPending) return;
    setError(null);
    try {
      await save.mutateAsync({
        id: category?.id,
        input: { name: name.trim(), color: color.toLowerCase(), icon: category?.icon ?? null, sortOrder: category?.sortOrder ?? nextOrder },
      });
      toast.success(category ? "Category updated" : "Category added", { description: name.trim() });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={category ? "Edit category" : "New category"} size="sm" dismissible={!save.isPending}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Name" error={nameError}>
          <Input value={name} maxLength={60} placeholder="e.g. Pets" onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-fg-2">Colour</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Preset colours">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color.toLowerCase() === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cx("size-7 cursor-pointer border-2", color.toLowerCase() === c ? "border-fg" : "border-transparent hover:border-line-strong")}
                style={{ background: c, boxShadow: "inset 0 0 0 2px var(--raised)" }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="size-9 shrink-0 border border-line" style={{ background: colorError ? "transparent" : color }} aria-hidden />
            <Input aria-label="Hex colour" className="tabular w-32 uppercase" value={color} maxLength={7} onChange={(e) => setColor(e.target.value)} aria-invalid={colorError ? true : undefined} />
          </div>
          {colorError && <p className="mt-1.5 text-sm text-danger">{colorError}</p>}
        </fieldset>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} loadingText="Saving…">
            {category ? "Save changes" : "Add category"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
