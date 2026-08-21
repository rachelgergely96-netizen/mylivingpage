"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export const LIVING_PAGE_EDITOR_SECTIONS = [
  { id: "editor-section-setup", label: "Setup" },
  { id: "editor-section-profile", label: "Profile" },
  { id: "editor-section-summary", label: "Intro" },
  { id: "editor-section-stats", label: "Impact" },
  { id: "editor-section-experience", label: "Experience" },
  { id: "editor-section-education", label: "Education" },
  { id: "editor-section-skills", label: "Skills" },
  { id: "editor-section-projects", label: "Projects" },
  { id: "editor-section-proof", label: "Proof" },
  { id: "editor-section-testimonials", label: "Voices" },
  { id: "editor-section-certifications", label: "Credentials" },
  { id: "editor-section-design", label: "Design" },
  { id: "editor-section-versions", label: "Versions" },
  { id: "editor-section-ats", label: "ATS check" },
] as const;

export type EditorSectionAnchorId = (typeof LIVING_PAGE_EDITOR_SECTIONS)[number]["id"];

interface EditorSectionNavProps {
  allowsSmoothScroll?: boolean;
  signalSectionIds?: readonly EditorSectionAnchorId[];
}

export default function EditorSectionNav({
  allowsSmoothScroll = false,
  signalSectionIds = [],
}: EditorSectionNavProps) {
  const scrollRef = useRef<HTMLOListElement | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<EditorSectionAnchorId>(
    LIVING_PAGE_EDITOR_SECTIONS[0].id,
  );
  const signalSections = useMemo(
    () => new Set<EditorSectionAnchorId>(signalSectionIds),
    [signalSectionIds],
  );

  useEffect(() => {
    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const usesStickyStudioHeader = window.matchMedia("(min-width: 1280px)").matches;
      const commandBottom = document
        .querySelector<HTMLElement>("[data-editor-command-bar]")
        ?.getBoundingClientRect().bottom;
      const activationLine = usesStickyStudioHeader
        ? (commandBottom ?? 64) + 24
        : 88;
      const sections = LIVING_PAGE_EDITOR_SECTIONS.map(({ id }) =>
        document.getElementById(id),
      ).filter(
        (section): section is HTMLElement =>
          // Skip hidden sections (e.g. the editor column while mobile preview
          // is active) so display:none elements cannot claim the active stop.
          Boolean(section) && (section as HTMLElement).getBoundingClientRect().height > 0,
      );

      const active = sections.reduce<HTMLElement | null>((current, section) => {
        if (section.getBoundingClientRect().top <= activationLine) {
          return section;
        }
        return current;
      }, sections[0] ?? null);

      if (active) {
        setActiveSectionId((current) =>
          active.id === current ? current : (active.id as EditorSectionAnchorId),
        );
      }
    };

    const scheduleMeasure = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const commandBar = document.querySelector<HTMLElement>("[data-editor-command-bar]");
    if (commandBar) resizeObserver.observe(commandBar);
    LIVING_PAGE_EDITOR_SECTIONS.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) resizeObserver.observe(section);
    });

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    measure();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    const activeLink = scrollContainer?.querySelector<HTMLElement>(
      `[data-editor-nav-id="${activeSectionId}"]`,
    );
    if (!scrollContainer || !activeLink) return;

    const nextLeft =
      activeLink.offsetLeft - scrollContainer.clientWidth / 2 + activeLink.clientWidth / 2;
    scrollContainer.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: allowsSmoothScroll ? "smooth" : "auto",
    });
  }, [activeSectionId, allowsSmoothScroll]);

  const activeIndex = Math.max(
    0,
    LIVING_PAGE_EDITOR_SECTIONS.findIndex(({ id }) => id === activeSectionId),
  );
  const activeSection = LIVING_PAGE_EDITOR_SECTIONS[activeIndex];

  return (
    <nav
      aria-label="Editor sections"
      data-editor-section-nav
      className="editor-section-map mt-3 min-w-0 max-w-full overflow-hidden border-t border-site-border pt-3"
    >
      <div className="mb-2 flex items-center justify-between gap-4 px-0.5">
        <p className="site-eyebrow text-site-muted">
          Page map
        </p>
        <p className="min-w-0 truncate text-xs text-site-secondary">
          <span className="font-semibold text-site-action-hover">{activeSection?.label}</span>
          <span aria-hidden="true"> · </span>
          <span className="font-mono tracking-[0.08em] tabular-nums">
            {String(activeIndex + 1).padStart(2, "0")}/
            {String(LIVING_PAGE_EDITOR_SECTIONS.length).padStart(2, "0")}
          </span>
        </p>
      </div>
      <ol
        ref={scrollRef}
        className="scrollbar-hide flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto scroll-auto pb-0.5"
      >
        {LIVING_PAGE_EDITOR_SECTIONS.map((section) => {
          const active = section.id === activeSectionId;
          const hasSignal = signalSections.has(section.id);
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                data-editor-nav-id={section.id}
                aria-current={active ? "step" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setActiveSectionId(section.id);
                  const target = document.getElementById(section.id);
                  const commandBottom = document
                    .querySelector<HTMLElement>("[data-editor-command-bar]")
                    ?.getBoundingClientRect().bottom;
                  const usesStickyStudioHeader = window.matchMedia(
                    "(min-width: 1280px)",
                  ).matches;
                  const viewportOffset = usesStickyStudioHeader
                    ? (commandBottom ?? 64) + 16
                    : 80;
                  if (target) {
                    window.scrollTo({
                      top: Math.max(
                        0,
                        window.scrollY + target.getBoundingClientRect().top - viewportOffset,
                      ),
                      behavior: allowsSmoothScroll ? "smooth" : "auto",
                    });
                  }
                  window.history.replaceState(null, "", `#${section.id}`);
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-none border px-2.5 py-1.5 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-focus sm:min-h-9 ${
                  active
                    ? "-translate-y-0.5 border-site-action bg-site-selected text-site-text"
                    : "border-site-border bg-site-canvas-alt text-site-secondary hover:border-site-border-strong hover:bg-site-surface hover:text-site-text"
                }`}
              >
                {section.label}
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 border ${
                    hasSignal
                      ? "border-site-success bg-site-success"
                      : "border-site-border-strong bg-transparent"
                  }`}
                />
                <span className="sr-only">
                  {hasSignal ? "Content present" : "No content yet"}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
