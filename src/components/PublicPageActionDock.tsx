"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import ContactOwnerButton from "@/components/ContactOwnerButton";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import MotionModeControl from "@/components/motion/MotionModeControl";
import ShareCardDownload from "@/components/ShareCardDownload";
import {
  useFixedSurfaceActive,
  useFixedSurfacePresence,
} from "@/hooks/useFixedSurfaceCoordinator";
import type { ResumeData } from "@/types/resume";

interface PublicPageActionDockProps {
  pageId: string;
  isOwner: boolean;
  slug: string;
  themeId: string;
  resumeData: ResumeData;
  variantId?: string | null;
  liveUrl?: string;
  shareCardEnabled?: boolean;
  analyticsHref?: string;
  analyticsCtaLabel?: string;
  avoidBadge?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* Opaque surface so fixed actions stay legible over any theme artwork. */
const dockButtonClassName =
  "w-full justify-center bg-site-surface-raised shadow-[var(--site-shadow-raised)]";

export default function PublicPageActionDock({
  pageId,
  isOwner,
  slug,
  themeId,
  resumeData,
  variantId = null,
  liveUrl,
  shareCardEnabled = true,
  analyticsHref,
  analyticsCtaLabel,
  avoidBadge = false,
}: PublicPageActionDockProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const consentOpen = useFixedSurfaceActive("analytics-consent");
  const mobileSheetOpenRef = useRef(false);
  const shareOpenedFromMobileRef = useRef(false);
  const breakpointFocusFrameRef = useRef<number | null>(null);
  const mobileBarRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const actionListRef = useRef<HTMLDivElement | null>(null);
  const lastDockFocusRef = useRef<"actions" | "mobile" | null>(null);
  const sheetId = useId();
  const sheetTitleId = useId();

  mobileSheetOpenRef.current = mobileSheetOpen;
  useFixedSurfacePresence("public-action-sheet", mobileSheetOpen);

  const mobileBarBottomClass = avoidBadge
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]";
  const desktopDockBottomClass = avoidBadge
    ? "md:bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    : "md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";

  const handleDownloadErrorChange = useCallback((message: string | null) => {
    setDownloadError(message);
  }, []);

