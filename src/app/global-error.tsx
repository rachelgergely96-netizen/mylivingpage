"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-observability";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="site-container flex min-h-screen items-center justify-center py-12">
          <div className="site-panel-raised max-w-lg p-6 text-center sm:p-8">
            <p className="site-eyebrow">Something went wrong</p>
            <h1 className="site-page-title mt-3">The page could not be loaded.</h1>
            <p className="site-muted mt-3 text-sm">
              The error was recorded. Try again, or return in a few minutes.
            </p>
            <button type="button" onClick={reset} className="site-button site-button-primary mt-6">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
