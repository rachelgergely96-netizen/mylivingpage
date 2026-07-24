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
 * costs nothing. The rounded bezel + accent glow reuse the marketing preview
 * language so the dashboard finally shows the product instead of only
 * describing it.
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
        borderRadius: 16,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 20px 44px rgba(0,0,0,0.5), 0 12px 34px -10px ${theme.presentation.accentSoft}`,
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
    </div>
  );
}
