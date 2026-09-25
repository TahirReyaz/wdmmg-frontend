import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="tabular text-sm text-fg-3">404</p>
      <h1 className="mt-2 text-xl font-semibold text-fg">Page not found</h1>
      <p className="mt-1 max-w-sm text-base text-fg-3">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-5 text-base font-medium text-accent-text hover:underline hover:underline-offset-4">
        Back to overview
      </Link>
    </main>
  );
}
