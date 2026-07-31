"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FREE_THEMES } from "@/lib/plans";
import ThemeCanvas from "@/components/ThemeCanvas";
import type {
  ThemeCollectionFilterId,
  ThemeId,
  ThemeMeta,
} from "@/themes/types";
import {
  THEME_COLLECTION_FILTER_IDS,
  THEME_COLLECTION_IDS,
  THEME_COLLECTION_META,
} from "@/themes/types";

interface ThemePickerProps {
  themes: ThemeMeta[];
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  premium?: boolean;
  allowedThemeIds?: ThemeId[] | null;
  initialCollection?: ThemeCollectionFilterId;
  lockedLabel?: string;
  showDescription?: boolean;
}

interface ThemePickerPreviewProps {
  theme: ThemeMeta;
  selected: boolean;
  requested: boolean;
}

function StaticThemePreview({ theme }: { theme: ThemeMeta }) {
  const { presentation } = theme;

  return (
    <div
      aria-hidden="true"
      data-theme-preview-static={theme.id}
      data-theme-detail={theme.contentProfile}
      data-theme-experience={theme.signatureExperience?.id}
      data-theme-material={theme.materialProfile}
      className="relative overflow-hidden rounded-none"
      style={{
        height: 120,
        backgroundColor: theme.background,
        backgroundImage: [
          `radial-gradient(circle at 10% 0%, ${presentation.accentSoft} 0%, transparent 38%)`,
          `radial-gradient(circle at 90% 100%, ${presentation.accentSoft} 0%, transparent 42%)`,
          `linear-gradient(135deg, ${theme.background} 0%, ${presentation.surfaceStrong} 52%, ${theme.background} 100%)`,
        ].join(", "),
      }}
    >
      <span
        className="theme-preview-motif theme-preview-motif-primary"
        style={{
          borderColor: presentation.accentBorder,
          background: presentation.accentSoft,
          color: presentation.accentBright,
        }}
      />
      <span
        className="theme-preview-motif theme-preview-motif-secondary"
        style={{
          borderColor: presentation.accentBorder,
          background: presentation.accent,
          color: presentation.accentBright,
        }}
      />
    </div>
  );
}

function ThemePickerPreview({ theme, selected, requested }: ThemePickerPreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [rendererRequested, setRendererRequested] = useState(selected || requested);
  const shouldRenderCanvas = selected || requested || rendererRequested;

  useEffect(() => {
    if (selected || requested) {
      setRendererRequested(true);
    }
  }, [requested, selected]);

  useEffect(() => {
    const preview = previewRef.current;
    if (shouldRenderCanvas || !preview || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        setRendererRequested(true);
        observer.disconnect();
      },
      {
        // Fetch roughly two preview rows ahead so scrolling never exposes a
        // placeholder while keeping the rest of the 59 renderers untouched.
        rootMargin: "240px 0px",
        threshold: 0,
      },
    );

    observer.observe(preview);
    return () => observer.disconnect();
  }, [shouldRenderCanvas]);

  return (
    <div
      ref={previewRef}
      data-theme-preview={theme.id}
    >
      {shouldRenderCanvas ? (
        <ThemeCanvas
          themeId={theme.id}
          height={120}
          interactive={false}
          animated={selected}
          className="rounded-none"
        />
      ) : (
        <StaticThemePreview theme={theme} />
      )}
    </div>
  );
}

