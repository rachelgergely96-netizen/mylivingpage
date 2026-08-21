import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LivingPageSectionRail, {
  calculateSectionScrollTarget,
} from "@/components/public/LivingPageSectionRail";

describe("LivingPageSectionRail", () => {
  it("renders sharp, labeled chapter controls with the first chapter current", () => {
    const markup = renderToStaticMarkup(
      <LivingPageSectionRail sectionIds={["summary", "stats", "experience"]} />,
    );

    expect(markup).toContain('aria-label="Living Page chapters"');
    expect(markup).toContain('data-motion-signal="career-chapters"');
    expect(markup).not.toContain("data-motion-event=");
    expect(markup).not.toContain("data-motion-sequence=");
    expect(markup).toContain("Intro");
    expect(markup).toContain("Impact");
    expect(markup).toContain("Experience");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("No previous chapter");
    expect(markup).toContain("Next chapter: Impact");
    expect(markup).toContain("rounded-none");
  });

  it("keeps the destination below the sticky rail and clamps at the top", () => {
    expect(
      calculateSectionScrollTarget({
        currentScrollTop: 480,
        rootTop: 100,
        targetTop: 260,
        railHeight: 48,
      }),
    ).toBe(580);
    expect(
      calculateSectionScrollTarget({
        currentScrollTop: 0,
        rootTop: 100,
        targetTop: 110,
        railHeight: 48,
      }),
    ).toBe(0);
  });

  it("stays out of the way when there is only one chapter", () => {
    expect(
      renderToStaticMarkup(
        <LivingPageSectionRail sectionIds={["experience"]} />,
      ),
    ).toBe("");
  });
});
