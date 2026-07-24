"use client";

import { useEffect, useMemo, useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ShareCardDownload from "@/components/ShareCardDownload";
import ThemeCanvas from "@/components/ThemeCanvas";
import { LandingStoryShareCard } from "@/components/marketing/LandingStoryShareCard";
import { SIGNAL_FRAME_SAMPLE } from "@/lib/signal-frame-sample";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";

const QUALITY_LAB_THEMES = THEME_REGISTRY;
const PROTOTYPE_THEME_IDS = [
  "meridian",
  "halo",
  "sakura",
  "aurora",
  "silk",
  "topo",
] as const satisfies readonly ThemeId[];

export function ThemeQualityLab() {
  const [themeId, setThemeId] = useState<ThemeId>("meridian");
  // Paused by default: the lab doubles as the deterministic frame harness for
  // the visual regression suite. `?motion=1` starts a human review session
  // with live motion (and optionally `?theme=<id>`), set after mount so the
  // server-rendered markup stays identical.
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("motion") === "1") setAnimated(true);
    const requestedTheme = params.get("theme");
    if (requestedTheme && QUALITY_LAB_THEMES.some((entry) => entry.id === requestedTheme)) {
      setThemeId(requestedTheme as ThemeId);
    }
  }, []);
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

      <section className="site-panel p-4" aria-labelledby="prototype-themes-title">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p id="prototype-themes-title" className="site-eyebrow">
              Paired prototype
            </p>
            <p className="site-muted mt-1 text-sm">
              Compare the Living Page and its matching share card.
            </p>
          </div>
          <div
            data-theme-prototype-selector
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
          >
            {PROTOTYPE_THEME_IDS.map((prototypeThemeId) => {
              const prototypeTheme = QUALITY_LAB_THEMES.find(
                (candidate) => candidate.id === prototypeThemeId,
              );
              return (
                <button
                  key={prototypeThemeId}
                  type="button"
                  aria-pressed={themeId === prototypeThemeId}
                  onClick={() => setThemeId(prototypeThemeId)}
                  className="site-button site-button-secondary px-3 py-2 text-xs aria-pressed:border-site-action aria-pressed:text-site-action"
                >
                  {prototypeTheme?.name ?? prototypeThemeId}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div
        data-theme-pair-preview
        className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]"
      >
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
            maxFps={60}
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

        <aside className="site-panel-raised p-4 2xl:sticky 2xl:top-4">
          <p className="site-eyebrow">Matching share card</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="site-panel-title">{theme.name}</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-site-muted">
              Same identity
            </span>
          </div>
          <p className="site-muted mt-2 text-sm leading-6">
            The accent, type mood, and signature motif travel with the selected theme.
          </p>
          <div className="mt-4">
            <LandingStoryShareCard
              data={SIGNAL_FRAME_SAMPLE}
              headingLevel="h3"
              themeId={theme.id}
            />
          </div>
          <ShareCardDownload
            analyticsCtaLabel="Return to theme lab"
            analyticsHref="/dev/theme-lab"
            className="mt-3 w-full justify-center"
            isOwner
            pageId="theme-quality-preview"
            resumeData={SIGNAL_FRAME_SAMPLE}
            slug="avery-morgan"
            themeId={theme.id}
          />
          <dl className="mt-4 grid grid-cols-2 border border-site-border">
            <div className="border-r border-site-border p-3">
              <dt className="site-eyebrow">Accent</dt>
              <dd className="mt-2 flex items-center gap-2 font-mono text-[10px] text-site-text">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 border border-site-border"
                  style={{ background: theme.presentation.accent }}
                />
                {theme.presentation.accent}
              </dd>
            </div>
            <div className="p-3">
              <dt className="site-eyebrow">Profile</dt>
              <dd className="mt-2 font-mono text-[10px] uppercase text-site-text">
                {theme.contentProfile.replaceAll("-", " ")}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

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
