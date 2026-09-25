"use client";

import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import type { GroupInput } from "@/api/groups";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Field, Input, Textarea } from "../ui/Field";
import { FormError } from "../ui/States";

/** Create or rename a group. */
export function GroupFormDialog({
  open,
  onClose,
  initial,
  onSubmit,
  title,
  submitLabel,
}: {
  open: boolean;
  onClose: () => void;
  initial?: GroupInput;
  onSubmit: (input: GroupInput) => Promise<unknown>;
  title: string;
  submitLabel: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setTouched(false);
      setError(null);
      setSaving(false);
    }
  }, [open, initial?.name, initial?.description]);

  const nameError = touched && !name.trim() ? "Give the group a name." : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} dismissible={!saving} size="sm">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Name" error={nameError}>
          <Input value={name} maxLength={100} placeholder="e.g. Goa trip, Flat 4B" onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
        </Field>
        <Field label="Description" optional>
          <Textarea rows={2} maxLength={500} value={description} placeholder="What is this group for?" onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-line px-5 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
