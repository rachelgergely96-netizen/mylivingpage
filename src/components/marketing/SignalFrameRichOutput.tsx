"use client";

import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { LandingStoryShareCard } from "@/components/marketing/LandingStoryShareCard";
import { SIGNAL_FRAME_SAMPLE } from "@/lib/signal-frame-sample";
import type { ThemeId } from "@/themes/types";
import styles from "./SignalFrameHomepage.module.css";

interface SignalFrameRichOutputProps {
  mode: "page" | "card";
  themeId: ThemeId;
}

export default function SignalFrameRichOutput({ mode, themeId }: SignalFrameRichOutputProps) {
  if (mode === "page") {
    return (
      <div
        className={styles.livingPreview}
        data-living-output
        data-theme-id={themeId}
        data-testid="story-living-output"
      >
        <div className={styles.browserBar}>
          <span className={styles.browserAddress}>mylivingpage.com/examples</span>
          <span className={styles.liveStatus}>Sample</span>
        </div>
        <div className={styles.livingViewport}>
          <ThemeCanvas themeId={themeId} height="100%" className={styles.themeCanvas} interactive={false}>
            <div className={styles.themeContent}>
              <ResumeLayout
                data={SIGNAL_FRAME_SAMPLE}
                compact
                headingLevel="h2"
                disableExternalLinks
              />
            </div>
          </ThemeCanvas>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shareOutput} data-living-output data-theme-id={themeId}>
      <LandingStoryShareCard
        data={SIGNAL_FRAME_SAMPLE}
        headingLevel="h2"
        qrLabel="Scan to browse sample pages"
        sharePath="/examples?ref=homepage_story_share_card"
        themeId={themeId}
      />
      <div className={styles.shareDestinations} aria-hidden="true">
        <span>Email</span>
        <span>Referral</span>
        <span>In person</span>
      </div>
    </div>
  );
}
