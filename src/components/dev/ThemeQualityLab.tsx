"use client";

import { useMemo, useState } from "react";
import ThemeCanvas from "@/components/ThemeCanvas";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

const CATALOG_THEMES = THEME_REGISTRY.filter((theme) => !theme.signature);

export function ThemeQualityLab() {
  const [themeId, setThemeId] = useState<ThemeId>(CATALOG_THEMES[0].id);
  const [animated, setAnimated] = useState(false);
  const themeIndex = CATALOG_THEMES.findIndex((theme) => theme.id === themeId);
  const theme = useMemo(
    () => CATALOG_THEMES[themeIndex] ?? CATALOG_THEMES[0],
    [themeIndex],
  );

  const selectRelativeTheme = (offset: number) => {
    const nextIndex =
      (themeIndex + offset + CATALOG_THEMES.length) % CATALOG_THEMES.length;
    setThemeId(CATALOG_THEMES[nextIndex].id);
  };

  return (
    <div className="space-y-4">
      <section className="site-panel grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="block min-w-0">
          <span className="site-eyebrow mb-2 block">Catalog theme</span>
          <select
            value={themeId}
            onChange={(event) => setThemeId(event.target.value as ThemeId)}
            className="site-field rounded-none px-3 py-2 text-sm"
          >
            {CATALOG_THEMES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {option.collection}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => selectRelativeTheme(-1)}
            className="site-button site-button-secondary px-3 py-2 text-xs"
          >
            Previous
          </button>
          <button
            type="button"
            aria-pressed={animated}
            onClick={() => setAnimated((current) => !current)}
            className="site-button site-button-secondary px-3 py-2 text-xs"
          >
            {animated ? "Pause motion" : "Enable motion"}
          </button>
          <button
            type="button"
            onClick={() => selectRelativeTheme(1)}
            className="site-button site-button-secondary px-3 py-2 text-xs"
          >
            Next
          </button>
        </div>
      </section>

      <section data-theme-lab-canvas className="site-panel-raised overflow-hidden">
        <ThemeCanvas
          key={theme.id}
          themeId={theme.id}
          height="min(70dvh, 720px)"
          className="min-h-[520px] rounded-none"
          animated={animated}
          interactive
          motionAware
          mobileAmbientMotion
        >
          <div
            data-analytics-scroll-root="true"
            className="resume-theme flex h-full items-end overflow-y-auto p-5 sm:p-8"
          >
            <div className="max-w-lg">
              <p className="resume-theme-accent font-mono text-[10px] uppercase tracking-[0.2em]">
                {theme.collection} · catalog quality lab
              </p>
              <h1 className="resume-theme-name mt-2 text-3xl font-bold sm:text-5xl">
                {theme.name}
              </h1>
              <p className="resume-theme-muted mt-3 max-w-md text-sm leading-6 sm:text-base">
                {theme.description}
              </p>
              <div
                data-motion-section="projects"
                className="mt-5 grid max-w-md grid-cols-2 gap-2 sm:gap-3"
              >
                {["Depth", "Motion", "Focus", "Contrast"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    data-motion-item={`${theme.id}-${label.toLowerCase()}`}
                    data-motion-kind="quality-signal"
                    className="resume-theme-card pointer-events-auto rounded-none border p-3 text-left"
                  >
                    <span className="resume-theme-accent-bright font-mono text-sm">
                      0{index + 1}
                    </span>
                    <span className="resume-theme-muted ml-2 text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ThemeCanvas>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="site-panel p-4">
          <p className="site-eyebrow">Catalog position</p>
          <p className="mt-2 font-mono text-sm text-site-text">
            {String(themeIndex + 1).padStart(2, "0")} / {CATALOG_THEMES.length}
          </p>
        </div>
        <div className="site-panel p-4">
          <p className="site-eyebrow">Accent family</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 w-4 border border-site-border"
              style={{ background: theme.presentation.accent }}
            />
            <span className="font-mono text-xs text-site-text">
              {theme.presentation.accent}
            </span>
          </div>
        </div>
        <div className="site-panel p-4">
          <p className="site-eyebrow">Vibe</p>
          <p className="mt-2 text-sm text-site-text">{theme.vibe}</p>
        </div>
      </div>
    </div>
  );
}
