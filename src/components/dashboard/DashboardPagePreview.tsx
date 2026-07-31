"use client";

import React from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { THEME_MAP } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";

/**
 * A static, device-framed glance at the user's real Living Page — the same
 * theme and content that is (or will be) live. Deliberately NOT animated: the
 * dashboard is a return-to utility, so the theme paints one frame and then
 * costs nothing. The bezel is quiet product chrome (sharp corners, site shadow
 * token); only the pictured page inside carries the theme's own styling. A
 * theme-colored fade at the bottom edge keeps the fixed-height crop from
 * slicing content mid-row.
 */
export default function DashboardPagePreview({
  themeId,
  resumeData,
  height = 232,
}: {
  themeId: string;
  resumeData: ResumeData;
  height?: number;
}) {
  const safeThemeId = (
    THEME_MAP[themeId as ThemeId] ? themeId : "cosmic"
  ) as ThemeId;
  const theme = THEME_MAP[safeThemeId];

  return (
    <div
      data-dashboard-page-preview
      style={{
        border: `1px solid ${theme.presentation.border}`,
        boxShadow: "var(--site-shadow-raised)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <ThemeCanvas
        themeId={safeThemeId}
        height={height}
        animated={false}
        interactive={false}
        className="w-full rounded-none"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none h-full select-none overflow-hidden"
        >
          <ResumeLayout
            data={resumeData}
            compact
            headingLevel="h2"
            disableExternalLinks
          />
        </div>
      </ThemeCanvas>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 48,
          pointerEvents: "none",
          zIndex: 2,
          background: `linear-gradient(180deg, transparent, ${theme.background})`,
        }}
      />
    </div>
  );
}
