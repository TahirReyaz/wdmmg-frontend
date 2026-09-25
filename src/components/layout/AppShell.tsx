"use client";

import { Bell, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useAuth } from "@/providers/AuthProvider";
import { SalaryPromptHost } from "../money/SalaryPromptDialog";
import { NotificationWatcher } from "../notifications/NotificationWatcher";
import { ExpenseComposerProvider, useExpenseComposer } from "../expenses/ExpenseComposer";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { cx } from "@/utils/cx";
import { PRIMARY_NAV, isActivePath } from "./nav";
import { UserMenu } from "./UserMenu";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
      <span className="grid size-5 grid-cols-2 gap-px" aria-hidden>
        <span className="bg-accent" />
        <span className="bg-fg/80" />
        <span className="bg-fg/80" />
        <span className="bg-fg/25" />
      </span>
      <span className="max-[400px]:sr-only">Where did my money go</span>
    </Link>
  );
}

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="tabular inline-flex h-[18px] min-w-[18px] items-center justify-center bg-accent px-1 text-2xs font-semibold text-accent-fg">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function MobileBell() {
  const pathname = usePathname();
  const unread = useUnreadCount().data?.count ?? 0;
  const active = isActivePath(pathname, "/notifications");
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      aria-current={active ? "page" : undefined}
      className={cx("relative inline-flex size-9 items-center justify-center", active ? "text-fg" : "text-fg-3 hover:text-fg")}
    >
      <Bell className="size-[18px]" aria-hidden />
      {unread > 0 && (
        <span className="tabular absolute top-1 right-0.5 inline-flex h-4 min-w-4 items-center justify-center bg-accent px-0.5 text-[10px] font-semibold text-accent-fg" aria-hidden>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const composer = useExpenseComposer();
  const unread = useUnreadCount().data?.count ?? 0;
  const secondary = [
    { href: "/notifications", label: "Notifications", count: unread },
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin", count: 0 }] : []),
    { href: "/settings", label: "Settings", count: 0 },
  ];

  const linkClass = (active: boolean) =>
    cx(
      "relative flex h-8 items-center px-3 text-base transition-colors duration-100",
      active ? "bg-sunken font-medium text-fg" : "text-fg-2 hover:bg-sunken/70 hover:text-fg",
    );

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex h-14 items-center px-5">
        <Wordmark />
      </div>
      <div className="px-3 pb-3">
        <Button variant="primary" className="w-full" onClick={() => composer.open()} leading={<Plus className="size-4" aria-hidden />}>
          New expense
        </Button>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col px-3">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                  {active && <span className="absolute inset-y-1.5 left-0 w-0.5 bg-accent" aria-hidden />}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <ul className="mt-6 flex flex-col gap-0.5 border-t border-line pt-4">
          {secondary.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                  {active && <span className="absolute inset-y-1.5 left-0 w-0.5 bg-accent" aria-hidden />}
                  <span className="flex-1">{item.label}</span>
                  {item.count > 0 && <CountBadge count={item.count} label="unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-line p-2">
        <UserMenu variant="sidebar" />
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const composer = useExpenseComposer();
  return (
    <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:hidden">
      <Wordmark />
      <div className="flex items-center gap-1">
        <Button size="sm" variant="primary" onClick={() => composer.open()} leading={<Plus className="size-3.5" aria-hidden />}>
          Add
        </Button>
        <MobileBell />
        <UserMenu variant="compact" />
      </div>
    </header>
  );
}

function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden">
      <ul className="grid grid-cols-5">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-14 flex-col items-center justify-center gap-1 text-2xs",
                  active ? "font-medium text-accent-text" : "text-fg-3",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Shell skeleton while the session is being restored – same geometry as the real shell. */
function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" role="status" aria-label="Loading your workspace">
      <div className="hidden w-60 shrink-0 flex-col gap-3 border-r border-line bg-surface p-5 md:flex">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-9 w-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-3.5 w-28" />
        ))}
      </div>
      <div className="flex-1 p-6 lg:p-10">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-3.5 w-72" />
        <Skeleton className="mt-8 h-28 w-full" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return <ShellSkeleton />;

  return (
    <ExpenseComposerProvider>
      <NotificationWatcher />
      <Suspense fallback={null}>
        <SalaryPromptHost />
      </Suspense>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="min-h-dvh md:flex">
        <Sidebar />
        <MobileTopBar />
        <main id="main" className="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 md:pt-8 md:pb-12 lg:px-10">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
        <MobileTabBar />
      </div>
    </ExpenseComposerProvider>
  );
}