  const closeMobileSheet = useCallback((restoreFocus = true) => {
    setMobileSheetOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => moreButtonRef.current?.focus());
    }
  }, []);

  const handleShareDialogOpen = useCallback(() => {
    shareOpenedFromMobileRef.current = mobileSheetOpenRef.current;
    if (mobileSheetOpenRef.current) {
      closeMobileSheet(false);
    }
  }, [closeMobileSheet]);

  const getShareReturnFocusTarget = useCallback(() => {
    if (!shareOpenedFromMobileRef.current) return null;
    shareOpenedFromMobileRef.current = false;
    return moreButtonRef.current;
  }, []);

  useEffect(() => {
    if (!mobileSheetOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      sheetCloseRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileSheet();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusableElements = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        sheetRef.current.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileSheet, mobileSheetOpen]);

  useEffect(() => {
    const rememberDockFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (mobileBarRef.current?.contains(target)) {
        lastDockFocusRef.current = "mobile";
      } else if (actionListRef.current?.contains(target)) {
        lastDockFocusRef.current = window.matchMedia("(min-width: 768px)")
          .matches
          ? "actions"
          : "mobile";
      } else if (sheetRef.current?.contains(target)) {
        lastDockFocusRef.current = "mobile";
      } else if (target !== document.body) {
        lastDockFocusRef.current = null;
      }
    };
    const forgetDockFocusOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !mobileBarRef.current?.contains(event.target) &&
        !sheetRef.current?.contains(event.target)
      ) {
        lastDockFocusRef.current = null;
      }
    };

    document.addEventListener("focusin", rememberDockFocus);
    document.addEventListener("pointerdown", forgetDockFocusOnOutsidePointer);
    return () => {
      document.removeEventListener("focusin", rememberDockFocus);
      document.removeEventListener(
        "pointerdown",
        forgetDockFocusOnOutsidePointer,
      );
    };
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const focusFirstVisibleControl = (container: HTMLElement | null) => {
      if (breakpointFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(breakpointFocusFrameRef.current);
      }

      breakpointFocusFrameRef.current = window.requestAnimationFrame(() => {
        breakpointFocusFrameRef.current = null;
        const focusTarget = Array.from(
          container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
        ).find((element) => element.getClientRects().length > 0);
        focusTarget?.focus({ preventScroll: true });
      });
    };

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      const activeElement = document.activeElement;
      const focusWasInMobileSurface =
        activeElement instanceof HTMLElement &&
        (mobileBarRef.current?.contains(activeElement) ||
          sheetRef.current?.contains(activeElement)) ||
        lastDockFocusRef.current === "mobile";
      const focusWasInDesktopActions =
        activeElement instanceof HTMLElement &&
        actionListRef.current?.contains(activeElement) ||
        lastDockFocusRef.current === "actions";

      if (event.matches) {
        if (mobileSheetOpenRef.current) {
          closeMobileSheet(false);
        }
        if (focusWasInMobileSurface) {
          focusFirstVisibleControl(actionListRef.current);
        }
        return;
      }

      if (focusWasInDesktopActions) {
        focusFirstVisibleControl(mobileBarRef.current);
      }
    };
    desktopQuery.addEventListener("change", handleBreakpointChange);
    return () => {
      desktopQuery.removeEventListener("change", handleBreakpointChange);
      if (breakpointFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(breakpointFocusFrameRef.current);
      }
    };
  }, [closeMobileSheet]);

  useEffect(() => {
    if (consentOpen && mobileSheetOpenRef.current) {
      closeMobileSheet(false);
    }
  }, [closeMobileSheet, consentOpen]);

  const downloadErrorAlert = downloadError ? (
    <div
      data-testid="public-action-dock-error"
      className="site-alert-danger flex w-full items-center gap-2 py-1 pl-3.5 pr-1 text-left text-xs leading-5 shadow-[var(--site-shadow-raised)]"
      role="alert"
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.75v3.75" strokeLinecap="square" />
        <path d="M8 11.25h.01" strokeLinecap="round" />
      </svg>
      <span className="min-w-0 flex-1 py-1">{downloadError}</span>
      <button
        type="button"
        onClick={() => setDownloadError(null)}
        className="site-icon-button shrink-0 border-0 text-site-danger"
        aria-label="Dismiss error"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  ) : null;

  // Privacy settings own the fixed layer while open. This also unmounts any
  // nested share dialog, so fixed actions cannot paint through or take focus.
  if (consentOpen) return null;

  return (
    <>
      <div
        ref={mobileBarRef}
        className={`fixed inset-x-3 z-40 md:hidden ${mobileBarBottomClass}`}
        data-public-action-bar
        data-site-ui
      >
        <div className="site-panel-raised mx-auto flex w-full max-w-lg items-stretch gap-2 p-2 shadow-[var(--site-shadow-overlay)]">
          {isOwner ? null : (
            <ContactOwnerButton
              resumeData={resumeData}
              label="Contact"
              className="min-w-0 flex-1 justify-center"
            />
          )}
          <button
            ref={moreButtonRef}
            type="button"
            className={`site-button site-button-secondary justify-center ${isOwner ? "w-full" : "shrink-0"}`}
            aria-controls={sheetId}
            aria-expanded={mobileSheetOpen}
            data-public-action-more
            onClick={() => setMobileSheetOpen(true)}
          >
            More
          </button>
        </div>
      </div>

      {mobileSheetOpen ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="fixed inset-0 z-[60] bg-site-canvas/75 md:hidden"
          onClick={() => closeMobileSheet()}
          data-public-action-backdrop
        />
      ) : null}

      <section
        ref={sheetRef}
        id={sheetId}
        tabIndex={mobileSheetOpen ? -1 : undefined}
        role={mobileSheetOpen ? "dialog" : undefined}
        aria-modal={mobileSheetOpen ? "true" : undefined}
        aria-labelledby={mobileSheetOpen ? sheetTitleId : undefined}
        className={`${
          mobileSheetOpen ? "fixed" : "hidden"
        } inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-[70] max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-site-border bg-site-surface-raised p-3 shadow-[var(--site-shadow-overlay)] md:fixed md:left-auto md:right-5 md:z-40 md:flex md:w-72 md:max-w-[calc(100vw-2.5rem)] md:flex-col md:border-0 md:bg-transparent md:p-0 md:shadow-none ${desktopDockBottomClass}`}
        data-public-action-sheet
        data-site-ui
      >
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-site-border pb-3 md:hidden">
          <div>
            <p className="site-eyebrow">Page actions</p>
            <h2 id={sheetTitleId} className="mt-1 text-base font-semibold text-site-text">
              Continue with this page
            </h2>
          </div>
          <button
            ref={sheetCloseRef}
            type="button"
            className="site-icon-button shrink-0"
            aria-label="Close page actions"
            onClick={() => closeMobileSheet()}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          ref={actionListRef}
          className="flex w-full flex-col items-stretch gap-2"
          data-public-action-list
        >
          {downloadErrorAlert}

          {isOwner ? null : (
            <ContactOwnerButton
              resumeData={resumeData}
              className="w-full justify-center shadow-[var(--site-shadow-raised)]"
            />
          )}

          <DownloadResumeButton
            data={resumeData}
            pageId={pageId}
            variantId={variantId}
            appearance="site"
            onErrorChange={handleDownloadErrorChange}
            className={dockButtonClassName}
          />

          <ShareCardDownload
            pageId={pageId}
            isOwner={isOwner}
            slug={slug}
            themeId={themeId}
            resumeData={resumeData}
            liveUrl={liveUrl}
            variantId={variantId}
            analyticsHref={analyticsHref}
            analyticsCtaLabel={analyticsCtaLabel}
            enabled={shareCardEnabled}
            className={dockButtonClassName}
            onDialogOpen={handleShareDialogOpen}
            returnFocusTarget={getShareReturnFocusTarget}
          />

          <MotionModeControl compact className="shadow-[var(--site-shadow-raised)]" />
        </div>
      </section>
    </>
  );
}
