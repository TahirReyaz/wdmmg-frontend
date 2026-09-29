"use client";

import { useMemo } from "react";
import { encodeQr, qrPath } from "@/utils/qr";
import { cx } from "@/utils/cx";

/**
 * Scannable QR code as crisp SVG. Always black on white with a quiet zone,
 * even in dark mode — scanners expect dark modules on a light background.
 */
export function QrCode({ value, size = 168, label, className }: { value: string; size?: number; label: string; className?: string }) {
  const { d, dim } = useMemo(() => {
    const modules = encodeQr(value);
    return { d: qrPath(modules, 4), dim: modules.length + 8 };
  }, [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cx("shrink-0 bg-white", className)}
    >
      <rect width={dim} height={dim} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
