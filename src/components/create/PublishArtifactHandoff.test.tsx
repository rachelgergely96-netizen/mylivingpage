import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PublishArtifactHandoff, {
  PUBLISH_ARTIFACT_FALLBACK_MS,
  getPublishArtifactMotion,
} from "@/components/create/PublishArtifactHandoff";
import { MotionPreferenceContext } from "@/components/motion/MotionPreferenceProvider";
import { MOTION_EVENTS } from "@/lib/motion";
import type { ResumeData } from "@/types/resume";

vi.mock("@/components/ScaledShareCardArtwork", () => ({
  ScaledShareCardArtwork: () => null,
}));

const resumeData: ResumeData = {
  name: "Avery Morgan",
  headline: "Product leader",
  location: "New York, NY",
  email: "avery@example.com",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "I build useful products.",
  experience: [],
  education: [],
  projects: [],
  skills: [{ category: "Product", items: ["Strategy"] }],
  certifications: [],
  stats: [],
  proofs: [],
  testimonials: [],
};

function renderHandoff(confirmed = true) {
  return renderToStaticMarkup(
    <MotionPreferenceContext.Provider
      value={{
        mode: "full",
        preference: "full",
        systemReducedMotion: false,
        setPreference: vi.fn(),
      }}
    >
      <PublishArtifactHandoff
        confirmed={confirmed}
        resumeData={resumeData}
        sequence={3}
        slug="avery-morgan"
        themeId="cosmic"
      />
    </MotionPreferenceContext.Provider>,
  );
}

describe("PublishArtifactHandoff", () => {
  it("encodes full, calm, and still timing without calm travel", () => {
    expect(getPublishArtifactMotion("full")).toMatchObject({
      durationMs: 380,
      opacityOnly: false,
    });
    expect(getPublishArtifactMotion("calm")).toMatchObject({
      durationMs: 160,
      opacityOnly: true,
    });
    expect(getPublishArtifactMotion("calm").durationMs).toBeLessThanOrEqual(180);
    expect(getPublishArtifactMotion("still")).toMatchObject({
      animationName: null,
      durationMs: 0,
      opacityOnly: true,
    });
    expect(PUBLISH_ARTIFACT_FALLBACK_MS).toBe(900);
  });

  it("renders confirmed publish inline without announcing artifact readiness early", () => {
    const markup = renderHandoff();

    expect(markup).toContain("Your page is ready to hand off");
    expect(markup).toContain("Ready to share.");
    expect(markup).toContain("Publish confirmed. Your page is live and the share card is available.");
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain("scale(");
    expect(markup).toContain('data-motion-event="page.publish.confirmed"');
    expect(markup).toContain('data-motion-signal="share-handoff"');
    expect(markup).toContain('data-motion-state="publish-confirmed"');
    expect(markup).toContain('data-motion-sequence="3"');
    expect(markup).toContain('data-motion-target="page"');
    expect(markup).not.toContain('data-motion-event="share.artifact.ready"');
    expect(MOTION_EVENTS.SHARE_ARTIFACT_READY).toBe("share.artifact.ready");
  });

  it("does not invent an artifact before the publish API is confirmed", () => {
    expect(renderHandoff(false)).toBe("");
  });
});
