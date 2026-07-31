"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-observability";
import { fontVariableClasses } from "@/lib/fonts";
import "./globals.css";

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
      <body className={`${fontVariableClasses} antialiased`}>
        <main className="site-shell flex min-h-screen items-center px-5 py-16" data-site-ui>
          <div className="site-danger-panel mx-auto w-full max-w-2xl p-6 sm:p-8">
            {/* The root layout is gone when this boundary renders, so use plain
                anchors instead of client-router Links. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="site-wordmark">my<span>living</span>page</a>
            <div role="alert">
              <p className="site-eyebrow mt-12 text-site-danger">Something went wrong</p>
              <h1 className="site-page-title mt-3">The page could not be loaded.</h1>
              <p className="site-muted mt-5 max-w-xl leading-7">
                The error was recorded. Try again, or return in a few minutes.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={reset} className="site-button site-button-primary">
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="site-button site-button-secondary">Go to the homepage</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
