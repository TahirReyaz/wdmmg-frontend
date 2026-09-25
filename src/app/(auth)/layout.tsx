import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center px-5 sm:px-8">
        <Link href="/login" className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
          <span className="grid size-5 grid-cols-2 gap-px" aria-hidden>
            <span className="bg-accent" />
            <span className="bg-fg/80" />
            <span className="bg-fg/80" />
            <span className="bg-fg/25" />
          </span>
          Where did my money go
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-5 pt-[8vh] pb-16">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
      <footer className="px-5 py-6 text-center text-sm text-fg-3 sm:px-8">Personal and shared expenses, in one place.</footer>
    </div>
  );
}
