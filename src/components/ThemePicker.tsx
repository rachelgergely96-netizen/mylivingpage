"use client";

import { useMemo, useState } from "react";
import { FREE_THEMES } from "@/lib/plans";
import ThemeCanvas from "@/components/ThemeCanvas";
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
}

export default function ThemePicker({
  themes,
  selectedThemeId,
  onSelectTheme,
  premium = false,
  allowedThemeIds,
  lockedLabel = "Locked",
  showDescription = false,
}: ThemePickerProps) {
  const [activeCollection, setActiveCollection] = useState<ThemeCollectionFilterId>("all");
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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {THEME_COLLECTION_FILTER_IDS.map((collection) => {
          const active = activeCollection === collection;
          return (
            <button
              key={collection}
              type="button"
              onClick={() => setActiveCollection(collection)}
              aria-pressed={active}
              className={`min-h-11 shrink-0 rounded-none border px-4 py-2 text-xs font-semibold transition-colors duration-200 ${active ? "border-site-action bg-site-selected text-site-text" : "border-site-border bg-site-surface text-site-secondary hover:border-site-border-strong"}`}
            >
              {THEME_COLLECTION_META[collection].label}
            </button>
          );
        })}
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.collection} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="site-eyebrow">Collection</p>
                <h3 className="site-panel-title mt-1">{section.label}</h3>
              </div>
              <p className="text-xs font-medium text-site-muted">
                {section.themes.length} themes
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.themes.map((theme) => {
                const locked =
                  selectableThemeIds !== null &&
                  !selectableThemeIds.includes(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={selectedThemeId === theme.id}
                    aria-disabled={locked}
                    onClick={() => {
                      if (!locked) {
                        onSelectTheme(theme.id);
                      }
                    }}
                    className={`site-panel rounded-none p-3 text-left transition-colors duration-200 ${selectedThemeId === theme.id ? "border-site-action bg-site-selected" : ""} ${locked ? "cursor-not-allowed opacity-60" : "hover:border-site-border-strong hover:bg-site-surface-raised"}`}
                  >
                    <div className="relative">
                      <ThemeCanvas themeId={theme.id} height={120} interactive={false} />
                      {theme.signature ? (
                        <span className="pointer-events-none absolute left-2 top-2 rounded-none border border-site-border-strong bg-site-surface px-2.5 py-1 text-[9px] font-semibold text-site-warning">
                          Signature
                        </span>
                      ) : null}
                      {locked ? (
                        <div className="absolute inset-0 flex items-center justify-center rounded-none bg-black/60">
                          <span className="rounded-none border border-site-border-strong bg-site-canvas px-3 py-1 text-[10px] text-site-secondary">
                            {lockedLabel}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 font-site text-xl font-semibold">{theme.name}</p>
                    <p className="text-xs font-medium text-site-action">{theme.vibe}</p>
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
    </div>
  );
}
