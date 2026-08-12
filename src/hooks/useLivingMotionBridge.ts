"use client";

import { useEffect } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { ThemeMotionContext } from "@/themes/types";

const SECTION_SELECTOR = "[data-motion-section], [data-analytics-section]";
const MOTION_ITEM_SELECTOR = "[data-motion-item]";
export const SECTION_PULSE_COOLDOWN_MS = 220;

export function canTriggerSectionPulse(
  now: number,
  lastPulseAt: number,
): boolean {
  if (!Number.isFinite(now)) return false;
  return (
    !Number.isFinite(lastPulseAt) ||
    now - lastPulseAt >= SECTION_PULSE_COOLDOWN_MS
  );
}

export function getMotionSectionId(
  dataset: { motionSection?: string; analyticsSection?: string },
  fallbackIndex: number,
): string {
  return (
    dataset.motionSection?.trim() ||
    dataset.analyticsSection?.trim() ||
    `section-${fallbackIndex}`
  );
}

export interface MotionSectionGeometry {
  id: string;
  top: number;
  height: number;
}

interface ScrollMotionInput {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
  viewportTop?: number;
  sections: MotionSectionGeometry[];
}

export interface ScrollMotionSnapshot {
  scrollProgress: number;
  activeSection: string | null;
  activeSectionIndex: number;
  sectionCount: number;
  sectionProgress: number;
}

export function clampMotionValue(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialThemeMotionContext(): ThemeMotionContext {
  return {
    scrollProgress: 0,
    scrollVelocity: 0,
    scrollDirection: 0,
    activeSection: null,
    activeSectionIndex: 0,
    sectionCount: 0,
    sectionProgress: 0,
    sectionImpulse: 0,
    sectionDirection: 0,
    focusedItem: null,
    focusKind: null,
    focusX: 0.5,
    focusY: 0.5,
    interactionImpulse: 0,
    pointerVelocityX: 0,
    pointerVelocityY: 0,
    pointerSpeed: 0,
    reducedMotion: false,
  };
}

export function calculateScrollVelocity(
  scrollTop: number,
  previousScrollTop: number,
  elapsedMs: number,
  viewportHeight: number,
): number {
  if (elapsedMs <= 0 || viewportHeight <= 0) return 0;
  const viewportsPerSecond =
    ((scrollTop - previousScrollTop) / viewportHeight) * (1000 / elapsedMs);
  return clampMotionValue(viewportsPerSecond, -4, 4);
}

/** Pure geometry helper kept separate so the bridge can be tested without a DOM. */
export function calculateScrollMotion({
  scrollTop,
  scrollHeight,
  viewportHeight,
  viewportTop = 0,
  sections,
}: ScrollMotionInput): ScrollMotionSnapshot {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  const scrollProgress = maxScroll > 0 ? clampMotionValue(scrollTop / maxScroll) : 0;

  if (sections.length === 0) {
    return {
      scrollProgress,
      activeSection: null,
      activeSectionIndex: 0,
      sectionCount: 0,
      sectionProgress: 0,
    };
  }

  const viewportBottom = viewportTop + viewportHeight;
  // Match the analytics model: prefer the section with the greatest visible
  // ratio. DOM order provides stable tie-breaking.
  let activeSectionIndex = -1;
  let greatestVisibleRatio = 0;
  sections.forEach((section, index) => {
    const height = Math.max(section.height, 1);
    const visibleHeight = Math.max(
      0,
      Math.min(section.top + height, viewportBottom) -
        Math.max(section.top, viewportTop),
    );
    const visibleRatio = visibleHeight / height;
    if (visibleRatio > greatestVisibleRatio) {
      greatestVisibleRatio = visibleRatio;
      activeSectionIndex = index;
    }
  });

  // If layout geometry is temporarily outside the viewport, fall back to the
  // closest section so loading and rapid programmatic scrolls remain stable.
  const focusLine = viewportTop + viewportHeight * 0.42;
  if (activeSectionIndex < 0) {
    let closestDistance = Number.POSITIVE_INFINITY;
    sections.forEach((section, index) => {
      const sectionCenter = section.top + Math.max(section.height, 1) * 0.5;
      const distance = Math.abs(sectionCenter - focusLine);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeSectionIndex = index;
      }
    });
  }

  const active = sections[activeSectionIndex];
  const sectionProgress = clampMotionValue(
    (focusLine - active.top) / Math.max(active.height, 1),
  );

  return {
    scrollProgress,
    activeSection: active.id,
    activeSectionIndex,
    sectionCount: sections.length,
    sectionProgress,
  };
}

interface UseLivingMotionBridgeOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  motionRef: MutableRefObject<ThemeMotionContext>;
  enabled: boolean;
}

/**
 * Bridges page scroll and content focus into the canvas without React state.
 * The canvas samples `motionRef` on its own frame budget.
 */
export function useLivingMotionBridge({
  containerRef,
  motionRef,
  enabled,
}: UseLivingMotionBridgeOptions): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;

    const scrollRoot = container.matches('[data-analytics-scroll-root="true"]')
      ? container
      : container.querySelector<HTMLElement>('[data-analytics-scroll-root="true"]');
    if (!scrollRoot) return;

    let frame: number | null = null;
    let lastScrollTop = scrollRoot.scrollTop;
    let lastScrollAt = performance.now();
    let activeSectionElement: HTMLElement | null = null;
    let pointerTarget: HTMLElement | null = null;
    let keyboardTarget: HTMLElement | null = null;
    let lastSectionPulseAt = Number.NEGATIVE_INFINITY;

    const findMotionTarget = (eventTarget: EventTarget | null): HTMLElement | null => {
      if (!(eventTarget instanceof Element)) return null;
      const target = eventTarget.closest<HTMLElement>(MOTION_ITEM_SELECTOR);
      return target && container.contains(target) ? target : null;
    };

    const setFocusTarget = (target: HTMLElement | null, impulse = 0) => {
      const motion = motionRef.current;
      if (!target) {
        motion.focusedItem = null;
        motion.focusKind = null;
        container.removeAttribute("data-motion-focus-kind");
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      motion.focusedItem = target.dataset.motionItem || null;
      motion.focusKind = target.dataset.motionKind || target.dataset.motionItem || null;
      motion.focusX = clampMotionValue(
        (targetRect.left + targetRect.width * 0.5 - containerRect.left) /
          Math.max(containerRect.width, 1),
      );
      motion.focusY = clampMotionValue(
        (targetRect.top + targetRect.height * 0.5 - containerRect.top) /
          Math.max(containerRect.height, 1),
      );
      motion.interactionImpulse = Math.max(motion.interactionImpulse, impulse);
      if (motion.focusKind) {
        container.setAttribute("data-motion-focus-kind", motion.focusKind);
      }
    };

    const syncFocusTarget = (impulse = 0) => {
      setFocusTarget(keyboardTarget ?? pointerTarget, impulse);
    };

    const measure = (recordVelocity: boolean) => {
      frame = null;
      const now = performance.now();
      const scrollRect = scrollRoot.getBoundingClientRect();
      const seenSectionIds = new Set<string>();
      const sectionEntries = Array.from(
        scrollRoot.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
      ).flatMap((element, index) => {
        const id = getMotionSectionId(element.dataset, index);
        if (seenSectionIds.has(id)) return [];
        seenSectionIds.add(id);
        return [{ element, id }];
      });
      const sections = sectionEntries.map(({ element, id }) => {
        const rect = element.getBoundingClientRect();
        return {
          id,
          top: rect.top,
          height: rect.height,
        };
      });
      const snapshot = calculateScrollMotion({
        scrollTop: scrollRoot.scrollTop,
        scrollHeight: scrollRoot.scrollHeight,
        viewportHeight: scrollRoot.clientHeight,
        viewportTop: scrollRect.top,
        sections,
      });
      const motion = motionRef.current;
      const previousSection = motion.activeSection;
      const previousSectionIndex = motion.activeSectionIndex;

      motion.scrollProgress = snapshot.scrollProgress;
      motion.activeSection = snapshot.activeSection;
      motion.activeSectionIndex = snapshot.activeSectionIndex;
      motion.sectionCount = snapshot.sectionCount;
      motion.sectionProgress = snapshot.sectionProgress;

      if (recordVelocity) {
        const velocity = calculateScrollVelocity(
          scrollRoot.scrollTop,
          lastScrollTop,
          now - lastScrollAt,
          scrollRoot.clientHeight,
        );
        motion.scrollVelocity = velocity;
        motion.scrollDirection = velocity > 0.01 ? 1 : velocity < -0.01 ? -1 : 0;
      }
      lastScrollTop = scrollRoot.scrollTop;
      lastScrollAt = now;

      const nextActiveElement = sectionEntries[snapshot.activeSectionIndex]?.element ?? null;
      if (nextActiveElement !== activeSectionElement) {
        activeSectionElement?.removeAttribute("data-motion-active");
        nextActiveElement?.setAttribute("data-motion-active", "true");
        activeSectionElement = nextActiveElement;
      }
      if (snapshot.activeSection) {
        container.setAttribute("data-motion-section", snapshot.activeSection);
      } else {
        container.removeAttribute("data-motion-section");
      }
      if (previousSection && previousSection !== snapshot.activeSection) {
        if (motion.reducedMotion) {
          motion.sectionImpulse = 0;
          motion.sectionDirection = 0;
        } else if (canTriggerSectionPulse(now, lastSectionPulseAt)) {
          motion.interactionImpulse = Math.max(motion.interactionImpulse, 0.72);
          motion.sectionImpulse = 1;
          motion.sectionDirection =
            snapshot.activeSectionIndex > previousSectionIndex
              ? 1
              : snapshot.activeSectionIndex < previousSectionIndex
                ? -1
                : 0;
          lastSectionPulseAt = now;
        }
      }

      syncFocusTarget();
    };

    const scheduleMeasure = () => {
      if (frame === null) frame = requestAnimationFrame(() => measure(true));
    };
    const handleResize = () => {
      if (frame === null) frame = requestAnimationFrame(() => measure(false));
    };
    const handlePointerOver = (event: PointerEvent) => {
      const nextTarget = findMotionTarget(event.target);
      const changed = nextTarget !== pointerTarget;
      pointerTarget = nextTarget;
      syncFocusTarget(changed ? 0.42 : 0);
    };
    const handlePointerOut = (event: PointerEvent) => {
      if (pointerTarget?.contains(event.relatedTarget as Node | null)) return;
      pointerTarget = findMotionTarget(event.relatedTarget);
      syncFocusTarget(pointerTarget ? 0.32 : 0);
    };
    const handlePointerDown = (event: PointerEvent) => {
      pointerTarget = findMotionTarget(event.target);
      syncFocusTarget(1);
    };
    const handleFocusIn = (event: FocusEvent) => {
      const nextTarget = findMotionTarget(event.target);
      const changed = nextTarget !== keyboardTarget;
      keyboardTarget = nextTarget;
      syncFocusTarget(changed ? 0.8 : 0);
    };
    const handleFocusOut = (event: FocusEvent) => {
      if (keyboardTarget?.contains(event.relatedTarget as Node | null)) return;
      keyboardTarget = findMotionTarget(event.relatedTarget);
      syncFocusTarget(keyboardTarget ? 0.65 : 0);
    };

    measure(false);
    scrollRoot.addEventListener("scroll", scheduleMeasure, { passive: true });
    container.addEventListener("pointerover", handlePointerOver);
    container.addEventListener("pointerout", handlePointerOut);
    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", handleResize);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      activeSectionElement?.removeAttribute("data-motion-active");
      container.removeAttribute("data-motion-section");
      container.removeAttribute("data-motion-focus-kind");
      scrollRoot.removeEventListener("scroll", scheduleMeasure);
      container.removeEventListener("pointerover", handlePointerOver);
      container.removeEventListener("pointerout", handlePointerOut);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", handleResize);
    };
  }, [containerRef, enabled, motionRef]);
}
