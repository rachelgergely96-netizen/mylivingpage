"use client";

import React, { useEffect, useRef, useState } from "react";
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

export default function SemanticChapterRail({
  items,
  ariaLabel = "Page chapters",
  className = "",
}: SemanticChapterRailProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [chapterEvent, setChapterEvent] = useState<ChapterEvent | null>(null);
  const sequenceRef = useRef(0);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    if (items.length < 2) return;

    const allowedIds = new Set(items.map((item) => item.id));
    let frame: number | null = null;

    const commitActiveSection = (nextId: string) => {
      if (!allowedIds.has(nextId) || nextId === activeIdRef.current) return;
      activeIdRef.current = nextId;
      setActiveId(nextId);
      sequenceRef.current += 1;
      setChapterEvent({ sequence: sequenceRef.current, target: nextId });
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
      commitActiveSection((entered.at(-1) ?? sections[0]).id);
    };

    const scheduleMeasure = () => {
      if (frame === null) frame = window.requestAnimationFrame(measure);
    };

    let hashId = "";
    try {
      hashId = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      hashId = "";
    }
    if (allowedIds.has(hashId)) {
      activeIdRef.current = hashId;
      setActiveId(hashId);
    }

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("hashchange", scheduleMeasure);
    measure();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("hashchange", scheduleMeasure);
    };
  }, [items]);

  if (items.length < 2) return null;

  const selectChapter = (id: string) => {
    if (id !== activeIdRef.current) {
      activeIdRef.current = id;
      setActiveId(id);
      sequenceRef.current += 1;
      setChapterEvent({ sequence: sequenceRef.current, target: id });
    }
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