export default function ThemePicker({
  themes,
  selectedThemeId,
  onSelectTheme,
  premium = false,
  allowedThemeIds,
  initialCollection = "all",
  lockedLabel = "Locked",
  showDescription = false,
}: ThemePickerProps) {
  const [activeCollection, setActiveCollection] = useState<ThemeCollectionFilterId>(
    initialCollection,
  );
  const [requestedThemeIds, setRequestedThemeIds] = useState<ReadonlySet<ThemeId>>(
    () => new Set([selectedThemeId]),
  );
  const [focusedThemeId, setFocusedThemeId] = useState<ThemeId | null>(null);
  const filterScrollerRef = useRef<HTMLDivElement | null>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef(new Map<ThemeId, HTMLButtonElement>());
  const requestThemeRenderer = (themeId: ThemeId) => {
    setRequestedThemeIds((current) => {
      if (current.has(themeId)) {
        return current;
      }
      const next = new Set(current);
      next.add(themeId);
      return next;
    });
  };
  const selectableThemeIds =
    allowedThemeIds === undefined
      ? premium
        ? null
        : FREE_THEMES
      : allowedThemeIds;

  const sections = useMemo(() => {
    const collections = activeCollection === "all" ? THEME_COLLECTION_IDS : [activeCollection];

    return collections
      .map((collection) => ({
        collection,
        label: THEME_COLLECTION_META[collection].label,
        themes: themes
          .filter((theme) => theme.collection === collection)
          .sort((a, b) => Number(Boolean(b.signature)) - Number(Boolean(a.signature))),
      }))
      .filter((section) => section.themes.length > 0);
  }, [activeCollection, themes]);

  const visibleThemes = useMemo(
    () => sections.flatMap((section) => section.themes),
    [sections],
  );
  const visibleThemeIds = useMemo(
    () => visibleThemes.map((theme) => theme.id),
    [visibleThemes],
  );
  const anyVisibleLocked =
    selectableThemeIds !== null &&
    visibleThemes.some((theme) => !selectableThemeIds.includes(theme.id));
  const rovingThemeId =
    focusedThemeId && visibleThemeIds.includes(focusedThemeId)
      ? focusedThemeId
      : visibleThemeIds.includes(selectedThemeId)
        ? selectedThemeId
        : visibleThemeIds[0] ?? null;

  // Keep the initially active filter chip visible inside the horizontal
  // scroller on small screens without scrolling the page itself.
  useEffect(() => {
    const scroller = filterScrollerRef.current;
    const chip = activeChipRef.current;
    if (!scroller || !chip) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    if (chipRect.right > scrollerRect.right || chipRect.left < scrollerRect.left) {
      scroller.scrollLeft += chipRect.left - scrollerRect.left - 16;
    }
    // Mount only: afterwards the user controls the scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    themeId: ThemeId,
  ) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
      return;
    }

    const index = visibleThemeIds.indexOf(themeId);
    if (index === -1) {
      return;
    }

    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextThemeId =
      visibleThemeIds[(index + delta + visibleThemeIds.length) % visibleThemeIds.length];
    cardRefs.current.get(nextThemeId)?.focus();
  };

  return (
    <div className="space-y-6">
      <div ref={filterScrollerRef} className="flex gap-2 overflow-x-auto pb-1">
        {THEME_COLLECTION_FILTER_IDS.map((collection) => {
          const active = activeCollection === collection;
          return (
            <button
              key={collection}
              ref={active ? activeChipRef : undefined}
              type="button"
              onClick={() => setActiveCollection(collection)}
              aria-pressed={active}
              className={`min-h-11 shrink-0 rounded-none border px-4 py-2 text-sm font-semibold transition-colors duration-200 ${active ? "border-site-action bg-site-selected text-site-text" : "border-site-border bg-site-surface text-site-secondary hover:border-site-border-strong"}`}
            >
              {THEME_COLLECTION_META[collection].label}
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Theme" className="space-y-8">
        {sections.map((section) => (
          <section key={section.collection} className="space-y-3">
            {activeCollection === "all" ? (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="site-eyebrow">Collection</p>
                  <h3 className="site-panel-title mt-1">{section.label}</h3>
                </div>
                <p className="text-xs font-medium text-site-muted">
                  {section.themes.length} themes
                </p>
              </div>
            ) : (
              <p className="text-right text-xs font-medium text-site-muted">
                {section.themes.length} themes
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.themes.map((theme) => {
                const locked =
                  selectableThemeIds !== null &&
                  !selectableThemeIds.includes(theme.id);
                const selected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    ref={(node) => {
                      if (node) {
                        cardRefs.current.set(theme.id, node);
                      } else {
                        cardRefs.current.delete(theme.id);
                      }
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={locked || undefined}
                    tabIndex={rovingThemeId === theme.id ? 0 : -1}
                    onKeyDown={(event) => handleCardKeyDown(event, theme.id)}
                    onFocus={() => {
                      setFocusedThemeId(theme.id);
                      requestThemeRenderer(theme.id);
                    }}
                    onPointerEnter={() => requestThemeRenderer(theme.id)}
                    onClick={() => {
                      if (!locked) {
                        onSelectTheme(theme.id);
                      }
                    }}
                    className={`site-panel rounded-none p-3 text-left transition-colors duration-200 ${selected ? "border-site-action bg-site-selected ring-1 ring-site-action" : ""} ${locked ? "cursor-not-allowed opacity-60" : "hover:border-site-border-strong hover:bg-site-surface-raised"}`}
                  >
                    <div className="relative">
                      <ThemePickerPreview
                        theme={theme}
                        selected={selected}
                        requested={requestedThemeIds.has(theme.id)}
                      />
                      {theme.signatureExperience ? (
                        <span className="pointer-events-none absolute left-2 top-2 rounded-none border border-site-border-strong bg-site-surface px-2 py-0.5 text-xs font-semibold text-site-text">
                          {theme.signatureExperience.name}
                        </span>
                      ) : theme.signature ? (
                        <span className="pointer-events-none absolute left-2 top-2 rounded-none border border-site-border-strong bg-site-surface px-2 py-0.5 text-xs font-semibold text-site-text">
                          Signature
                        </span>
                      ) : null}
                      {selected ? (
                        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-none border border-site-action bg-site-surface px-2 py-0.5 text-xs font-semibold text-site-text">
                          <svg
                            aria-hidden="true"
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                          Selected
                        </span>
                      ) : null}
                      {locked ? (
                        <div
                          className="absolute inset-0 flex items-center justify-center rounded-none"
                          style={{
                            background:
                              "color-mix(in srgb, var(--site-canvas) 65%, transparent)",
                          }}
                        >
                          <span className="rounded-none border border-site-border-strong bg-site-canvas px-3 py-1 text-xs text-site-secondary">
                            {lockedLabel}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 font-site text-xl font-semibold">{theme.name}</p>
                    <p className="text-xs font-medium text-site-secondary">{theme.vibe}</p>
                    {theme.signatureExperience ? (
                      <p className="mt-2 text-xs leading-5 text-site-secondary">
                        {theme.signatureExperience.description}
                      </p>
                    ) : null}
                    {showDescription ? (
                      <p className="mt-2 text-xs leading-6 text-site-muted">{theme.description}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {anyVisibleLocked ? (
        <p className="text-xs leading-5 text-site-muted">
          Locked themes unlock with a paid plan.{" "}
          <Link
            href="/pricing"
            className="font-semibold text-site-action hover:text-site-action-hover"
          >
            See pricing
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
