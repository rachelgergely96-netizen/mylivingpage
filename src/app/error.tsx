"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="site-shell flex min-h-screen items-center px-5 py-16" data-site-ui role="alert" aria-live="assertive">
      <div className="site-danger-panel mx-auto w-full max-w-2xl p-6 sm:p-10">
        <p className="site-eyebrow text-site-danger">Something went wrong</p>
        <h1 className="site-page-title mt-3">We couldn&apos;t finish loading this screen.</h1>
        <p className="site-muted mt-5 max-w-xl leading-7">
          Your information is still safe. Try the request again, or return to the homepage if the problem continues.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="site-button site-button-primary">Try again</button>
          <Link href="/" className="site-button site-button-secondary">Go to the homepage</Link>
        </div>
      </div>
    </main>
  );
}
