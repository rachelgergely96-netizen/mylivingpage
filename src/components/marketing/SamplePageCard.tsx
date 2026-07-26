"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import LivingPageSectionRail from "@/components/public/LivingPageSectionRail";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { getLivingPageSectionIds } from "@/lib/living-page-sections";
import type { ResolvedMarketingSample } from "@/lib/marketing-samples";
import { THEME_MAP } from "@/themes/registry";

interface SamplePageCardProps {
  sample: ResolvedMarketingSample;
  signupHref: string;
  previewHref?: string;
  anchorId?: string;
  interactivePreview?: boolean;
  previewHeight?: number | string;
  showcase?: boolean;
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
  showcase = false,
}: SamplePageCardProps) {
  const theme = THEME_MAP[sample.demo.themeId];
  const sectionIds = getLivingPageSectionIds(sample.demo.data);
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
      <article
        id={anchorId}
        className="site-panel overflow-hidden rounded-2xl bg-site-canvas shadow-[0_22px_54px_-12px_rgba(0,0,0,0.55)]"
        data-example-sample={sample.id}
        data-site-ui
      >
        <div className="overflow-hidden border-b border-site-border">
          <div data-living-output className="overflow-hidden">
            <ThemeCanvas
              themeId={sample.demo.themeId}
              height={previewHeight}
              className="w-full rounded-none"
              style={{ height: previewHeight }}
              interactive={interactivePreview}
              motionAware
            >
              <div
                className="pointer-events-none h-full select-none overflow-hidden"
                aria-hidden="true"
              >
                <ResumeLayout data={sample.demo.data} compact headingLevel="h2" disableExternalLinks />
              </div>
            </ThemeCanvas>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-site-border bg-site-canvas-alt px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="site-badge">{sample.sampleBadge}</span>
              {theme ? (
                <span className="text-xs text-site-muted">{theme.name} style</span>
              ) : null}
            </div>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpenPreview(true)}
              className="site-button site-button-secondary min-h-11 px-4 py-2 text-xs"
              aria-label={`Open full sample for ${sample.demo.data.name}, ${sample.roleLabel}`}
            >
              Open full sample
            </button>
          </div>
        </div>

        <div className={showcase ? "p-4 sm:p-5" : "p-5 sm:p-6 lg:p-7"}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="site-badge">{sample.audienceLabel}</span>
            <span className="text-xs text-site-muted">Made-up profile</span>
          </div>

          <div className="mt-4">
            <h3 className="site-section-title text-2xl sm:text-3xl">{sample.roleLabel}</h3>
            <p className="mt-2 text-sm text-site-muted">
              {sample.demo.data.name} · {sample.demo.data.headline}
            </p>
          </div>

          {showcase ? (
            <p className="mt-4 border-l-2 border-site-action pl-3 text-sm leading-6 text-site-secondary">
              Send the page when a person can click. Keep your résumé for file uploads.
            </p>
          ) : (
            <>
              <p className="mt-5 text-base leading-7 text-site-secondary">
                {sample.humanBenefit}
              </p>

              <dl className="mt-5 grid gap-px bg-site-border text-sm leading-6 text-site-secondary sm:grid-cols-2">
                <div className="bg-site-surface p-4">
                  <dt className="site-eyebrow">Send it when</dt>
                  <dd className="mt-2">{sample.bestUsedAfter}</dd>
                </div>
                <div className="bg-site-surface p-4">
                  <dt className="site-eyebrow">Keep your résumé PDF for</dt>
                  <dd className="mt-2">{sample.resumeBoundary}</dd>
                </div>
              </dl>

              {previewHref ? (
                <Link
                  href={previewHref}
                  className="mt-5 inline-flex text-sm font-semibold text-site-action hover:text-site-action-hover"
                >
                  See this sample in context
                </Link>
              ) : null}
            </>
          )}
        </div>
      </article>

      {openPreview ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 sm:p-4"
          data-example-preview-overlay
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
            className="site-panel-raised flex h-[calc(100dvh-1rem)] max-h-[64rem] w-full max-w-6xl flex-col overflow-hidden sm:h-[calc(100dvh-2rem)]"
            data-site-ui
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-site-border px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <p className="site-eyebrow">Full sample</p>
                <h3 id={dialogTitleId} className="site-panel-title mt-1 text-xl sm:mt-2 sm:text-2xl">
                  {sample.demo.data.name}
                </h3>
                <p className="mt-1 hidden text-sm text-site-secondary sm:block">
                  {sample.demo.data.headline}
                </p>
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

            <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
              <div className="min-h-0 flex-1 overflow-hidden border border-site-border" data-living-output>
                <ThemeCanvas
                  themeId={sample.demo.themeId}
                  height="100%"
                  className="h-full min-h-0 rounded-none"
                  interactive
                  motionAware
                >
                  <div
                    data-analytics-scroll-root="true"
                    className="h-full overflow-y-auto scrollbar-hide"
                  >
                    <LivingPageSectionRail sectionIds={sectionIds} />
                    <ResumeLayout
                      data={sample.demo.data}
                      disableExternalLinks
                      useExternalScrollRoot
                    />
                  </div>
                </ThemeCanvas>
              </div>
              <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3 border-t border-site-border pt-3 sm:mt-4 sm:pt-4">
                <Link href={signupHref} className="site-button site-button-primary">
                  Create my free page
                </Link>
                <button
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="site-button site-button-secondary"
                >
                  Back to examples
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
