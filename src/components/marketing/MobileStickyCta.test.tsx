import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
import { MotionPreferenceContext } from "@/components/motion/MotionPreferenceProvider";
import type { MotionMode } from "@/lib/motion";

function renderCta(mode: MotionMode) {
  return renderToStaticMarkup(
    <MotionPreferenceContext.Provider
      value={{
        mode,
        preference: mode,
        systemReducedMotion: mode === "still",
        setPreference: vi.fn(),
      }}
    >
      <MobileStickyCta href="/signup" label="Start" targetId="hero" />
    </MotionPreferenceContext.Provider>,
  );
}

describe("MobileStickyCta motion modes", () => {
  it("caps Full travel and duration at the marketing tokens", () => {
    const markup = renderCta("full");

    expect(markup).toContain("translateY(32px)");
    expect(markup).toContain("transition-duration:380ms");
    expect(markup).toContain("transition-property:opacity, transform");
  });

  it("keeps Calm opacity-only and Still instant", () => {
    const calmMarkup = renderCta("calm");
    const stillMarkup = renderCta("still");

    expect(calmMarkup).toContain("transition-duration:120ms");
    expect(calmMarkup).toContain("transition-property:opacity");
    expect(calmMarkup).toContain("transform:translateY(0)");
    expect(stillMarkup).toContain("transition-duration:0ms");
    expect(stillMarkup).toContain("transition-property:none");
  });
});
