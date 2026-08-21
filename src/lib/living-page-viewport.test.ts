import { describe, expect, it } from "vitest";
import { calculateLivingPageViewport } from "@/lib/living-page-viewport";

describe("calculateLivingPageViewport", () => {
  it("subtracts the sticky rail from the visible chapter viewport", () => {
    expect(
      calculateLivingPageViewport({
        rootTop: 100,
        rootHeight: 800,
        stickyInset: 52,
      }),
    ).toEqual({
      viewportTop: 152,
      viewportHeight: 748,
    });
  });

  it("keeps malformed or oversized geometry finite and measurable", () => {
    expect(
      calculateLivingPageViewport({
        rootTop: Number.NaN,
        rootHeight: Number.NaN,
        stickyInset: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      viewportTop: 0,
      viewportHeight: 1,
    });

    expect(
      calculateLivingPageViewport({
        rootTop: 20,
        rootHeight: 40,
        stickyInset: 90,
      }),
    ).toEqual({
      viewportTop: 59,
      viewportHeight: 1,
    });
  });
});
