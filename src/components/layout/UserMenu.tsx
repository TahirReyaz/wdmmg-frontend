"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar } from "../common/Avatar";
import { Menu, type MenuItem } from "../ui/Menu";

export function UserMenu({ variant }: { variant: "sidebar" | "compact" }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!user) return null;

  const dark = mounted && resolvedTheme === "dark";
  const items: MenuItem[] = [
    { label: "Settings", onSelect: () => router.push("/settings") },
    ...(user.role === "ADMIN" ? [{ label: "Admin", onSelect: () => router.push("/admin") }] : []),
    { label: dark ? "Use light theme" : "Use dark theme", onSelect: () => setTheme(dark ? "light" : "dark") },
    { label: "Sign out", onSelect: logout, separated: true },
  ];

  if (variant === "compact") {
    return <Menu items={items} label="Account" trigger={() => <Avatar name={user.name} src={user.avatarUrl} size="sm" />} />;
  }

  return (
    <Menu
      items={items}
      label="Account"
      align="start"
      // Pinned to the bottom of the sidebar, so the list always opens upward.
      side="top"
      className="w-full [&>button]:w-full"
      trigger={() => (
        <span className="flex w-full items-center gap-2.5 px-2 py-2 text-left hover:bg-sunken">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">{user.name}</span>
            <span className="block truncate text-xs text-fg-3">{user.email}</span>
          </span>
        </span>
      )}
    />
  );
}
