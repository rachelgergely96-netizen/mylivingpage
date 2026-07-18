"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import type { ResolvedMarketingSample } from "@/lib/marketing-samples";
import { THEME_MAP } from "@/themes/registry";

interface SamplePageCardProps {
  sample: ResolvedMarketingSample;
  signupHref: string;
  previewHref?: string;
  anchorId?: string;
  interactivePreview?: boolean;
  previewHeight?: number;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function SamplePageCard({
  sample,
  signupHref,
  previewHref,
  anchorId,
  interactivePreview = false,
  previewHeight = 380,
}: SamplePageCardProps) {
  const theme = THEME_MAP[sample.demo.themeId];
  const [openPreview, setOpenPreview] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!openPreview) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPreview(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);

      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [openPreview]);

  return (
    <>
      <article id={anchorId} className="site-panel overflow-hidden" data-site-ui>
        <div className="relative overflow-hidden border-b border-site-border">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-4">
            <span className="site-badge bg-site-canvas">{sample.sampleBadge}</span>
            {theme ? <span className="site-badge bg-site-canvas">{theme.name}</span> : null}
          </div>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpenPreview(true)}
            className="site-button site-button-secondary absolute right-4 top-16 z-20 min-h-11 bg-site-canvas px-3 py-2 text-xs"
          >
            Open large preview
          </button>
          <div data-living-output>
            <ThemeCanvas
              themeId={sample.demo.themeId}
              height={previewHeight}
              className="w-full rounded-none"
              style={{ height: previewHeight }}
              interactive={interactivePreview}
            >
              <div className="h-full">
                <ResumeLayout data={sample.demo.data} compact headingLevel="h2" disableExternalLinks />
              </div>
            </ThemeCanvas>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="site-badge">{sample.audienceLabel}</span>
            <span className="text-xs text-site-muted">{sample.roleLabel}</span>
          </div>

          <div className="mt-4">
            <h3 className="site-panel-title text-2xl">{sample.demo.data.name}</h3>
            <p className="mt-1 text-sm text-site-secondary">{sample.demo.data.headline}</p>
          </div>

          <dl className="mt-5 divide-y divide-site-border border-y border-site-border text-sm leading-7 text-site-secondary">
            <div className="py-4">
              <dt className="site-eyebrow">Best used after</dt>
              <dd className="mt-1">{sample.bestUsedAfter}</dd>
            </div>
            <div className="py-4">
              <dt className="site-eyebrow">Why this helps a human</dt>
              <dd className="mt-1">{sample.humanBenefit}</dd>
            </div>
            <div className="py-4">
              <dt className="site-eyebrow">Keep the resume for</dt>
              <dd className="mt-1">{sample.resumeBoundary}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={signupHref} className="site-button site-button-primary">
              Create Your Page (Free)
            </Link>
            {previewHref ? (
              <Link href={previewHref} className="text-sm font-semibold text-site-action hover:text-site-action-hover">
                See this sample in context
              </Link>
            ) : null}
          </div>
        </div>
      </article>

      {openPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpenPreview(false);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            tabIndex={-1}
            className="site-panel-raised max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-y-auto"
            data-site-ui
          >
            <div className="flex items-center justify-between gap-4 border-b border-site-border px-5 py-4 sm:px-6">
              <div>
                <p className="site-eyebrow">Large preview</p>
                <h3 id={dialogTitleId} className="site-panel-title mt-2 text-2xl">
                  {sample.demo.data.name}
                </h3>
                <p className="mt-1 text-sm text-site-secondary">{sample.demo.data.headline}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpenPreview(false)}
                className="site-icon-button shrink-0"
                aria-label="Close large preview"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="overflow-hidden border border-site-border" data-living-output>
                <ThemeCanvas
                  themeId={sample.demo.themeId}
                  height="min(82vh, 920px)"
                  className="rounded-none"
                  interactive
                >
                  <div className="h-full">
                    <ResumeLayout data={sample.demo.data} disableExternalLinks />
                  </div>
                </ThemeCanvas>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-site-border pt-5">
                <Link href={signupHref} className="site-button site-button-primary">
                  Create Your Page (Free)
                </Link>
                <button
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="site-button site-button-secondary"
                >
                  Back to samples
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
