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
        themes: themes.filter((theme) => theme.collection === collection),
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
              className="shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300"
              style={{
                borderColor: active ? "rgba(59,130,246,0.38)" : "rgba(255,255,255,0.12)",
                background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                color: active ? "#93C5FD" : "rgba(240,244,255,0.6)",
              }}
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
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Collection</p>
                <h3 className="mt-1 font-heading text-xl text-[#F0F4FF]">{section.label}</h3>
              </div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">
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
                    onClick={() => {
                      if (!locked) {
                        onSelectTheme(theme.id);
                      }
                    }}
                    className={`glass-card rounded-2xl p-3 text-left transition-all duration-300 ease-soft ${locked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-1"}`}
                    style={{
                      borderColor: selectedThemeId === theme.id ? "rgba(59,130,246,0.38)" : "rgba(255,255,255,0.08)",
                      background: selectedThemeId === theme.id ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="relative">
                      <ThemeCanvas themeId={theme.id} height={120} interactive={false} />
                      {locked ? (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[rgba(0,0,0,0.5)]">
                          <span className="rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.6)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.6)]">
                            {lockedLabel}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 font-heading text-xl">{theme.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#3B82F6]">{theme.vibe}</p>
                    {showDescription ? (
                      <p className="mt-2 text-xs leading-6 text-[rgba(240,244,255,0.45)]">{theme.description}</p>
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
