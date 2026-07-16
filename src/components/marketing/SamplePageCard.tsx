"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
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
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function toSampleHandle(name: string) {
  const handle = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return handle || "sampleprofile";
}

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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const sampleName = sample.demo.data.name || "Sample profile";
  const sampleHandle = toSampleHandle(sampleName);
  const initial = sampleName.slice(0, 1).toUpperCase() || "?";

  useEffect(() => {
    if (!openPreview) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenPreview(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

      if (focusableElements.length === 0) {
        event.preventDefault();
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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [openPreview]);

  const openLargePreview = () => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    setOpenPreview(true);
  };

  return (
    <>
      <div id={anchorId} className="scroll-mt-24">
        <ProfileWindow
          as="article"
          title={`profile://${sampleHandle}`}
          status={<span className="profile-status">Fictional sample</span>}
          contentClassName="p-0"
          className="group h-full transition-transform duration-200 ease-soft hover:-translate-y-0.5"
        >
          <div className="relative overflow-hidden border-b border-[rgba(125,170,255,0.2)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 py-3">
              <span className="border border-[rgba(191,219,254,0.28)] bg-[rgba(6,18,37,0.9)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#BFDBFE]">
                {sample.sampleBadge}
              </span>
              {theme ? (
                <span className="border border-[rgba(191,219,254,0.22)] bg-[rgba(6,18,37,0.9)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.72)]">
                  Style: {theme.name}
                </span>
              ) : null}
            </div>

            <button
              ref={triggerRef}
              type="button"
              onClick={openLargePreview}
              aria-haspopup="dialog"
              aria-expanded={openPreview}
              className="profile-action absolute bottom-3 right-3 z-20 bg-[rgba(6,18,37,0.94)] shadow-[3px_3px_0_rgba(2,6,23,0.5)]"
            >
              Open large preview
            </button>

            <ThemeCanvas
              themeId={sample.demo.themeId}
              height={previewHeight}
              className="w-full rounded-none"
              interactive={interactivePreview}
            >
              <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.62)_100%)]">
                <ResumeLayout
                  data={sample.demo.data}
                  compact
                  headingLevel="h2"
                  disableExternalLinks
                />
              </div>
            </ThemeCanvas>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4">
              <div
                className="profile-avatar-frame flex h-[4.5rem] w-[4.5rem] items-center justify-center bg-[linear-gradient(145deg,#60a5fa,#172554)] font-heading text-3xl font-bold text-white"
                aria-hidden="true"
              >
                {initial}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-heading text-2xl font-bold leading-tight text-[#F0F4FF]">
                    {sampleName}
                  </h3>
                  <span className="font-mono text-[11px] text-[rgba(191,219,254,0.58)]">
                    @{sampleHandle}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[rgba(240,244,255,0.76)]">
                  {sample.demo.data.headline}
                </p>
                <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.56)]">
                  {sample.roleLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-y border-[rgba(255,255,255,0.07)] py-3">
              <span className="border border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.1)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#BFDBFE]">
                {sample.audienceLabel}
              </span>
              {sample.demo.data.location ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.5)]">
                  {sample.demo.data.location}
                </span>
              ) : null}
            </div>

            <ProfilePanel
              title="Profile notes"
              meta="Sample use case"
              contentClassName="p-0"
              as="div"
            >
              <dl className="profile-meta-grid">
                <dt className="profile-meta-label">Best used after</dt>
                <dd className="profile-meta-value">{sample.bestUsedAfter}</dd>
                <dt className="profile-meta-label">Why this helps a human</dt>
                <dd className="profile-meta-value">{sample.humanBenefit}</dd>
                <dt className="profile-meta-label">Keep the resume for</dt>
                <dd className="profile-meta-value">{sample.resumeBoundary}</dd>
              </dl>
            </ProfilePanel>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={signupHref} className="gold-pill px-5 py-3 text-xs font-semibold">
                Create Your Page (Free)
              </Link>
              {previewHref ? (
                <Link href={previewHref} className="profile-link text-sm font-semibold">
                  See this sample in context
                </Link>
              ) : null}
            </div>
          </div>
        </ProfileWindow>
      </div>

      {openPreview ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,15,0.9)] p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpenPreview(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`${sampleName} sample preview`}
        >
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-y-auto sm:max-h-[calc(100dvh-2.5rem)]">
            <ProfileWindow
              title={`Large preview // @${sampleHandle}`}
              status={
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="flex min-h-9 items-center border border-[rgba(219,234,254,0.32)] bg-[rgba(6,18,37,0.4)] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#EFF6FF] transition-colors hover:bg-[rgba(6,18,37,0.72)]"
                  aria-label="Close large preview"
                >
                  Close
                </button>
              }
              contentClassName="p-0"
              className="w-full"
            >
              <div className="flex flex-col gap-1 border-b border-[rgba(125,170,255,0.18)] bg-[rgba(6,18,37,0.86)] px-4 py-3 sm:px-5">
                <h3 className="font-heading text-2xl font-bold text-[#F0F4FF]">{sampleName}</h3>
                <p className="text-sm text-[rgba(240,244,255,0.68)]">
                  {sample.demo.data.headline}
                </p>
              </div>

              <div className="p-3 sm:p-5">
                <div className="overflow-hidden border border-[rgba(125,170,255,0.2)]">
                  <ThemeCanvas
                    themeId={sample.demo.themeId}
                    height="min(72vh, 820px)"
                    className="rounded-none"
                    interactive
                  >
                    <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.6)_100%)]">
                      <ResumeLayout data={sample.demo.data} disableExternalLinks />
                    </div>
                  </ThemeCanvas>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={signupHref} className="gold-pill px-5 py-3 text-sm font-semibold">
                    Create Your Page (Free)
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpenPreview(false)}
                    className="profile-action"
                  >
                    Back to samples
                  </button>
                </div>
              </div>
            </ProfileWindow>
          </div>
        </div>
      ) : null}
    </>
  );
}
