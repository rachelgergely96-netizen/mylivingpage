"use client";

import { useEffect, useMemo, useState } from "react";
import { FREE_THEMES } from "@/lib/plans";
import ThemeCanvas from "@/components/ThemeCanvas";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import type {
  ThemeCollectionFilterId,
  ThemeDefinition,
  ThemeId,
} from "@/themes/types";
import {
  THEME_COLLECTION_FILTER_IDS,
  THEME_COLLECTION_IDS,
  THEME_COLLECTION_META,
} from "@/themes/types";

interface ThemePickerProps {
  themes: ThemeDefinition[];
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  premium?: boolean;
  allowedThemeIds?: ThemeId[] | null;
  lockedLabel?: string;
  showDescription?: boolean;
  showFilters?: boolean;
}

export default function ThemePicker({
  themes,
  selectedThemeId,
  onSelectTheme,
  premium = false,
  allowedThemeIds,
  lockedLabel = "Locked",
  showDescription = false,
  showFilters = true,
}: ThemePickerProps) {
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId);
  const selectedThemeCollection = selectedTheme?.collection;
  const [activeCollection, setActiveCollection] = useState<ThemeCollectionFilterId>(() =>
    showFilters ? (selectedThemeCollection ?? "cinematic") : "all",
  );

  useEffect(() => {
    if (!showFilters || !selectedThemeCollection) return;

    setActiveCollection((currentCollection) =>
      currentCollection === "all" || currentCollection === selectedThemeCollection
        ? currentCollection
        : selectedThemeCollection,
    );
  }, [selectedThemeCollection, showFilters]);

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
        themes: themes.filter((theme) => theme.collection === collection),
      }))
      .filter((section) => section.themes.length > 0);
  }, [activeCollection, themes]);

  return (
    <ProfileWindow
      title="Choose a page skin"
      status={
        <span className="profile-status" aria-live="polite">
          {selectedTheme ? `${selectedTheme.name} selected` : "Choose a skin"}
        </span>
      }
      contentClassName="space-y-5 p-3 sm:p-4"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.56fr)] md:items-center">
        <div className="px-1">
          <p className="font-heading text-xl font-semibold text-[#F0F4FF] sm:text-2xl">
            Dress the page to match your personality.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.58)]">
            A page skin changes the atmosphere around your profile without changing the information you entered.
          </p>
        </div>
        {selectedTheme ? (
          <div className="profile-meta-grid overflow-hidden rounded-lg border border-[rgba(125,170,255,0.18)] bg-[rgba(3,10,23,0.35)]">
            <span className="profile-meta-label">Current skin</span>
            <span className="profile-meta-value font-semibold">{selectedTheme.name}</span>
            <span className="profile-meta-label">Mood</span>
            <span className="profile-meta-value">{selectedTheme.vibe}</span>
          </div>
        ) : null}
      </div>

      {showFilters ? (
        <div
          role="group"
          aria-label="Page skin collections"
          className="flex gap-2 overflow-x-auto border-y border-[rgba(125,170,255,0.12)] py-3"
        >
          {THEME_COLLECTION_FILTER_IDS.map((collection) => {
            const active = activeCollection === collection;
            return (
              <button
                key={collection}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveCollection(collection)}
                className={`profile-action shrink-0 px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-all duration-200 ${
                  active
                    ? "border-[rgba(147,197,253,0.66)] bg-[rgba(59,130,246,0.28)] text-[#EFF6FF]"
                    : "border-[rgba(125,170,255,0.18)] bg-[rgba(3,10,23,0.28)] text-[rgba(240,244,255,0.6)]"
                }`}
              >
                {THEME_COLLECTION_META[collection].label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-4">
        {sections.map((section) => (
          <ProfilePanel
            key={section.collection}
            title={section.label}
            meta={`${section.themes.length} ${section.themes.length === 1 ? "skin" : "skins"}`}
            contentClassName="p-3 sm:p-4"
          >
            <h3 className="sr-only">{section.label} page skins</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.themes.map((theme) => {
                const selected = selectedThemeId === theme.id;
                const locked =
                  selectableThemeIds !== null &&
                  !selectableThemeIds.includes(theme.id);

                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={locked}
                    aria-label={`${theme.name} theme${locked ? `, ${lockedLabel.toLowerCase()}` : ""}`}
                    onClick={() => {
                      if (!locked) {
                        onSelectTheme(theme.id);
                      }
                    }}
                    className={`group w-full overflow-hidden rounded-xl border p-2.5 text-left shadow-[4px_4px_0_rgba(2,6,23,0.32)] transition duration-200 ${
                      selected
                        ? "border-[rgba(147,197,253,0.72)] bg-[rgba(59,130,246,0.16)] ring-1 ring-[rgba(147,197,253,0.28)]"
                        : "border-[rgba(125,170,255,0.16)] bg-[rgba(3,10,23,0.32)]"
                    } ${
                      locked
                        ? "cursor-not-allowed opacity-60"
                        : "hover:-translate-y-0.5 hover:border-[rgba(147,197,253,0.46)] hover:bg-[rgba(59,130,246,0.1)]"
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-lg border border-[rgba(226,232,240,0.22)] bg-[#030A17]">
                      <ThemeCanvas themeId={theme.id} height={120} interactive={false} />
                      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                        <span className="rounded bg-[rgba(3,10,23,0.78)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgba(239,246,255,0.66)] backdrop-blur-sm">
                          Page skin
                        </span>
                        {selected && !locked ? (
                          <span className="profile-status rounded bg-[rgba(3,10,23,0.82)] px-2 py-1 backdrop-blur-sm">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      {locked ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.56)]">
                          <span className="rounded-md border border-[rgba(255,255,255,0.2)] bg-[rgba(3,10,23,0.86)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.68)]">
                            {lockedLabel}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="px-1 pb-1 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-heading text-xl leading-none text-[#F0F4FF]">{theme.name}</p>
                        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[rgba(191,219,254,0.42)]">
                          {theme.collection.replaceAll("-", " / ")}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#93C5FD]">{theme.vibe}</p>
                      {showDescription ? (
                        <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.5)]">{theme.description}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </ProfilePanel>
        ))}
      </div>
    </ProfileWindow>
  );
}
