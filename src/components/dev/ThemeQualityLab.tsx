"use client";

import { useMemo, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { SIGNAL_FRAME_SAMPLE } from "@/lib/signal-frame-sample";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

const QUALITY_LAB_THEMES = THEME_REGISTRY;

export function ThemeQualityLab() {
  const [themeId, setThemeId] = useState<ThemeId>(QUALITY_LAB_THEMES[0].id);
  const [animated, setAnimated] = useState(false);
  const themeIndex = QUALITY_LAB_THEMES.findIndex((theme) => theme.id === themeId);
  const theme = useMemo(
    () => QUALITY_LAB_THEMES[themeIndex] ?? QUALITY_LAB_THEMES[0],
    [themeIndex],
  );

  const selectRelativeTheme = (offset: number) => {
    const nextIndex =
      (themeIndex + offset + QUALITY_LAB_THEMES.length) % QUALITY_LAB_THEMES.length;
    setThemeId(QUALITY_LAB_THEMES[nextIndex].id);
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
            {QUALITY_LAB_THEMES.map((option) => (
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
          <div data-analytics-scroll-root="true" className="relative h-full overflow-y-auto">
            <ResumeLayout
              data={SIGNAL_FRAME_SAMPLE}
              headingLevel="h1"
              disableExternalLinks
              useExternalScrollRoot
            />
            <div className="absolute right-3 top-3 z-20 flex border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]">
              {["Depth", "Motion", "Focus", "Contrast"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`${label} theme response`}
                  data-motion-item={`${theme.id}-${label.toLowerCase()}`}
                  data-motion-kind="quality-signal"
                  className="resume-theme-link pointer-events-auto min-h-9 border-l border-[var(--theme-border)] px-2 font-mono text-[9px] uppercase tracking-[0.08em] first:border-l-0"
                >
                  0{index + 1}
                </button>
              ))}
            </div>
          </div>
        </ThemeCanvas>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="site-panel p-4">
          <p className="site-eyebrow">Catalog position</p>
          <p className="mt-2 font-mono text-sm text-site-text">
            {String(themeIndex + 1).padStart(2, "0")} / {QUALITY_LAB_THEMES.length}
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
