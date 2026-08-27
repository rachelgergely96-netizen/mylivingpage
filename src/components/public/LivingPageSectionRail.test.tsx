import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LivingPageSectionRail, {
  calculateSectionScrollTarget,
  getChapterMenuFocusIndex,
  resolveChapterMeasurement,
} from "@/components/public/LivingPageSectionRail";

describe("LivingPageSectionRail", () => {
  it("renders one sharp chapter compass with an overlay section index", () => {
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
    expect((markup.match(/aria-current="step"/g) ?? []).length).toBe(1);
    expect(markup).toContain("01 / 03");
    expect(markup).toContain("data-living-section-progress");
    expect(markup).toContain("data-living-section-menu");
    expect(markup).toContain('data-living-section-current="summary"');
    expect(markup).toContain('data-living-section-item="experience"');
    expect(markup).toContain("data-living-section-toggle");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Living Page section index"');
    expect(markup).toContain('hidden=""');
    expect((markup.match(/data-living-section-toggle/g) ?? []).length).toBe(1);
    expect((markup.match(/data-living-section-menu/g) ?? []).length).toBe(1);
    const controlledMenuId = markup.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controlledMenuId).toBeTruthy();
    expect(markup).toContain(`id="${controlledMenuId}"`);
    expect(markup).toContain("No previous chapter");
    expect(markup).toContain("Next chapter: Impact");
    expect(markup).toContain("rounded-none");
  });

  it("resolves arrow, Home, and End movement within the section index", () => {
    expect(getChapterMenuFocusIndex(1, 4, "ArrowDown")).toBe(2);
    expect(getChapterMenuFocusIndex(1, 4, "ArrowRight")).toBe(2);
    expect(getChapterMenuFocusIndex(0, 4, "ArrowUp")).toBe(3);
    expect(getChapterMenuFocusIndex(0, 4, "ArrowLeft")).toBe(3);
    expect(getChapterMenuFocusIndex(2, 4, "Home")).toBe(0);
    expect(getChapterMenuFocusIndex(1, 4, "End")).toBe(3);
    expect(getChapterMenuFocusIndex(1, 4, "Escape")).toBeNull();
    expect(getChapterMenuFocusIndex(0, 0, "ArrowDown")).toBeNull();
  });

  it("seeds restored scroll silently and suppresses intermediate smooth-jump chapters", () => {
    expect(resolveChapterMeasurement("experience", null, false)).toEqual({
      commit: true,
      emitEvent: false,
      settlesPendingNavigation: false,
    });
    expect(resolveChapterMeasurement("stats", "experience", true)).toEqual({
      commit: false,
      emitEvent: false,
      settlesPendingNavigation: false,
    });
    expect(resolveChapterMeasurement("experience", "experience", true)).toEqual({
      commit: true,
      emitEvent: true,
      settlesPendingNavigation: true,
    });
    expect(resolveChapterMeasurement("stats", null, true)).toEqual({
      commit: true,
      emitEvent: true,
      settlesPendingNavigation: false,
    });
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
