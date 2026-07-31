"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_STORAGE_KEY = "mlp-made-with-dismissed";

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed() {
  try {
    window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, "1");
  } catch {
    // Session persistence is best-effort; the in-memory state still hides it.
  }
}

export default function MadeWithBadge({ isSignedIn }: { isSignedIn: boolean }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    let showTimer: number | null = null;

    const check = () => {
      if (isSignedIn) return;
      if (readDismissed()) {
        setDismissed(true);
        return;
      }
      if (active) {
        showTimer = window.setTimeout(() => setShow(true), 800);
      }
    };

    check();

    return () => {
      active = false;
      if (showTimer !== null) {
        window.clearTimeout(showTimer);
      }
    };
  }, [isSignedIn]);

  if (!show || dismissed) return null;

  return (
    <div
      data-testid="public-page-signup-prompt"
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2"
      style={{ animation: "badgeFadeIn 0.4s ease-out forwards" }}
      data-site-ui
    >
      <style>{`@keyframes badgeFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="site-panel-raised flex items-center gap-1.5 pl-4 pr-1.5">
        <Link
          href="/signup?ref=public_page_prompt&next=/create"
          className="flex min-h-11 items-center gap-2.5 py-2.5 pr-2 text-[13px] sm:text-sm"
        >
          <span className="text-site-action">*</span>
          <span className="whitespace-nowrap text-site-secondary">
            Make your own{" "}
            <span className="font-site font-bold text-site-text">
              Living Page
            </span>
          </span>
          <span className="text-site-muted">&rarr;</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            persistDismissed();
          }}
          className="site-icon-button h-11 w-11 shrink-0 border-0"
          aria-label="Dismiss"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
