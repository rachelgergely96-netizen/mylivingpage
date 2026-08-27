"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  calculateScrollMotion,
  getMotionSectionId,
} from "@/hooks/useLivingMotionBridge";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import {
  LIVING_PAGE_SECTION_LABELS,
  type LivingPageSectionId,
} from "@/lib/living-page-sections";
import { calculateLivingPageViewport } from "@/lib/living-page-viewport";
import { MOTION_EVENTS, MOTION_MODE_POLICIES, MOTION_SIGNALS } from "@/lib/motion";

const SECTION_SELECTOR = "[data-motion-section], [data-analytics-section]";
const CHAPTER_NAVIGATION_SETTLE_MS = 1_200;

interface LivingPageSectionRailProps {
  sectionIds: readonly LivingPageSectionId[];
}

interface ChapterEnteredEvent {
  sequence: number;
  target: LivingPageSectionId;
}

interface ScrollTargetInput {
  currentScrollTop: number;
  rootTop: number;
  targetTop: number;
  railHeight: number;
  breathingRoom?: number;
}

interface ChapterMeasurementResolution {
  commit: boolean;
  emitEvent: boolean;
  settlesPendingNavigation: boolean;
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

/**
 * Smooth jumps can cross several chapters before arriving. Those intermediate
 * geometry reads are not new reader intent, so the rail waits for the target.
 * The first read can be browser-restored scroll and therefore seeds silently.
 */
export function resolveChapterMeasurement(
  measuredId: LivingPageSectionId,
  pendingTarget: LivingPageSectionId | null,
  completedInitialMeasurement: boolean,
): ChapterMeasurementResolution {
  if (
    completedInitialMeasurement &&
    pendingTarget &&
    measuredId !== pendingTarget
  ) {
    return {
      commit: false,
      emitEvent: false,
      settlesPendingNavigation: false,
    };
  }

  return {
    commit: true,
    emitEvent: completedInitialMeasurement,
    settlesPendingNavigation: pendingTarget === measuredId,
  };
}

export function getChapterMenuFocusIndex(
  currentIndex: number,
  itemCount: number,
  key: string,
): number | null {
  if (itemCount <= 0) return null;

  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  if (key === "ArrowDown" || key === "ArrowRight") {
    return (currentIndex + 1) % itemCount;
  }
  if (key === "ArrowUp" || key === "ArrowLeft") {
    return (currentIndex - 1 + itemCount) % itemCount;
  }

  return null;
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
  const { mode: motionMode } = useMotionPreference();
  const scrollBehavior = MOTION_MODE_POLICIES[motionMode].allowsSmoothScroll
    ? "smooth" : "auto";
  const navRef = useRef<HTMLElement | null>(null);
  const sectionToggleRef = useRef<HTMLButtonElement | null>(null);
  const menuButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuFocusRequestRef = useRef<number | null>(null);
  const menuItemFocusFrameRef = useRef<number | null>(null);
  const toggleFocusFrameRef = useRef<number | null>(null);
  const destinationFocusFrameRef = useRef<number | null>(null);
  const pendingNavigationTargetRef = useRef<LivingPageSectionId | null>(null);
  const pendingNavigationTimerRef = useRef<number | null>(null);
  const scheduleMeasurementRef = useRef<(() => void) | null>(null);
  const chapterEventSequenceRef = useRef(0);
  const activeSectionIdRef = useRef<LivingPageSectionId | null>(
    sectionIds[0] ?? null,
  );
  const [activeSectionId, setActiveSectionId] = useState<LivingPageSectionId | null>(
    sectionIds[0] ?? null,
  );
  const [chapterEnteredEvent, setChapterEnteredEvent] =
    useState<ChapterEnteredEvent | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const clearPendingNavigation = useCallback(() => {
    pendingNavigationTargetRef.current = null;
    if (pendingNavigationTimerRef.current !== null) {
      window.clearTimeout(pendingNavigationTimerRef.current);
      pendingNavigationTimerRef.current = null;
    }
  }, []);

  const expectNavigationTo = useCallback(
    (target: LivingPageSectionId) => {
      clearPendingNavigation();
      pendingNavigationTargetRef.current = target;
      pendingNavigationTimerRef.current = window.setTimeout(() => {
        if (pendingNavigationTargetRef.current === target) {
          pendingNavigationTargetRef.current = null;
          scheduleMeasurementRef.current?.();
        }
        pendingNavigationTimerRef.current = null;
      }, CHAPTER_NAVIGATION_SETTLE_MS);
    },
    [clearPendingNavigation],
  );

  const commitActiveSection = useCallback(
    (nextSectionId: LivingPageSectionId, emitEvent: boolean) => {
      if (!emitEvent) setChapterEnteredEvent(null);
      if (nextSectionId === activeSectionIdRef.current) return;

      activeSectionIdRef.current = nextSectionId;
      setActiveSectionId(nextSectionId);

      if (emitEvent) {
        chapterEventSequenceRef.current += 1;
        setChapterEnteredEvent({
          sequence: chapterEventSequenceRef.current,
          target: nextSectionId,
        });
      }
    },
    [],
  );

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    menuFocusRequestRef.current = null;
    if (!restoreFocus) return;

    if (toggleFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(toggleFocusFrameRef.current);
    }
    toggleFocusFrameRef.current = window.requestAnimationFrame(() => {
      toggleFocusFrameRef.current = null;
      sectionToggleRef.current?.focus({ preventScroll: true });
    });
  }, []);

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
    let completedInitialMeasurement = false;
    const measure = () => {
      frame = null;
      const rootRect = scrollRoot.getBoundingClientRect();
      const sections = findSections();
      const viewport = calculateLivingPageViewport({
        rootTop: rootRect.top,
        rootHeight: scrollRoot.clientHeight,
        stickyInset: nav.offsetHeight,
      });
      const snapshot = calculateScrollMotion({
        scrollTop: scrollRoot.scrollTop,
        scrollHeight: scrollRoot.scrollHeight,
        scrollPortHeight: scrollRoot.clientHeight,
        ...viewport,
        sections: sections.map((section) => {
          const rect = section.getBoundingClientRect();
          return {
            id: getSectionId(section) ?? "",
            top: rect.top,
            height: rect.height,
          };
        }),
      });

      if (
        snapshot.activeSection &&
        allowedIds.has(snapshot.activeSection as LivingPageSectionId)
      ) {
        const nextSectionId = snapshot.activeSection as LivingPageSectionId;
        const resolution = resolveChapterMeasurement(
          nextSectionId,
          pendingNavigationTargetRef.current,
          completedInitialMeasurement,
        );

        if (resolution.settlesPendingNavigation) clearPendingNavigation();
        if (resolution.commit) {
          commitActiveSection(nextSectionId, resolution.emitEvent);
        }
      }
      completedInitialMeasurement = true;
    };

    const scheduleMeasure = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(measure);
      }
    };
    scheduleMeasurementRef.current = scheduleMeasure;

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
      if (scheduleMeasurementRef.current === scheduleMeasure) {
        scheduleMeasurementRef.current = null;
      }
      clearPendingNavigation();
    };
  }, [clearPendingNavigation, commitActiveSection, sectionIds]);

  useEffect(() => {
    if (!menuOpen) return;

    const requestedIndex = menuFocusRequestRef.current;
    if (requestedIndex !== null) {
      menuItemFocusFrameRef.current = window.requestAnimationFrame(() => {
        menuItemFocusFrameRef.current = null;
        menuButtonRefs.current[requestedIndex]?.focus({ preventScroll: true });
        menuFocusRequestRef.current = null;
      });
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointer);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      if (menuItemFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(menuItemFocusFrameRef.current);
        menuItemFocusFrameRef.current = null;
      }
    };
  }, [closeMenu, menuOpen]);

  useEffect(
    () => () => {
      if (menuItemFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(menuItemFocusFrameRef.current);
      }
      if (toggleFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(toggleFocusFrameRef.current);
      }
      if (destinationFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(destinationFocusFrameRef.current);
      }
      clearPendingNavigation();
    },
    [clearPendingNavigation],
  );

  if (sectionIds.length < 2) return null;

  const activeIndex = Math.max(0, sectionIds.indexOf(activeSectionId ?? sectionIds[0]));
  const currentId = sectionIds[activeIndex] ?? sectionIds[0];
  const previousId = sectionIds[activeIndex - 1] ?? null;
  const nextId = sectionIds[activeIndex + 1] ?? null;

  const navigateToSection = (
    sectionId: LivingPageSectionId,
    focusDestination = false,
  ) => {
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

    expectNavigationTo(sectionId);
    commitActiveSection(sectionId, true);
    scrollRoot.scrollTo({
      top: calculateSectionScrollTarget({
        currentScrollTop: scrollRoot.scrollTop,
        rootTop: rootRect.top,
        targetTop: targetRect.top,
        railHeight: nav.offsetHeight,
      }),
      behavior: scrollBehavior,
    });

    if (focusDestination) {
      if (destinationFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(destinationFocusFrameRef.current);
      }
      destinationFocusFrameRef.current = window.requestAnimationFrame(() => {
        destinationFocusFrameRef.current = null;
        const headingMarker =
          target.querySelector<HTMLElement>("[data-section-heading]");
        const heading = headingMarker?.matches("h1, h2, h3, h4, h5, h6")
          ? headingMarker
          : headingMarker?.querySelector<HTMLElement>(
              "h1, h2, h3, h4, h5, h6",
            );
        const focusTarget = heading ?? target;
        const addedTabIndex = !focusTarget.hasAttribute("tabindex");
        const addedLabel =
          focusTarget === target &&
          !focusTarget.hasAttribute("aria-label") &&
          !focusTarget.hasAttribute("aria-labelledby");

        if (addedTabIndex) focusTarget.setAttribute("tabindex", "-1");
        if (addedLabel) {
          focusTarget.setAttribute(
            "aria-label",
            LIVING_PAGE_SECTION_LABELS[sectionId],
          );
        }
        focusTarget.setAttribute("data-living-focus-destination", sectionId);
        focusTarget.addEventListener(
          "blur",
          () => {
            focusTarget.removeAttribute("data-living-focus-destination");
            if (addedTabIndex) focusTarget.removeAttribute("tabindex");
            if (addedLabel) focusTarget.removeAttribute("aria-label");
          },
          { once: true },
        );
        focusTarget.focus({ preventScroll: true });
      });
    }
  };

  const openMenuWithFocus = (index: number) => {
    menuFocusRequestRef.current = index;
    setMenuOpen(true);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Living Page chapters"
      data-living-section-rail
      data-motion-event={
        chapterEnteredEvent ? MOTION_EVENTS.PAGE_CHAPTER_ENTERED : undefined
      }
      data-motion-sequence={chapterEnteredEvent?.sequence}
      data-motion-signal={MOTION_SIGNALS.CAREER_CHAPTERS}
      data-motion-state={chapterEnteredEvent ? "entered" : undefined}
      data-motion-target={chapterEnteredEvent?.target}
      className="resume-theme pointer-events-none sticky top-0 z-30 px-3 py-2 sm:px-5"
    >
      <div className="theme-surface-strong pointer-events-auto relative mx-auto max-w-3xl rounded-none border">
        <div className="flex min-h-11 items-stretch">
          <button
            type="button"
            disabled={!previousId}
            onClick={() => {
              closeMenu();
              if (previousId) navigateToSection(previousId);
            }}
            aria-label={
              previousId
                ? `Previous chapter: ${LIVING_PAGE_SECTION_LABELS[previousId]}`
                : "No previous chapter"
            }
            className="resume-theme-link grid h-11 w-11 shrink-0 place-items-center rounded-none border-r border-[var(--theme-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 sm:gap-3 sm:px-4">
            <span
              key={currentId}
              className="min-w-0 flex-1"
              data-living-section-current={currentId}
            >
              <span className="resume-theme-accent block truncate text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs">
                {LIVING_PAGE_SECTION_LABELS[currentId]}
              </span>
              <span className="resume-theme-subtle mt-0.5 block font-mono text-[10px] sm:text-xs">
                {String(activeIndex + 1).padStart(2, "0")} / {String(sectionIds.length).padStart(2, "0")}
              </span>
            </span>

            <span
              aria-hidden="true"
              className="hidden min-w-16 flex-1 items-center gap-1 sm:flex"
              data-living-section-progress
            >
              {sectionIds.map((sectionId, index) => (
                <span
                  key={sectionId}
                  className={`h-px min-w-1 flex-1 ${
                    index <= activeIndex
                      ? "bg-[var(--theme-accent-bright)]"
                      : "bg-[var(--theme-border)]"
                  }`}
                />
              ))}
            </span>
          </div>

          <button
            ref={sectionToggleRef}
            type="button"
            data-living-section-toggle
            aria-controls={menuId}
            aria-expanded={menuOpen}
            onClick={() => {
              if (menuOpen) {
                closeMenu();
              } else {
                openMenuWithFocus(activeIndex);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && menuOpen) {
                event.preventDefault();
                closeMenu(true);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                openMenuWithFocus(activeIndex);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                openMenuWithFocus(sectionIds.length - 1);
              }
            }}
            className="resume-theme-link flex h-11 shrink-0 items-center justify-center gap-1.5 border-l border-[var(--theme-border)] px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] sm:px-3 sm:text-xs"
          >
            Sections
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="square" strokeLinejoin="miter" d={menuOpen ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4"} />
            </svg>
          </button>

          <button
            type="button"
            disabled={!nextId}
            onClick={() => {
              closeMenu();
              if (nextId) navigateToSection(nextId);
            }}
            aria-label={
              nextId
                ? `Next chapter: ${LIVING_PAGE_SECTION_LABELS[nextId]}`
                : "No next chapter"
            }
            className="resume-theme-link grid h-11 w-11 shrink-0 place-items-center rounded-none border-l border-[var(--theme-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div
          id={menuId}
          hidden={!menuOpen}
          className="theme-surface-strong absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-[min(24rem,60dvh)] overflow-y-auto rounded-none border p-2 shadow-[0_20px_56px_rgba(0,0,0,0.42)]"
          data-living-section-menu
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeMenu(true);
            }
          }}
        >
          <ol aria-label="Living Page section index" className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {sectionIds.map((sectionId, index) => {
              const active = sectionId === currentId;
              return (
                <li key={sectionId}>
                  <button
                    ref={(element) => {
                      menuButtonRefs.current[index] = element;
                    }}
                    type="button"
                    aria-current={active ? "step" : undefined}
                    aria-label={`Chapter ${index + 1} of ${sectionIds.length}: ${LIVING_PAGE_SECTION_LABELS[sectionId]}`}
                    data-living-section-item={sectionId}
                    onClick={() => {
                      navigateToSection(sectionId, true);
                      closeMenu();
                    }}
                    onKeyDown={(event) => {
                      const nextFocusIndex = getChapterMenuFocusIndex(
                        index,
                        sectionIds.length,
                        event.key,
                      );
                      if (nextFocusIndex === null) return;
                      event.preventDefault();
                      menuButtonRefs.current[nextFocusIndex]?.focus({
                        preventScroll: true,
                      });
                    }}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-none border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] ${
                      active
                        ? "border-[var(--theme-accent-border)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent-bright)]"
                        : "border-transparent text-[var(--theme-text-subtle)] hover:border-[var(--theme-border)] hover:text-[var(--theme-text)]"
                    }`}
                  >
                    <span aria-hidden="true" className="font-mono text-[10px] text-[var(--theme-text-subtle)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{LIVING_PAGE_SECTION_LABELS[sectionId]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}
