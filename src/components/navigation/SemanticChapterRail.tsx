"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MOTION_EVENTS, MOTION_SIGNALS } from "@/lib/motion";

export interface SemanticChapterItem {
  id: string;
  label: string;
}

interface SemanticChapterRailProps {
  items: readonly SemanticChapterItem[];
  ariaLabel?: string;
  className?: string;
}

interface ChapterEvent {
  sequence: number;
  target: string;
}

interface ChapterTransition {
  activeId: string;
  sequence: number;
  event: ChapterEvent | null;
}

const CHAPTER_NAVIGATION_SETTLE_MS = 1_200;

export function resolveChapterTransition(
  currentId: string,
  nextId: string,
  sequence: number,
  emitEvent: boolean,
): ChapterTransition | null {
  if (nextId === currentId) return null;

  if (!emitEvent) {
    return { activeId: nextId, sequence, event: null };
  }

  const nextSequence = sequence + 1;
  return {
    activeId: nextId,
    sequence: nextSequence,
    event: { sequence: nextSequence, target: nextId },
  };
}

export default function SemanticChapterRail({
  items,
  ariaLabel = "Page chapters",
  className = "",
}: SemanticChapterRailProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [chapterEvent, setChapterEvent] = useState<ChapterEvent | null>(null);
  const sequenceRef = useRef(0);
  const activeIdRef = useRef(activeId);
  const pendingNavigationTargetRef = useRef<string | null>(null);
  const pendingNavigationTimerRef = useRef<number | null>(null);
  const scheduleMeasurementRef = useRef<(() => void) | null>(null);

  const clearPendingNavigation = useCallback(() => {
    pendingNavigationTargetRef.current = null;
    if (pendingNavigationTimerRef.current !== null) {
      window.clearTimeout(pendingNavigationTimerRef.current);
      pendingNavigationTimerRef.current = null;
    }
  }, []);

  const expectNavigationTo = useCallback(
    (target: string) => {
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

  useEffect(() => {
    if (items.length < 2) return;

    const allowedIds = new Set(items.map((item) => item.id));
    let frame: number | null = null;
    let completedInitialMeasurement = false;

    const commitActiveSection = (nextId: string, emitEvent: boolean) => {
      if (!allowedIds.has(nextId)) return;

      if (!emitEvent) setChapterEvent(null);

      const transition = resolveChapterTransition(
        activeIdRef.current,
        nextId,
        sequenceRef.current,
        emitEvent,
      );
      if (!transition) return;

      activeIdRef.current = transition.activeId;
      sequenceRef.current = transition.sequence;
      setActiveId(transition.activeId);
      if (transition.event) setChapterEvent(transition.event);
    };

    const measure = () => {
      frame = null;
      const sections = items
        .map((item) => document.getElementById(item.id))
        .filter((section): section is HTMLElement => Boolean(section));
      if (!sections.length) return;

      const readingLine = Math.min(180, Math.max(96, window.innerHeight * 0.24));
      const entered = sections.filter(
        (section) => section.getBoundingClientRect().top <= readingLine,
      );
      const measuredId = (entered.at(-1) ?? sections[0]).id;
      const pendingTarget = pendingNavigationTargetRef.current;

      // A click or hash change already emitted its semantic event. Ignore the
      // intermediate chapters crossed by the browser's smooth anchor scroll.
      if (completedInitialMeasurement && pendingTarget && measuredId !== pendingTarget) {
        return;
      }
      if (pendingTarget === measuredId) clearPendingNavigation();

      // The first geometry read can reflect browser-restored scroll. Seed the
      // corresponding chapter without presenting restoration as a new event.
      commitActiveSection(
        !completedInitialMeasurement && allowedIds.has(hashId) ? hashId : measuredId,
        completedInitialMeasurement,
      );
      completedInitialMeasurement = true;
    };

    const scheduleMeasure = () => {
      if (frame === null) frame = window.requestAnimationFrame(measure);
    };
    scheduleMeasurementRef.current = scheduleMeasure;

    let hashId = "";
    try {
      hashId = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      hashId = "";
    }
    if (allowedIds.has(hashId)) {
      expectNavigationTo(hashId);
      commitActiveSection(hashId, false);
    }

    const handleHashChange = () => {
      let nextHashId = "";
      try {
        nextHashId = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        nextHashId = "";
      }

      if (allowedIds.has(nextHashId)) {
        expectNavigationTo(nextHashId);
        commitActiveSection(nextHashId, true);
      }
      scheduleMeasure();
    };

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("hashchange", handleHashChange);
    // Defer the first geometry read until the browser has had a frame to
    // restore scroll position or resolve a deep link in production builds.
    scheduleMeasure();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("hashchange", handleHashChange);
      if (scheduleMeasurementRef.current === scheduleMeasure) {
        scheduleMeasurementRef.current = null;
      }
      clearPendingNavigation();
    };
  }, [clearPendingNavigation, expectNavigationTo, items]);

  if (items.length < 2) return null;

  const selectChapter = (id: string) => {
    expectNavigationTo(id);
    const transition = resolveChapterTransition(
      activeIdRef.current,
      id,
      sequenceRef.current,
      true,
    );
    if (!transition) return;

    activeIdRef.current = transition.activeId;
    sequenceRef.current = transition.sequence;
    setActiveId(transition.activeId);
    if (transition.event) setChapterEvent(transition.event);
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={`sticky top-16 z-20 border-y border-site-border-strong bg-site-canvas-alt px-2 py-2 shadow-[var(--site-shadow-raised)] ${className}`.trim()}
      data-motion-event={chapterEvent ? MOTION_EVENTS.PAGE_CHAPTER_ENTERED : undefined}
      data-motion-sequence={chapterEvent?.sequence}
      data-motion-signal={MOTION_SIGNALS.CAREER_CHAPTERS}
      data-motion-state={chapterEvent ? "entered" : undefined}
      data-motion-target={chapterEvent?.target}
      data-semantic-chapter-rail
      data-site-ui
    >
      <ol className="scrollbar-hide flex gap-1 overflow-x-auto">
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="min-w-fit flex-1">
              <a
                href={`#${item.id}`}
                aria-current={active ? "step" : undefined}
                onClick={() => selectChapter(item.id)}
                className={`flex min-h-11 items-center gap-2 border px-3 py-2 text-xs font-semibold leading-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-focus ${
                  active
                    ? "border-site-action bg-site-selected text-site-text"
                    : "border-transparent text-site-muted hover:border-site-border hover:text-site-text"
                }`}
              >
                <span aria-hidden="true" className="font-mono text-site-action">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
