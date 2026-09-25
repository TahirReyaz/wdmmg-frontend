"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { errorMessage } from "@/api/client";
import { useRemoveAvatar, useUploadAvatar } from "@/hooks/useProfile";
import { useAuth } from "@/providers/AuthProvider";
import { toSquareJpeg } from "@/utils/image";
import { Avatar } from "../common/Avatar";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Optional profile picture; initials are used when none is set. */
export function AvatarSetting() {
  const { user } = useAuth();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  // Local preview shown immediately while the upload runs.
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  if (!user) return null;
  const busy = upload.isPending || remove.isPending;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) return setError("Use a JPEG, PNG or WebP image.");
    if (file.size > MAX_SOURCE_BYTES) return setError("That image is too large. Pick one under 15 MB.");
    try {
      const blob = await toSquareJpeg(file);
      const url = URL.createObjectURL(blob);
      setPreview(url);
      await upload.mutateAsync(blob);
      toast.success("Profile picture updated");
    } catch (err) {
      setError(errorMessage(err, "Couldn't upload that image."));
    } finally {
      setPreview(null);
    }
  }

  async function onRemove() {
    setError(null);
    try {
      await remove.mutateAsync();
      toast.success("Profile picture removed");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="relative" aria-busy={busy || undefined}>
          <Avatar name={user.name} src={preview ?? user.avatarUrl} size="lg" />
          {busy && <span className="skeleton absolute inset-0 opacity-60" aria-hidden />}
        </span>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
          <Button onClick={() => input.current?.click()} loading={upload.isPending} loadingText="Uploading…" disabled={remove.isPending}>
            {user.avatarUrl ? "Change photo" : "Upload photo"}
          </Button>
          {user.avatarUrl && (
            <Button variant="ghost" onClick={onRemove} loading={remove.isPending} loadingText="Removing…" disabled={upload.isPending}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className={error ? "mt-3 text-sm text-danger" : "mt-3 text-sm text-fg-3"} role={error ? "alert" : undefined}>
        {error ?? "Optional. JPEG, PNG or WebP – we crop it to a square. Without one, your initials are shown."}
      </p>
    </div>
  );
}
