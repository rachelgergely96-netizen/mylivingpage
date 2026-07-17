"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface MobileStickyCtaProps {
  href: string;
  label: string;
  targetId: string;
  hideNearId?: string;
  dismissStorageKey?: string;
}

export default function MobileStickyCta({
  href,
  label,
  targetId,
  hideNearId,
  dismissStorageKey = "mlp-mobile-sticky-dismissed",
}: MobileStickyCtaProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(dismissStorageKey) === "1");
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, [dismissStorageKey]);

  useEffect(() => {
    if (!ready || dismissed) {
      setVisible(false);
      return;
    }

    const updateVisibility = () => {
      const target = document.getElementById(targetId);
      if (!target) {
        setVisible(false);
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const heroOutOfView = targetRect.bottom < window.innerHeight * 0.2;

      const hideNearElement = hideNearId ? document.getElementById(hideNearId) : null;
      const hideNearRect = hideNearElement?.getBoundingClientRect();
      const nearFooter = hideNearRect ? hideNearRect.top < window.innerHeight * 0.9 : false;

      setVisible(heroOutOfView && !nearFooter);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [dismissed, hideNearId, ready, targetId]);

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    try {
      window.sessionStorage.setItem(dismissStorageKey, "1");
    } catch {
      // Ignore storage failures and just hide for this render.
    }
  };

  const isShown = ready && visible;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-all duration-300 motion-reduce:transition-none md:hidden ${
        isShown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
      aria-hidden={!isShown}
      data-testid="mobile-sticky-cta"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 border border-[#2D4059] bg-[rgba(8,21,37,0.96)] px-2 py-2 shadow-[6px_6px_0_rgba(2,6,14,0.45)] backdrop-blur-xl">
        <p className="min-w-0 flex-1 truncate px-1 text-xs font-medium text-[#B8C4D4]">
          Know when someone looks.
        </p>
        <Link
          href={href}
          tabIndex={isShown ? undefined : -1}
          className="flex min-h-11 shrink-0 items-center justify-center border border-[#78ADFF] bg-[#78ADFF] px-4 text-xs font-bold text-[#06101F] transition-colors hover:border-[#9AC3FF] hover:bg-[#9AC3FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A9CCFF]"
        >
          {label}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          tabIndex={isShown ? undefined : -1}
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#4A6684] bg-transparent text-[#8493A8] transition-colors hover:border-[#78ADFF] hover:text-[#F4F7FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A9CCFF]"
          aria-label="Dismiss sticky call to action"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
