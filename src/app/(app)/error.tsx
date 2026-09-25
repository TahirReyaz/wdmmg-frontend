"use client";

import { useEffect } from "react";
import { Panel } from "@/components/ui/Panel";
import { ErrorState } from "@/components/ui/States";

/** Render-time failures inside the app shell keep navigation usable. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Panel>
      <ErrorState title="This page ran into a problem" error={new Error("An unexpected error occurred while showing this page.")} onRetry={reset} />
    </Panel>
  );
}
