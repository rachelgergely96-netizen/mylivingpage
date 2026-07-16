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

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 px-3 pb-3 transition-all duration-300 md:hidden ${
        ready && visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
      aria-hidden={!visible}
      data-testid="mobile-sticky-cta"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(8,14,28,0.94)] px-3 py-2 shadow-[0_-10px_40px_rgba(2,6,23,0.4)] backdrop-blur-xl">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-[rgba(247,241,232,0.78)]">
          One resume. Three useful outputs.
        </p>
        <Link href={href} className="gold-pill shrink-0 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {label}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.6)] transition-colors hover:border-[rgba(96,165,250,0.4)] hover:text-[#BFDBFE]"
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
