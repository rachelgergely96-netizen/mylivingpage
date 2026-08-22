import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ModeAwareLoadingIndicator from "@/components/motion/ModeAwareLoadingIndicator";
import { MotionPreferenceContext } from "@/components/motion/MotionPreferenceProvider";
import type { MotionMode } from "@/lib/motion";

function renderIndicator(mode: MotionMode) {
  return renderToStaticMarkup(
    <MotionPreferenceContext.Provider
      value={{
        mode,
        preference: mode,
        systemReducedMotion: mode === "still",
        setPreference: vi.fn(),
      }}
    >
      <ModeAwareLoadingIndicator />
    </MotionPreferenceContext.Provider>,
  );
}

describe("ModeAwareLoadingIndicator", () => {
  it("animates only when Full mode permits continuous motion", () => {
    expect(renderIndicator("full")).toContain("animate-spin");
    expect(renderIndicator("calm")).not.toContain("animate-spin");
    expect(renderIndicator("still")).not.toContain("animate-spin");
  });

  it("keeps the same static loading mark and exposes the active mode", () => {
    const calmMarkup = renderIndicator("calm");

    expect(calmMarkup).toContain("data-loading-indicator");
    expect(calmMarkup).toContain('data-motion-mode="calm"');
    expect(calmMarkup).toContain("border-t-site-action");
  });
});
