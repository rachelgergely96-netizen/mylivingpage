"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/client-observability";

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    void reportClientError(error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="site-container py-10">
      <div className="site-danger-panel w-full max-w-2xl p-6 sm:p-8">
        <div role="alert">
          <p className="site-eyebrow text-site-danger">Something went wrong</p>
          <h1 className="site-page-title mt-3">We couldn&apos;t finish loading this screen.</h1>
          <p className="site-muted mt-5 max-w-xl leading-7">
            Your information is still safe. Try the request again, or return to your dashboard if the problem continues.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="site-button site-button-primary">Try again</button>
          <Link href="/dashboard" className="site-button site-button-secondary">Go to dashboard</Link>
        </div>
      </div>
    </main>
  );
}
