"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { useCreateTag, useUpdateTag } from "@/hooks/useTags";
import type { Tag } from "@/types";
import { cx } from "@/utils/cx";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field, Input } from "../ui/Field";
import { FormError } from "../ui/States";
import { TAG_COLORS, nextTagColor } from "./tagUtils";

/** Create a tag, or rename / recolour one when `tag` is given. */
export function TagDialog({
  open,
  onClose,
  tag,
  existingCount = 0,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tag?: Tag;
  existingCount?: number;
  onSaved?: (tag: Tag) => void;
}) {
  const create = useCreateTag();
  const update = useUpdateTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setName(tag?.name ?? "");
    setColor(tag?.color ?? nextTagColor(existingCount));
    setSubmitted(false);
    setError(null);
  }, [open, tag, existingCount]);

  const nameError = !name.trim() ? "Give the tag a name." : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || saving) return;
    setError(null);
    try {
      const input = { name: name.trim(), color };
      const saved = tag ? await update.mutateAsync({ id: tag.id, input }) : await create.mutateAsync(input);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? err.message : errorMessage(err, "Couldn't save the tag."));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tag ? "Edit tag" : "New tag"}
      description={tag ? undefined : "Use a tag for a trip or an event, then add it to expenses from any category to see what it cost in total."}
      size="sm"
      dismissible={!saving}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Name" error={submitted ? nameError : undefined}>
          <Input value={name} maxLength={60} placeholder="e.g. Goa trip, Priya's wedding" onChange={(e) => setName(e.target.value)} data-autofocus />
        </Field>
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-sm font-medium text-fg-2">Colour</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tag colour">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cx("size-7 cursor-pointer border-2", color === c ? "border-fg" : "border-transparent hover:border-line-strong")}
                style={{ background: c, boxShadow: "inset 0 0 0 2px var(--raised)" }}
              />
            ))}
          </div>
        </fieldset>
        <div className="sticky -bottom-5 z-10 -mx-5 mt-1 -mb-5 flex gap-2 border-t border-line bg-raised px-5 pt-3 pb-5 *:flex-1 sm:justify-end sm:pt-4 sm:*:flex-none">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
            {tag ? "Save changes" : "Create tag"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
