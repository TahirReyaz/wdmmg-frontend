"use client";

import { useEffect, useState } from "react";
import { assetUrl } from "@/api/client";
import { initials } from "@/utils/format";
import { cx } from "@/utils/cx";

const SIZES = {
  sm: "size-7 text-2xs",
  md: "size-8 text-xs",
  lg: "size-16 text-lg",
} as const;

/**
 * Profile picture, falling back to initials when there's no picture
 * (or it fails to load). Decorative: the name is always shown next to it.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  /** API-relative avatar path from the server (avatarUrl), or a local object URL for previews. */
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const url = src?.startsWith("blob:") ? src : assetUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  return (
    <span
      aria-hidden
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-sunken font-medium text-fg-2 select-none",
        SIZES[size],
        className,
      )}
    >
      {url && !failed ? (
        // Plain <img>: tiny, already-resized image served by our API.
        <img src={url} alt="" className="size-full object-cover" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
