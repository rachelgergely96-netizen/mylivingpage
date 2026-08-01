"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  calculateScrollMotion,
  getMotionSectionId,
} from "@/hooks/useLivingMotionBridge";
import {
  LIVING_PAGE_SECTION_LABELS,
  type LivingPageSectionId,
} from "@/lib/living-page-sections";

const SECTION_SELECTOR = "[data-motion-section], [data-analytics-section]";

interface LivingPageSectionRailProps {
  sectionIds: readonly LivingPageSectionId[];
}

interface ScrollTargetInput {
  currentScrollTop: number;
  rootTop: number;
  targetTop: number;
  railHeight: number;
  breathingRoom?: number;
}

export function calculateSectionScrollTarget({
  currentScrollTop,
  rootTop,
  targetTop,
  railHeight,
  breathingRoom = 12,
}: ScrollTargetInput): number {
  return Math.max(
    0,
    currentScrollTop + targetTop - rootTop - railHeight - breathingRoom,
  );
}

function getSectionId(element: HTMLElement): LivingPageSectionId | null {
  const id = getMotionSectionId(element.dataset, 0);
  return id && id in LIVING_PAGE_SECTION_LABELS
    ? (id as LivingPageSectionId)
    : null;
}

export default function LivingPageSectionRail({
  sectionIds,
}: LivingPageSectionRailProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<LivingPageSectionId | null>(
    sectionIds[0] ?? null,
  );

  useEffect(() => {
    const nav = navRef.current;
    const scrollRoot = nav?.closest<HTMLElement>(
      '[data-analytics-scroll-root="true"]',
    );
    if (!nav || !scrollRoot || sectionIds.length < 2) return;

    const allowedIds = new Set(sectionIds);
    const findSections = () => {
      const sectionsById = new Map<LivingPageSectionId, HTMLElement>();
      scrollRoot.querySelectorAll<HTMLElement>(SECTION_SELECTOR).forEach((section) => {
        const id = getSectionId(section);
        if (id && allowedIds.has(id) && !sectionsById.has(id)) {
          sectionsById.set(id, section);
        }
      });

      return sectionIds
        .map((id) => sectionsById.get(id))
        .filter((section): section is HTMLElement => Boolean(section));
    };

    let frame: number | null = null;
    const measure = () => {
      frame = null;
      const rootRect = scrollRoot.getBoundingClientRect();
      const sections = findSections();
      const railHeight = nav.offsetHeight;
      const snapshot = calculateScrollMotion({
        scrollTop: scrollRoot.scrollTop,
        scrollHeight: scrollRoot.scrollHeight,
        viewportHeight: Math.max(1, scrollRoot.clientHeight - railHeight),
        viewportTop: rootRect.top + railHeight,
        sections: sections.map((section) => {
          const rect = section.getBoundingClientRect();
          return {
            id: getSectionId(section) ?? "",
            top: rect.top,
            height: rect.height,
          };
        }),
      });

      if (snapshot.activeSection) {
        setActiveSectionId(snapshot.activeSection as LivingPageSectionId);
      }
    };

    const scheduleMeasure = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(scrollRoot);
    Array.from(scrollRoot.children).forEach((child) => resizeObserver.observe(child));
    findSections().forEach((section) => resizeObserver.observe(section));

    scrollRoot.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    measure();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scrollRoot.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [sectionIds]);

  // Full-size chapter labels can overflow the desktop list; keep the active
  // chip in view as the scroll-spy advances so the rail never points offscreen.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const activeChip = list.querySelector<HTMLElement>('[aria-current="step"]');
    if (!activeChip) return;

    const listRect = list.getBoundingClientRect();
    const chipRect = activeChip.getBoundingClientRect();
    const overflowLeft = chipRect.left - listRect.left;
    const overflowRight = chipRect.right - listRect.right;
    if (overflowLeft >= 0 && overflowRight <= 0) return;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    list.scrollTo({
      left: list.scrollLeft + (overflowLeft < 0 ? overflowLeft : overflowRight),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeSectionId]);

  if (sectionIds.length < 2) return null;

  const activeIndex = Math.max(0, sectionIds.indexOf(activeSectionId ?? sectionIds[0]));
  const currentId = sectionIds[activeIndex] ?? sectionIds[0];
  const previousId = sectionIds[activeIndex - 1] ?? null;
  const nextId = sectionIds[activeIndex + 1] ?? null;

  const navigateToSection = (sectionId: LivingPageSectionId) => {
    const nav = navRef.current;
    const scrollRoot = nav?.closest<HTMLElement>(
      '[data-analytics-scroll-root="true"]',
    );
    if (!nav || !scrollRoot) return;

    const target = Array.from(
      scrollRoot.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
    ).find((section) => getSectionId(section) === sectionId);
    if (!target) return;

    const rootRect = scrollRoot.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setActiveSectionId(sectionId);
    scrollRoot.scrollTo({
      top: calculateSectionScrollTarget({
        currentScrollTop: scrollRoot.scrollTop,
        rootTop: rootRect.top,
        targetTop: targetRect.top,
        railHeight: nav.offsetHeight,
      }),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <nav
      ref={navRef}
      aria-label="Living Page chapters"
      data-living-section-rail
      className="resume-theme theme-surface-strong sticky top-0 z-30 rounded-none border-b"
    >
      <div className="mx-auto max-w-4xl px-4 py-2 sm:px-6 md:px-8">
        <div className="flex min-h-11 items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            disabled={!previousId}
            onClick={() => previousId && navigateToSection(previousId)}
            aria-label={
              previousId
                ? `Previous chapter: ${LIVING_PAGE_SECTION_LABELS[previousId]}`
                : "No previous chapter"
            }
            className="resume-theme-card resume-theme-link grid h-11 w-11 shrink-0 place-items-center rounded-none border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="min-w-0 flex-1 text-center">
            <span
              aria-current="step"
              className="resume-theme-accent block truncate text-xs font-semibold uppercase tracking-[0.14em]"
            >
              {LIVING_PAGE_SECTION_LABELS[currentId]}
            </span>
            <span className="resume-theme-subtle mt-0.5 block font-mono text-xs">
              {activeIndex + 1} / {sectionIds.length}
            </span>
          </div>

          <button
            type="button"
            disabled={!nextId}
            onClick={() => nextId && navigateToSection(nextId)}
            aria-label={
              nextId
                ? `Next chapter: ${LIVING_PAGE_SECTION_LABELS[nextId]}`
                : "No next chapter"
            }
            className="resume-theme-card resume-theme-link grid h-11 w-11 shrink-0 place-items-center rounded-none border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <ol
          ref={listRef}
          className="scrollbar-hide -mx-1 hidden items-stretch gap-1 overflow-x-auto p-1 lg:flex"
        >
          {sectionIds.map((sectionId, index) => {
            const active = sectionId === currentId;
            return (
              <li key={sectionId} className="flex-1">
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-label={`Chapter ${index + 1} of ${sectionIds.length}: ${LIVING_PAGE_SECTION_LABELS[sectionId]}`}
                  onClick={() => navigateToSection(sectionId)}
                  className={`flex min-h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-none border px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] ${
                    active
                      ? "border-[var(--theme-accent-border)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent-bright)]"
                      : "border-transparent text-[var(--theme-text-subtle)] hover:border-[var(--theme-border)] hover:text-[var(--theme-text)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 ${
                      active
                        ? "bg-[var(--theme-accent-bright)]"
                        : "border border-[var(--theme-text-subtle)]"
                    }`}
                  />
                  <span>{LIVING_PAGE_SECTION_LABELS[sectionId]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
